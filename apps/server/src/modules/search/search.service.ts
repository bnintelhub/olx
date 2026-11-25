import { FastifyRequest } from 'fastify';
import { performance } from 'perf_hooks';
import { prisma } from '../../config/prisma';
import { AdStatus, Prisma } from '@prisma/client';
import { SearchParams } from './search.schema';
import { getCache, setCache } from '../../config/redis';
import { toPublicMediaUrl } from '../../shared/utils/media-url.util';
import {
  parseSearchQuery,
  buildTokenWhereConditions,
  findFuzzyAdIds,
  sortAdsByRelevance,
} from './search-query.helper';

function formatSearchAdImages(ads: any[]): any[] {
  return ads.map((ad) => ({
    ...ad,
    images: (ad.images || []).map((img: any) => {
      const asset = img.mediaAsset;
      const variants = (asset?.variants as any) || (asset?.variantsJson as any) || {};
      const storageKey = asset?.storageKey || '';
      const rawKey = variants.url || variants.image || storageKey || img.url || img.originalUrl || '';
      const singleUrl = toPublicMediaUrl(rawKey);

      const formattedAsset = asset
        ? {
            ...asset,
            sizeBytes: asset.sizeBytes != null ? Number(asset.sizeBytes) : 0,
          }
        : undefined;

      return {
        ...img,
        mediaAsset: formattedAsset,
        mediaId: img.mediaAssetId || img.mediaId || null,
        url: singleUrl,
        originalUrl: singleUrl,
        displayUrl: singleUrl,
        thumbnailUrl: singleUrl,
      };
    }),
  }));
}

export class SearchService {
  static async search(params: SearchParams, request?: FastifyRequest) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
    const cursor = params.cursor?.trim() || undefined;
    const skip = cursor ? 1 : (page - 1) * limit;

    const { cleanQuery, tokenGroups, inferredMaxPrice, inferredMinPrice } = parseSearchQuery(params.q);
    const effectiveSort = params.sort || (cleanQuery ? 'relevance' : 'newest');

    // Cache key for search feeds to absorb traffic spikes and protect database
    const cacheKey = `search:feed:${JSON.stringify({
      cur: cursor || '',
      p: cursor ? 0 : page,
      l: limit,
      q: params.q?.trim() || '',
      c: params.categoryId || params.categorySlug || '',
      loc: params.locationId || params.citySlug || '',
      lat: params.latitude,
      lng: params.longitude,
      r: params.radiusKm,
      s: effectiveSort,
      min: params.minPrice ?? inferredMinPrice,
      max: params.maxPrice ?? inferredMaxPrice,
      attrs: params.attributes || {},
    })}`;

    const tRedisStart = performance.now();
    const cachedResult = await getCache<any>(cacheKey);
    request?.trackTiming?.('redis', performance.now() - tRedisStart);

    if (cachedResult) {
      return cachedResult;
    }

    const tDbStart = performance.now();

    const baseWhere: Prisma.AdWhereInput = {
      status: AdStatus.ACTIVE,
      deletedAt: null,
      expiresAt: { gt: new Date() },
    };

    const andConditions: Prisma.AdWhereInput[] = [];
    if (tokenGroups.length > 0) {
      andConditions.push(...buildTokenWhereConditions(tokenGroups));
    }

    if (params.categoryId || params.categorySlug) {
      const catWhere = params.categoryId
        ? { id: params.categoryId }
        : { slug: params.categorySlug };

      const category = await prisma.category.findFirst({
        where: catWhere,
        include: { children: { select: { id: true } } },
      });

      if (category) {
        const catIds = [category.id, ...category.children.map((c) => c.id)];
        baseWhere.categoryId = { in: catIds };
      }
    }

    // Hierarchical location search & radius proximity search
    if (params.locationId || params.citySlug || (params.latitude && params.longitude)) {
      const locTarget = params.locationId
        ? { id: params.locationId }
        : params.citySlug
        ? { slug: params.citySlug }
        : null;

      let targetLoc: any = null;
      if (locTarget) {
        targetLoc = await prisma.location.findFirst({
          where: locTarget,
          select: { id: true, path: true, latitude: true, longitude: true },
        });
      }

      const centerLat = params.latitude ? Number(params.latitude) : targetLoc?.latitude;
      const centerLng = params.longitude ? Number(params.longitude) : targetLoc?.longitude;

      if (params.radiusKm && centerLat !== undefined && centerLng !== undefined) {
        // Radius/nearby mode: Calculate bounding box & fetch matching locations
        const radius = Number(params.radiusKm);
        const latDelta = radius / 111; // ~111km per degree latitude
        const lngDelta = radius / (111 * Math.cos((centerLat * Math.PI) / 180));

        const candidateLocations = await prisma.location.findMany({
          where: {
            isActive: true,
            latitude: { gte: centerLat - latDelta, lte: centerLat + latDelta },
            longitude: { gte: centerLng - lngDelta, lte: centerLng + lngDelta },
          },
          select: { id: true, latitude: true, longitude: true },
        });

        // Refine with exact Haversine distance
        const matchingIds: string[] = [];
        for (const loc of candidateLocations) {
          if (loc.latitude && loc.longitude) {
            const dLat = ((loc.latitude - centerLat) * Math.PI) / 180;
            const dLon = ((loc.longitude - centerLng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((centerLat * Math.PI) / 180) *
                Math.cos((loc.latitude * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (dist <= radius) matchingIds.push(loc.id);
          }
        }

        if (targetLoc && !matchingIds.includes(targetLoc.id)) {
          matchingIds.push(targetLoc.id);
        }

        baseWhere.locationId = { in: matchingIds.length > 0 ? matchingIds : ['none'] };
      } else if (targetLoc) {
        // Materialized path hierarchical search: include target location + all its descendants
        const subtreeLocations = await prisma.location.findMany({
          where: {
            OR: [
              { id: targetLoc.id },
              { path: { startsWith: `${targetLoc.path}/` } },
            ],
          },
          select: { id: true },
        });

        const locIds = subtreeLocations.map((l) => l.id);
        baseWhere.locationId = { in: locIds.length > 0 ? locIds : [targetLoc.id] };
      }
    }

    const effectiveMinPrice = params.minPrice !== undefined ? Number(params.minPrice) : inferredMinPrice;
    const effectiveMaxPrice = params.maxPrice !== undefined ? Number(params.maxPrice) : inferredMaxPrice;

    if (effectiveMinPrice !== undefined || effectiveMaxPrice !== undefined) {
      baseWhere.price = {};
      if (effectiveMinPrice !== undefined && !isNaN(effectiveMinPrice)) {
        baseWhere.price.gte = effectiveMinPrice;
      }
      if (effectiveMaxPrice !== undefined && !isNaN(effectiveMaxPrice)) {
        baseWhere.price.lte = effectiveMaxPrice;
      }
    }

    if (params.attributes && Object.keys(params.attributes).length > 0) {
      for (const [key, value] of Object.entries(params.attributes)) {
        if (value !== undefined && value !== null && value !== '') {
          const strVal = String(value).trim();
          andConditions.push({
            OR: [
              {
                attributeValues: {
                  some: {
                    attribute: { key: { equals: key, mode: 'insensitive' } },
                    value: { contains: strVal, mode: 'insensitive' },
                  },
                },
              },
              { title: { contains: strVal, mode: 'insensitive' } },
              { description: { contains: strVal, mode: 'insensitive' } },
            ],
          });
        }
      }
    }

    const where: Prisma.AdWhereInput = {
      ...baseWhere,
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };

    let orderBy: Prisma.AdOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];
    switch (effectiveSort) {
      case 'price_asc':
        orderBy = [{ price: 'asc' }, { id: 'asc' }];
        break;
      case 'price_desc':
        orderBy = [{ price: 'desc' }, { id: 'desc' }];
        break;
      case 'popular':
        orderBy = [{ viewCount: 'desc' }, { id: 'desc' }];
        break;
      case 'relevance':
        orderBy = [{ viewCount: 'desc' }, { id: 'desc' }];
        break;
      case 'newest':
      default:
        orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];
        break;
    }

    const adSelect = {
      id: true,
      title: true,
      description: true,
      slug: true,
      price: true,
      isNegotiable: true,
      status: true,
      viewCount: true,
      favouriteCount: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      expiresAt: true,
      categoryId: true,
      locationId: true,
      category: { select: { id: true, name: true, slug: true, parentId: true } },
      location: { select: { id: true, name: true, slug: true, type: true } },
      attributeValues: { select: { value: true } },
      images: {
        select: {
          id: true,
          sortOrder: true,
          isCover: true,
          mediaAssetId: true,
          mediaAsset: {
            select: { id: true, variants: true, storageKey: true, sizeBytes: true },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
        take: 2,
      },
      user: {
        select: {
          id: true,
          role: true,
          profile: {
            select: {
              name: true,
              businessName: true,
              avatarUrl: true,
              ratingAverage: true,
              isIdentityVerified: true,
            },
          },
        },
      },
    };

    // Optimize COUNT(*): Cache count in Redis for 120s using deterministic query params
    const countCacheKey = `search:count:${JSON.stringify({
      q: params.q?.trim() || '',
      c: params.categoryId || params.categorySlug || '',
      loc: params.locationId || params.citySlug || '',
      min: effectiveMinPrice,
      max: effectiveMaxPrice,
      attrs: params.attributes || {},
    })}`;
    const cachedCount = await getCache<number>(countCacheKey);

    const countPromise = cachedCount !== null && cachedCount !== undefined
      ? Promise.resolve(cachedCount)
      : prisma.ad.count({ where }).then((cnt) => {
          void setCache(countCacheKey, cnt, 120);
          return cnt;
        });

    const isRelevanceQuery = effectiveSort === 'relevance' && Boolean(cleanQuery);

    let [total, ads] = await Promise.all([
      countPromise,
      prisma.ad.findMany({
        where,
        orderBy,
        ...(isRelevanceQuery
          ? { skip: 0, take: 150 }
          : cursor
          ? { cursor: { id: cursor }, skip: 1, take: limit + 1 }
          : { skip, take: limit + 1 }),
        select: adSelect,
      }),
    ]);

    // Typo-tolerant pg_trgm fallback if exact token search yielded 0 results
    let activeWhere = where;
    let hasMore = false;
    let nextCursor: string | null = null;

    const sliceByCursor = (ordered: any[]) => {
      const startIdx = cursor ? ordered.findIndex((a) => a.id === cursor) + 1 : skip;
      const sliced = ordered.slice(startIdx, startIdx + limit);
      const more = startIdx + limit < ordered.length;
      return { sliced, more, cursorId: more && sliced.length > 0 ? sliced[sliced.length - 1].id : null };
    };

    if (total === 0 && cleanQuery.length >= 2) {
      const fuzzyIds = await findFuzzyAdIds(cleanQuery, 100);
      if (fuzzyIds.length > 0) {
        const fuzzyWhere: Prisma.AdWhereInput = {
          ...baseWhere,
          id: { in: fuzzyIds },
        };
        activeWhere = fuzzyWhere;
        const fuzzyAds = await prisma.ad.findMany({
          where: fuzzyWhere,
          select: adSelect,
        });
        const orderMap = new Map(fuzzyIds.map((id, idx) => [id, idx]));
        fuzzyAds.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
        total = fuzzyAds.length;
        const paged = sliceByCursor(fuzzyAds);
        ads = paged.sliced;
        hasMore = paged.more;
        nextCursor = paged.cursorId;
      }
    } else if (isRelevanceQuery && ads.length > 0) {
      const sorted = sortAdsByRelevance(ads, cleanQuery, tokenGroups);
      const paged = sliceByCursor(sorted);
      ads = paged.sliced;
      hasMore = paged.more;
      nextCursor = paged.cursorId;
    } else {
      hasMore = ads.length > limit;
      if (hasMore) {
        ads = ads.slice(0, limit);
      }
      nextCursor = hasMore && ads.length > 0 ? ads[ads.length - 1].id : null;
    }

    request?.trackTiming?.('db', performance.now() - tDbStart);

    const facets = await this.computeFacets(activeWhere, countCacheKey);

    const formattedAds = formatSearchAdImages(ads);

    const result = {
      ads: formattedAds,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore,
        nextCursor,
      },
      facets,
    };

    // Cache feed in Redis for 60 seconds to absorb traffic spikes and protect database
    void setCache(cacheKey, result, 60);

    return result;
  }

  private static async computeFacets(baseWhere: Prisma.AdWhereInput, cacheSuffix = 'all') {
    try {
      // 1. Check Redis for cached facets using full search context key
      const facetCacheKey = `facets:categories:${cacheSuffix}`;
      const cached = await getCache<any>(facetCacheKey);
      if (cached) return cached;

      const categoryCounts = await prisma.ad.groupBy({
        by: ['categoryId'],
        where: baseWhere,
        _count: { _all: true },
        orderBy: { _count: { categoryId: 'desc' } },
        take: 15,
      });

      const categories = await prisma.category.findMany({
        where: { id: { in: categoryCounts.map((c) => c.categoryId) } },
        select: { id: true, name: true, slug: true },
      });

      const facets = {
        categories: categoryCounts.map((c) => {
          const cat = categories.find((item) => item.id === c.categoryId);
          return {
            id: c.categoryId,
            name: cat ? cat.name : 'Unknown',
            slug: cat ? cat.slug : '',
            count: c._count._all,
          };
        }),
      };

      // Cache facets for 2 minutes
      void setCache(facetCacheKey, facets, 120);

      return facets;
    } catch {
      return { categories: [] };
    }
  }

  static async getSuggestions(query: string, citySlug?: string, limit = 8) {
    if (!query || !query.trim()) {
      const defaultCategories = await prisma.category.findMany({
        where: { isActive: true, parentId: null },
        take: 6,
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, slug: true },
      });
      return defaultCategories.map((cat) => ({
        id: `cat-${cat.id}`,
        title: cat.name,
        categorySubtitle: cat.name.toUpperCase(),
        categorySlug: cat.slug,
        imageUrl: null,
        type: 'CATEGORY' as const,
      }));
    }

    const q = query.trim();

    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parent: { select: { name: true } },
      },
      take: 4,
    });

    let locationIds: string[] | undefined = undefined;
    if (citySlug) {
      const loc = await prisma.location.findFirst({
        where: { slug: citySlug },
        include: { children: { select: { id: true } } },
      });
      if (loc) {
        locationIds = [loc.id, ...loc.children.map((c) => c.id)];
      }
    }

    const { tokenGroups } = parseSearchQuery(q);
    const adMatchConditions = tokenGroups.length > 0
      ? buildTokenWhereConditions(tokenGroups)
      : [{ title: { contains: q, mode: 'insensitive' as const } }];

    const titleAds = await prisma.ad.findMany({
      where: {
        status: AdStatus.ACTIVE,
        deletedAt: null,
        expiresAt: { gt: new Date() },
        AND: adMatchConditions,
        ...(locationIds ? { locationId: { in: locationIds } } : {}),
      },
      select: {
        id: true,
        title: true,
        price: true,
        images: {
          take: 3,
          include: {
            mediaAsset: true,
          },
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: { select: { name: true } },
          },
        },
      },
      take: limit,
      orderBy: { viewCount: 'desc' },
    });

    const suggestions: Array<{
      id: string;
      title: string;
      categorySubtitle?: string;
      categorySlug?: string;
      adId?: string;
      imageUrl?: string | null;
      price?: number;
      type: 'CATEGORY' | 'PRODUCT';
    }> = [];

    for (const cat of categories) {
      suggestions.push({
        id: `cat-${cat.id}`,
        title: cat.name,
        categorySubtitle: (cat.parent?.name || cat.name).toUpperCase(),
        categorySlug: cat.slug,
        imageUrl: null,
        type: 'CATEGORY',
      });
    }

    const seenTitles = new Set<string>();
    for (const ad of titleAds) {
      const cleanTitle = ad.title.trim();
      const lower = cleanTitle.toLowerCase();
      if (!seenTitles.has(lower)) {
        seenTitles.add(lower);
        const catName = ad.category?.parent?.name || ad.category?.name || 'ALL CATEGORIES';

        let imageUrl: string | null = null;
        for (const img of ad.images || []) {
          const asset = img.mediaAsset as any;
          const variants = (asset?.variants as any) || (asset?.variantsJson as any) || {};
          const storageKey = asset?.storageKey || '';
          const rawKey =
            variants.thumbnail ||
            variants.card ||
            variants.url ||
            variants.image ||
            storageKey ||
            (img as any).url ||
            (img as any).originalUrl ||
            '';
          if (rawKey) {
            imageUrl = toPublicMediaUrl(rawKey);
            break;
          }
        }

        suggestions.push({
          id: `ad-${ad.id}`,
          title: cleanTitle,
          categorySubtitle: catName.toUpperCase(),
          categorySlug: ad.category?.slug,
          adId: ad.id,
          imageUrl,
          price: Number(ad.price),
          type: 'PRODUCT',
        });
      }
      if (suggestions.length >= limit) break;
    }

    return suggestions.slice(0, limit);
  }

  static async getSimilar(adId: string, limit = 6) {
    const currentAd = await prisma.ad.findUnique({
      where: { id: adId },
      select: { categoryId: true, locationId: true },
    });

    if (!currentAd) return [];

    const related = await prisma.ad.findMany({
      where: {
        id: { not: adId },
        categoryId: currentAd.categoryId,
        status: AdStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true } },
        images: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });

    return formatSearchAdImages(related);
  }
}
