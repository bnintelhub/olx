import { prisma } from '../../config/prisma';
import { AdStatus, Prisma } from '@prisma/client';
import { SearchParams } from './search.schema';
import { getCache, setCache } from '../../config/redis';

export class SearchService {
  static async search(params: SearchParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    // Cache key for search feeds to absorb traffic spikes and protect database
    const cacheKey = `search:feed:${JSON.stringify({
      p: page,
      l: limit,
      q: params.q?.trim() || '',
      c: params.categoryId || params.categorySlug || '',
      loc: params.locationId || params.citySlug || '',
      s: params.sort || 'newest',
      min: params.minPrice,
      max: params.maxPrice,
      attrs: params.attributes || {},
    })}`;

    const cachedResult = await getCache<any>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const where: Prisma.AdWhereInput = {
      status: AdStatus.ACTIVE,
      expiresAt: { gt: new Date() },
    };

    if (params.q && params.q.trim()) {
      const keyword = params.q.trim();
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
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
        where.categoryId = { in: catIds };
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

        where.locationId = { in: matchingIds.length > 0 ? matchingIds : ['none'] };
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
        where.locationId = { in: locIds.length > 0 ? locIds : [targetLoc.id] };
      }
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined && !isNaN(Number(params.minPrice))) {
        where.price.gte = Number(params.minPrice);
      }
      if (params.maxPrice !== undefined && !isNaN(Number(params.maxPrice))) {
        where.price.lte = Number(params.maxPrice);
      }
    }

    if (params.attributes && Object.keys(params.attributes).length > 0) {
      const conditions: Prisma.AdWhereInput[] = [];
      for (const [key, value] of Object.entries(params.attributes)) {
        if (value !== undefined && value !== null && value !== '') {
          const strVal = String(value).trim();
          conditions.push({
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
      if (conditions.length > 0) {
        where.AND = conditions;
      }
    }

    let orderBy: Prisma.AdOrderByWithRelationInput = { createdAt: 'desc' };
    switch (params.sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [total, ads] = await Promise.all([
      prisma.ad.count({ where }),
      prisma.ad.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true, parentId: true } },
          location: { select: { id: true, name: true, slug: true, type: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 4 },
          user: {
            select: {
              id: true,
              role: true,
              createdAt: true,
              profile: {
                select: {
                  name: true,
                  avatarUrl: true,
                  ratingAverage: true,
                  isIdentityVerified: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const facets = await this.computeFacets(where);

    const result = {
      ads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      facets,
    };

    // Cache feed in Redis for 20 seconds to prevent DB saturation during load spikes
    void setCache(cacheKey, result, 20);

    return result;
  }

  private static async computeFacets(baseWhere: Prisma.AdWhereInput) {
    try {
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

      return {
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

    const titleAds = await prisma.ad.findMany({
      where: {
        status: AdStatus.ACTIVE,
        expiresAt: { gt: new Date() },
        title: { contains: q, mode: 'insensitive' },
        ...(locationIds ? { locationId: { in: locationIds } } : {}),
      },
      select: {
        id: true,
        title: true,
        price: true,
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
      type: 'CATEGORY' | 'PRODUCT';
    }> = [];

    for (const cat of categories) {
      suggestions.push({
        id: `cat-${cat.id}`,
        title: cat.name,
        categorySubtitle: (cat.parent?.name || cat.name).toUpperCase(),
        categorySlug: cat.slug,
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
        suggestions.push({
          id: `ad-${ad.id}`,
          title: cleanTitle,
          categorySubtitle: catName.toUpperCase(),
          categorySlug: ad.category?.slug,
          adId: ad.id,
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

    return prisma.ad.findMany({
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
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });
  }
}
