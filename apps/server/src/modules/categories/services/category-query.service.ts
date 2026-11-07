import { prisma } from '../../../config/prisma';
import { Prisma } from '@prisma/client';
import { getCache, setCache } from '../../../config/redis';
import { AppError } from '../../../shared/errors/app-error';
import { formatCategoryImage } from './category-utils';

export class CategoryQueryService {
  // Returns flat list of root categories with active subcategories for public navigation
  static async getAll(options?: { includeInactive?: boolean }) {
    const includeInactive = options?.includeInactive ?? false;
    const cacheKey = includeInactive ? 'categories:all:admin' : 'categories:all:public';

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const where: Prisma.CategoryWhereInput = { parentId: null };
    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        imageMedia: { select: { id: true, variants: true, diskPath: true } },
        children: {
          where: includeInactive ? undefined : { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            imageMedia: { select: { id: true, variants: true, diskPath: true } },
          },
        },
        attributes: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const formatted = categories.map((cat) => ({
      ...cat,
      image: formatCategoryImage(cat),
      children: cat.children.map((sub) => ({
        ...sub,
        image: formatCategoryImage(sub),
      })),
    }));

    await setCache(cacheKey, formatted, 600);
    return formatted;
  }

  // Builds an arbitrarily deep hierarchical tree filtered by active status
  static async getTree(options?: { includeInactive?: boolean }) {
    const includeInactive = options?.includeInactive ?? false;
    const cacheKey = includeInactive ? 'categories:tree:admin' : 'categories:tree:public';

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // Fetch all categories in one query to construct tree in-memory (O(N) vs nested recursive SQL)
    const allCategories = await prisma.category.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        imageMedia: { select: { id: true, variants: true, diskPath: true } },
        attributes: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { ads: { where: { deletedAt: null } } } },
      },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Map each category to include unified image and empty children array
    const categoryMap = new Map<string, any>();
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        parentId: cat.parentId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sortOrder: cat.sortOrder,
        level: cat.level,
        isActive: cat.isActive,
        imageMediaId: cat.imageMediaId,
        image: formatCategoryImage(cat),
        adsCount: cat._count.ads,
        attributes: cat.attributes,
        children: [],
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      });
    });

    // Assemble hierarchical tree
    const rootCategories: any[] = [];
    categoryMap.forEach((node) => {
      if (!node.parentId) {
        rootCategories.push(node);
      } else {
        const parent = categoryMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        } else if (includeInactive) {
          rootCategories.push(node);
        }
      }
    });

    await setCache(cacheKey, rootCategories, 600);
    return rootCategories;
  }

  // Retrieves category by slug including parent lineage (breadcrumbs) and child subcategories
  static async getBySlug(slug: string, options?: { parentId?: string; includeInactive?: boolean }) {
    const where: Prisma.CategoryWhereInput = { slug };
    if (options?.parentId !== undefined) {
      where.parentId = options.parentId;
    }
    if (!options?.includeInactive) {
      where.isActive = true;
    }

    const category = await prisma.category.findFirst({
      where,
      include: {
        imageMedia: { select: { id: true, variants: true, diskPath: true } },
        parent: {
          include: {
            parent: true,
            imageMedia: { select: { id: true, variants: true, diskPath: true } },
          },
        },
        children: {
          where: options?.includeInactive ? undefined : { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            imageMedia: { select: { id: true, variants: true, diskPath: true } },
          },
        },
        attributes: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', `Category with slug "${slug}" not found`);
    }

    // Build breadcrumb lineage
    const breadcrumbs: Array<{ id: string; name: string; slug: string; level: number }> = [];
    let currentAncestor: any = category.parent;
    while (currentAncestor) {
      breadcrumbs.unshift({
        id: currentAncestor.id,
        name: currentAncestor.name,
        slug: currentAncestor.slug,
        level: currentAncestor.level,
      });
      currentAncestor = currentAncestor.parent;
    }

    return {
      ...category,
      image: formatCategoryImage(category),
      breadcrumbs,
      children: category.children.map((child) => ({
        ...child,
        image: formatCategoryImage(child),
      })),
    };
  }
}

