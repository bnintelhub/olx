import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { AttributeType } from '@prisma/client';
import { getCache, setCache, delCache } from '../../config/redis';

export class CategoriesService {
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static validateAttributeTypeOptions(type: AttributeType, options?: string[]) {
    if ((type === AttributeType.SELECT || type === AttributeType.MULTI_SELECT) && (!options || options.length === 0)) {
      throw new AppError(400, 'OPTIONS_REQUIRED', 'Allowed values are required for select and multi-select attributes');
    }
    if (
      (type === AttributeType.TEXT ||
        type === AttributeType.NUMBER ||
        type === AttributeType.BOOLEAN ||
        type === AttributeType.DATE) &&
      options &&
      options.length > 0
    ) {
      throw new AppError(400, 'OPTIONS_NOT_ALLOWED', 'Allowed values are supported only for select and multi-select attributes');
    }
  }

  static async getAll() {
    const cacheKey = 'categories:all';
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const categories = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        attributes: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    await setCache(cacheKey, categories, 600);
    return categories;
  }

  static async getTree() {
    const cacheKey = 'categories:tree';
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const tree = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        attributes: {
          orderBy: { displayOrder: 'asc' },
        },
        children: {
          include: {
            attributes: {
              orderBy: { displayOrder: 'asc' },
            },
            children: {
              include: {
                attributes: {
                  orderBy: { displayOrder: 'asc' },
                },
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    await setCache(cacheKey, tree, 600);
    return tree;
  }

  static async getBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          orderBy: { displayOrder: 'asc' },
        },
        attributes: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }
    return category;
  }

  static async getAttributes(categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: {
          include: {
            attributes: { orderBy: { displayOrder: 'asc' } },
          },
        },
        attributes: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const parentAttrs = (category as any).parent?.attributes || [];
    const ownAttrs = (category as any).attributes || [];

    const attrMap = new Map();
    parentAttrs.forEach((a: any) => attrMap.set(a.key, a));
    ownAttrs.forEach((a: any) => attrMap.set(a.key, a));

    const mergedAttributes = Array.from(attrMap.values()).sort(
      (a: any, b: any) => a.displayOrder - b.displayOrder
    );

    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      attributes: mergedAttributes,
    };
  }

  static async create(body: any) {
    const normalizedSlug = this.slugify(body.slug || body.name);
    if (!normalizedSlug) {
      throw new AppError(400, 'INVALID_SLUG', 'Category slug cannot be empty');
    }

    if (body.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: body.parentId } });
      if (!parent) {
        throw new AppError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Parent category not found');
      }
    }

    const existing = await prisma.category.findUnique({ where: { slug: normalizedSlug } });
    if (existing) {
      throw new AppError(400, 'SLUG_EXISTS', 'Category slug already exists');
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug: normalizedSlug,
        description: body.description,
        iconUrl: body.iconUrl,
        parentId: body.parentId || null,
        isActive: body.isActive ?? true,
        displayOrder: body.displayOrder,
      },
    });

    await delCache('categories:all', 'categories:tree');
    return category;
  }

  static async update(id: string, body: any) {
    if (body.parentId === id) {
      throw new AppError(400, 'INVALID_PARENT_CATEGORY', 'A category cannot be its own parent');
    }

    if (body.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: body.parentId } });
      if (!parent) {
        throw new AppError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Parent category not found');
      }
    }

    if (body.slug) {
      const normalizedSlug = this.slugify(body.slug);
      const existing = await prisma.category.findUnique({ where: { slug: normalizedSlug } });
      if (existing && existing.id !== id) {
        throw new AppError(400, 'SLUG_EXISTS', 'Category slug already exists');
      }
      body.slug = normalizedSlug;
    }

    const category = await prisma.category.update({
      where: { id },
      data: body,
    });

    await delCache('categories:all', 'categories:tree');
    return category;
  }

  static async delete(id: string) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const [childCount, adCount] = await Promise.all([
      prisma.category.count({ where: { parentId: id } }),
      prisma.ad.count({ where: { categoryId: id, deletedAt: null } }),
    ]);
    if (childCount > 0 || adCount > 0) {
      throw new AppError(409, 'CATEGORY_IN_USE', 'Cannot delete category with subcategories or listings');
    }

    await prisma.category.delete({ where: { id } });
    await delCache('categories:all', 'categories:tree');
    return category;
  }

  static async addAttribute(categoryId: string, body: any) {
    this.validateAttributeTypeOptions(body.type, body.options);

    return prisma.categoryAttribute.create({
      data: {
        categoryId,
        name: body.name,
        key: body.key,
        displayLabel: body.displayLabel,
        type: body.type,
        options: body.options ? body.options : undefined,
        validationRules: body.validationRules,
        isRequired: body.isRequired,
        isFilterable: body.isFilterable,
        unit: body.unit,
        displayOrder: body.displayOrder,
      },
    });
  }

  static async updateAttribute(attrId: string, body: any) {
    if (body.type) {
      this.validateAttributeTypeOptions(body.type, body.options);
    }

    const current = await prisma.categoryAttribute.findUnique({ where: { id: attrId } });
    if (!current) {
      throw new AppError(404, 'ATTRIBUTE_NOT_FOUND', 'Attribute not found');
    }

    return prisma.categoryAttribute.update({
      where: { id: attrId },
      data: {
        ...body,
        options: body.options !== undefined ? (body.options as any) : undefined,
        validationRules: body.validationRules !== undefined ? body.validationRules : undefined,
      },
    });
  }

  static async deleteAttribute(attrId: string) {
    const current = await prisma.categoryAttribute.findUnique({ where: { id: attrId } });
    if (!current) {
      throw new AppError(404, 'ATTRIBUTE_NOT_FOUND', 'Attribute not found');
    }
    await prisma.categoryAttribute.delete({ where: { id: attrId } });
    return current;
  }
}
