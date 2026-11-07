import { prisma } from '../../../config/prisma';
import { AppError } from '../../../shared/errors/app-error';
import { delCache } from '../../../config/redis';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  ReorderCategoriesInput,
} from '../categories.schema';
import {
  MAX_CATEGORY_DEPTH,
  slugify,
  formatCategoryImage,
  validateMediaImage,
  checkCircularDependency,
  getSubtreeMaxDepth,
  updateSubtreeLevels,
} from './category-utils';

export class CategoryMutationService {
  // Creates a category enforcing depth limits, slug uniqueness per parent, and media attachment
  static async create(input: CreateCategoryInput) {
    const normalizedSlug = slugify(input.slug || input.name);
    if (!normalizedSlug) {
      throw new AppError(400, 'INVALID_SLUG', 'Category slug cannot be empty');
    }

    let calculatedLevel = 0;
    const parentId = input.parentId || null;

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new AppError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Specified parent category does not exist');
      }
      if (!parent.isActive) {
        throw new AppError(400, 'INACTIVE_PARENT_CATEGORY', 'Cannot add child category to an inactive parent');
      }

      calculatedLevel = parent.level + 1;
      if (calculatedLevel >= MAX_CATEGORY_DEPTH) {
        throw new AppError(
          400,
          'MAX_DEPTH_EXCEEDED',
          `Category hierarchy cannot exceed maximum depth of ${MAX_CATEGORY_DEPTH} levels`
        );
      }
    }

    // Check slug uniqueness among siblings under the same parent
    const existing = await prisma.category.findFirst({
      where: { parentId, slug: normalizedSlug },
    });
    if (existing) {
      throw new AppError(
        400,
        'SLUG_EXISTS',
        `A category with slug "${normalizedSlug}" already exists under this parent`
      );
    }

    let sortOrder = input.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const highestSort = await prisma.category.findFirst({
        where: { parentId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (highestSort?.sortOrder ?? -1) + 1;
    }

    if (input.imageMediaId) {
      await validateMediaImage(input.imageMediaId);
    }

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          name: input.name,
          slug: normalizedSlug,
          description: input.description || null,
          parentId,
          sortOrder,
          level: calculatedLevel,
          imageMediaId: input.imageMediaId || null,
          iconUrl: input.iconUrl || null,
          isActive: input.isActive ?? true,
        },
        include: {
          imageMedia: { select: { id: true, variants: true, diskPath: true } },
        },
      });

      if (input.imageMediaId) {
        await tx.media.update({
          where: { id: input.imageMediaId },
          data: {
            isAttached: true,
            attachedToId: created.id,
            scope: 'CATEGORY_BANNER',
          },
        });
      }

      return created;
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return {
      ...category,
      image: formatCategoryImage(category),
    };
  }

  // Updates category attributes, prevents circular hierarchies, and cascades level shifts
  static async update(id: string, input: UpdateCategoryInput) {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { imageMedia: true },
    });
    if (!existing) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const parentId = input.parentId !== undefined ? input.parentId : existing.parentId;

    if (parentId === id) {
      throw new AppError(400, 'INVALID_PARENT_CATEGORY', 'A category cannot be its own parent');
    }

    if (parentId && parentId !== existing.parentId) {
      const isCircular = await checkCircularDependency(id, parentId);
      if (isCircular) {
        throw new AppError(
          400,
          'CIRCULAR_DEPENDENCY',
          'Cannot assign parent: target parent is a descendant of this category'
        );
      }

      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new AppError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Parent category not found');
      }
      if (!parent.isActive && (input.isActive === undefined || input.isActive === true)) {
        throw new AppError(400, 'INACTIVE_PARENT_CATEGORY', 'Cannot move category under an inactive parent');
      }

      const newLevel = parent.level + 1;
      const subtreeMaxDepth = await getSubtreeMaxDepth(id, newLevel);
      if (subtreeMaxDepth >= MAX_CATEGORY_DEPTH) {
        throw new AppError(
          400,
          'MAX_DEPTH_EXCEEDED',
          `Moving this branch would exceed maximum hierarchy depth of ${MAX_CATEGORY_DEPTH} levels`
        );
      }
    }

    const targetSlug = input.slug ? slugify(input.slug) : existing.slug;
    if (input.slug || input.parentId !== undefined) {
      const duplicate = await prisma.category.findFirst({
        where: {
          parentId,
          slug: targetSlug,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new AppError(400, 'SLUG_EXISTS', `A category with slug "${targetSlug}" already exists under this parent`);
      }
    }

    if (input.imageMediaId && input.imageMediaId !== existing.imageMediaId) {
      await validateMediaImage(input.imageMediaId);
    }

    let newLevel = existing.level;
    if (parentId !== existing.parentId) {
      if (parentId === null) {
        newLevel = 0;
      } else {
        const parent = await prisma.category.findUnique({ where: { id: parentId } });
        newLevel = (parent?.level ?? 0) + 1;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.imageMediaId !== undefined && input.imageMediaId !== existing.imageMediaId && existing.imageMediaId) {
        await tx.media.update({
          where: { id: existing.imageMediaId },
          data: { isAttached: false, attachedToId: null, scope: 'UNATTACHED' },
        });
      }

      if (input.imageMediaId && input.imageMediaId !== existing.imageMediaId) {
        await tx.media.update({
          where: { id: input.imageMediaId },
          data: { isAttached: true, attachedToId: id, scope: 'CATEGORY_BANNER' },
        });
      }

      const res = await tx.category.update({
        where: { id },
        data: {
          name: input.name !== undefined ? input.name : existing.name,
          slug: targetSlug,
          description: input.description !== undefined ? input.description : existing.description,
          parentId,
          level: newLevel,
          sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sortOrder,
          imageMediaId: input.imageMediaId !== undefined ? input.imageMediaId : existing.imageMediaId,
          iconUrl: input.iconUrl !== undefined ? input.iconUrl : existing.iconUrl,
          isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
        },
        include: {
          imageMedia: { select: { id: true, variants: true, diskPath: true } },
        },
      });

      if (parentId !== existing.parentId) {
        await updateSubtreeLevels(tx, id, newLevel);
      }

      return res;
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return {
      ...updated,
      image: formatCategoryImage(updated),
    };
  }

  // Atomically reorders sibling categories to avoid sort collisions
  static async reorder(input: ReorderCategoriesInput) {
    const ids = input.items.map((i) => i.id);

    const categories = await prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, parentId: true },
    });

    if (categories.length !== ids.length) {
      throw new AppError(400, 'INVALID_CATEGORY_IDS', 'One or more category IDs are invalid');
    }

    await prisma.$transaction(
      input.items.map((item) =>
        prisma.category.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return { success: true, count: input.items.length };
  }

  // Toggles active state; cascading deactivation down all descendant categories
  static async toggleActive(id: string, isActive: boolean) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    if (isActive && category.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: category.parentId } });
      if (parent && !parent.isActive) {
        throw new AppError(400, 'INACTIVE_PARENT_CATEGORY', 'Cannot activate child category while parent is inactive');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.category.update({
        where: { id },
        data: { isActive },
      });

      if (!isActive) {
        const cascadeDeactivate = async (catId: string) => {
          const children = await tx.category.findMany({
            where: { parentId: catId },
            select: { id: true },
          });
          if (children.length > 0) {
            await tx.category.updateMany({
              where: { parentId: catId },
              data: { isActive: false },
            });
            for (const child of children) {
              await cascadeDeactivate(child.id);
            }
          }
        };
        await cascadeDeactivate(id);
      }

      return res;
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return updated;
  }

  // Deletion guard: blocks deletion if subcategories exist or active listings reference this category
  static async delete(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { imageMedia: true },
    });
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const childCount = await prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new AppError(
        409,
        'CATEGORY_HAS_CHILDREN',
        `Cannot delete category with ${childCount} subcategory(s). Move or delete subcategories first.`
      );
    }

    const activeAdsCount = await prisma.ad.count({
      where: {
        categoryId: id,
        status: { in: ['ACTIVE', 'PENDING_REVIEW'] },
        deletedAt: null,
      },
    });
    if (activeAdsCount > 0) {
      throw new AppError(
        409,
        'CATEGORY_IN_USE',
        `Cannot delete category referenced by ${activeAdsCount} active listing(s). Deactivate it instead.`
      );
    }

    await prisma.$transaction(async (tx) => {
      if (category.imageMediaId) {
        await tx.media.update({
          where: { id: category.imageMediaId },
          data: { isAttached: false, attachedToId: null, scope: 'UNATTACHED' },
        });
      }

      await tx.categoryAttribute.deleteMany({ where: { categoryId: id } });
      await tx.category.delete({ where: { id } });
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return category;
  }
}
