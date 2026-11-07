import { prisma } from '../../../config/prisma';
import { AppError } from '../../../shared/errors/app-error';
import { AttributeType, Prisma } from '@prisma/client';
import { delCache } from '../../../config/redis';

export class CategoryAttributeService {
  // Validates attribute type compatibility with provided selection options
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

  // Traverses ancestors to collect inherited specifications, and descends to children if parent has no direct attributes
  static async getAttributes(categoryId: string) {
    const rawId = (categoryId || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
    const normalizedSlug = rawId.replace(/^\/+/, '').toLowerCase();

    const where: Prisma.CategoryWhereInput = isUuid
      ? { id: rawId }
      : {
          OR: [
            { slug: { equals: normalizedSlug, mode: 'insensitive' } },
            { slug: { equals: `${normalizedSlug}s`, mode: 'insensitive' } },
            ...(normalizedSlug.endsWith('s')
              ? [{ slug: { equals: normalizedSlug.slice(0, -1), mode: 'insensitive' as const } }]
              : []),
            { name: { equals: rawId, mode: 'insensitive' } },
          ],
        };

    const category = await prisma.category.findFirst({
      where,
      include: {
        attributes: { orderBy: { displayOrder: 'asc' } },
        children: {
          include: {
            attributes: { orderBy: { displayOrder: 'asc' } },
            children: {
              include: { attributes: { orderBy: { displayOrder: 'asc' } } },
            },
          },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const cat = category as any;

    // Walk up ancestor tree collecting inherited attributes
    const ancestorAttributes: any[] = [];
    let currentParentId = cat.parentId;

    while (currentParentId) {
      const parent = await prisma.category.findUnique({
        where: { id: currentParentId },
        include: { attributes: { orderBy: { displayOrder: 'asc' } } },
      });
      if (!parent) break;

      ancestorAttributes.unshift(...parent.attributes);
      currentParentId = parent.parentId;
    }

    // Collect child and descendant attributes for parent categories (e.g. Vehicles -> Car)
    const descendantAttributes: any[] = [];
    const collectDescendants = (children: any[]) => {
      for (const child of children) {
        if (child.attributes && child.attributes.length > 0) {
          descendantAttributes.push(...child.attributes);
        }
        if (child.children && child.children.length > 0) {
          collectDescendants(child.children);
        }
      }
    };
    if (cat.children && cat.children.length > 0) {
      collectDescendants(cat.children);
    }

    // Hierarchy merge: Descendant / child / direct attributes override ancestor attributes
    const attrMap = new Map<string, any>();
    // 1. Ancestors first
    ancestorAttributes.forEach((attr) => attrMap.set(attr.key, { ...attr }));
    // 2. Descendants (if parent category has no direct attributes or has shared filterable facets)
    descendantAttributes.forEach((attr) => {
      if (!attrMap.has(attr.key)) {
        attrMap.set(attr.key, { ...attr });
      } else {
        // Merge selection options if available
        const existing = attrMap.get(attr.key);
        if (Array.isArray(existing.options) && Array.isArray(attr.options)) {
          existing.options = Array.from(new Set([...existing.options, ...attr.options]));
        }
      }
    });
    // 3. Direct category attributes take highest precedence
    (cat.attributes || []).forEach((attr: any) => {
      if (attrMap.has(attr.key)) {
        const existing = attrMap.get(attr.key);
        const mergedOpts =
          Array.isArray(existing.options) && Array.isArray(attr.options)
            ? Array.from(new Set([...existing.options, ...attr.options]))
            : attr.options || existing.options;
        attrMap.set(attr.key, { ...existing, ...attr, options: mergedOpts });
      } else {
        attrMap.set(attr.key, { ...attr });
      }
    });

    const merged = Array.from(attrMap.values()).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    return {
      category: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        level: cat.level,
      },
      attributes: merged,
    };
  }

  // Adds a dynamic specification attribute to a category
  static async addAttribute(categoryId: string, body: any) {
    this.validateAttributeTypeOptions(body.type, body.options);

    const attribute = await prisma.categoryAttribute.create({
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

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return attribute;
  }

  // Updates an existing specification attribute
  static async updateAttribute(attrId: string, body: any) {
    if (body.type || body.options) {
      const existing = await prisma.categoryAttribute.findUnique({ where: { id: attrId } });
      if (!existing) throw new AppError(404, 'ATTRIBUTE_NOT_FOUND', 'Attribute not found');
      this.validateAttributeTypeOptions(body.type || existing.type, body.options || (existing.options as string[]));
    }

    const attribute = await prisma.categoryAttribute.update({
      where: { id: attrId },
      data: body,
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return attribute;
  }

  // Removes a dynamic specification attribute
  static async deleteAttribute(attrId: string) {
    const attribute = await prisma.categoryAttribute.delete({ where: { id: attrId } });
    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return attribute;
  }
}

