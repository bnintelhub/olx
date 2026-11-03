import { prisma } from '../prisma';
import { AdStatus, Prisma } from '@prisma/client';

export interface SearchFilters {
  q?: string;
  categoryId?: string;
  categorySlug?: string;
  locationId?: string;
  citySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  page?: number;
  limit?: number;
  attributes?: Record<string, string | number | boolean>;
}

export class SearchService {
  /**
   * Search and filter ads with dynamic facets
   */
  static async search(filters: SearchFilters) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AdWhereInput = {
      status: AdStatus.ACTIVE,
      expiresAt: { gt: new Date() },
    };

    // 1. Text keyword search
    if (filters.q && filters.q.trim()) {
      const keyword = filters.q.trim();
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    // 2. Category resolution (including children subcategories)
    if (filters.categoryId || filters.categorySlug) {
      const catWhere = filters.categoryId
        ? { id: filters.categoryId }
        : { slug: filters.categorySlug };

      const category = await prisma.category.findFirst({
        where: catWhere,
        include: { children: { select: { id: true } } },
      });

      if (category) {
        const catIds = [category.id, ...category.children.map((c) => c.id)];
        where.categoryId = { in: catIds };
      }
    }

    // 3. Location resolution (including child localities)
    if (filters.locationId || filters.citySlug) {
      const locWhere = filters.locationId
        ? { id: filters.locationId }
        : { slug: filters.citySlug };

      const location = await prisma.location.findFirst({
        where: locWhere,
        include: { children: { select: { id: true } } },
      });

      if (location) {
        const locIds = [location.id, ...location.children.map((l) => l.id)];
        where.locationId = { in: locIds };
      }
    }

    // 4. Price range
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined && !isNaN(Number(filters.minPrice))) {
        where.price.gte = Number(filters.minPrice);
      }
      if (filters.maxPrice !== undefined && !isNaN(Number(filters.maxPrice))) {
        where.price.lte = Number(filters.maxPrice);
      }
    }

    // 5. Dynamic attribute filters
    if (filters.attributes && Object.keys(filters.attributes).length > 0) {
      const attributeConditions: Prisma.AdWhereInput[] = [];

      for (const [key, value] of Object.entries(filters.attributes)) {
        if (value !== undefined && value !== null && value !== '') {
          attributeConditions.push({
            attributeValues: {
              some: {
                attribute: { key },
                value: String(value),
              },
            },
          });
        }
      }

      if (attributeConditions.length > 0) {
        where.AND = attributeConditions;
      }
    }

    // 6. Sorting
    let orderBy: Prisma.AdOrderByWithRelationInput = { createdAt: 'desc' };
    switch (filters.sort) {
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

    // Execute queries
    const [total, ads] = await Promise.all([
      prisma.ad.count({ where }),
      prisma.ad.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true, parentId: true },
          },
          location: {
            select: { id: true, name: true, slug: true, type: true },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 4,
          },
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

    // Compute basic dynamic facets
    const facets = await SearchService.computeFacets(where);

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

  /**
   * Compute category counts and price distribution
   */
  private static async computeFacets(baseWhere: Prisma.AdWhereInput) {
    try {
      const categoryCounts = await prisma.ad.groupBy({
        by: ['categoryId'],
        where: baseWhere,
        _count: { _all: true },
        orderBy: {
          _count: {
            categoryId: 'desc',
          },
        },
        take: 15,
      });

      const categories = await prisma.category.findMany({
        where: { id: { in: categoryCounts.map((c) => c.categoryId) } },
        select: { id: true, name: true, slug: true },
      });

      const categoryFacets = categoryCounts.map((c) => {
        const cat = categories.find((cat) => cat.id === c.categoryId);
        return {
          id: c.categoryId,
          name: cat ? cat.name : 'Unknown',
          slug: cat ? cat.slug : '',
          count: c._count._all,
        };
      });

      return {
        categories: categoryFacets,
      };
    } catch {
      return { categories: [] };
    }
  }

  /**
   * Find similar / related ads for an ad detail view
   */
  static async getSimilarAds(adId: string, limit = 6) {
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

  /**
   * Fast autocomplete suggestions for search bar (matching categories and products)
   */
  static async getSuggestions(query: string, citySlug?: string, limit = 8) {
    if (!query || !query.trim()) {
      // Return top active categories as default suggestions if query is empty
      const defaultCategories = await prisma.category.findMany({
        where: { isActive: true, parentId: null },
        take: 6,
        orderBy: { displayOrder: 'asc' },
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

    const q = query.trim().toLowerCase();

    // 1. Find matching categories
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
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

    // 2. Resolve city/location if provided
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

    // 3. Find matching ads (active, not expired)
    // Priority: title contains query so that matching text is highlighted in autocomplete
    const titleAds = await prisma.ad.findMany({
      where: {
        status: AdStatus.ACTIVE,
        expiresAt: { gt: new Date() },
        title: { contains: q },
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

    const ads = [...titleAds];

    const suggestions: Array<{
      id: string;
      title: string;
      categorySubtitle?: string;
      categorySlug?: string;
      adId?: string;
      type: 'CATEGORY' | 'PRODUCT';
    }> = [];

    // Add category matches
    for (const cat of categories) {
      suggestions.push({
        id: `cat-${cat.id}`,
        title: cat.name,
        categorySubtitle: (cat.parent?.name || cat.name).toUpperCase(),
        categorySlug: cat.slug,
        type: 'CATEGORY',
      });
    }

    // Add ad titles (deduplicate similar titles)
    const seenTitles = new Set<string>();
    for (const ad of ads) {
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
}
