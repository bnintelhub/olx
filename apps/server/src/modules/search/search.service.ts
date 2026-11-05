import { prisma } from '../../config/prisma';
import { AdStatus, Prisma } from '@prisma/client';
import { SearchParams } from './search.schema';
import { getCache, setCache } from '../../config/redis';

export class SearchService {
  static async search(params: SearchParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

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

    if (params.locationId || params.citySlug) {
      const locWhere = params.locationId
        ? { id: params.locationId }
        : { slug: params.citySlug };

      const location = await prisma.location.findFirst({
        where: locWhere,
        include: { children: { select: { id: true } } },
      });

      if (location) {
        const locIds = [location.id, ...location.children.map((l) => l.id)];
        where.locationId = { in: locIds };
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
          conditions.push({
            attributeValues: {
              some: {
                attribute: { key },
                value: String(value),
              },
            },
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

    return {
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
