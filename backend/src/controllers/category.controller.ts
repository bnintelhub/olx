import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { AttributeType } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { writeAuditLog } from '../utils/audit';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').optional(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().default(0),
});

const updateCategorySchema = createCategorySchema.partial();

const createAttributeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  key: z.string().min(2, 'Key is required').regex(/^[a-z0-9_]+$/, 'Key must be lowercase letters, numbers, and underscores'),
  displayLabel: z.string().min(2, 'Display label must be at least 2 characters').optional(),
  type: z.nativeEnum(AttributeType),
  options: z.array(z.string()).optional(),
  validationRules: z.record(z.any()).optional(),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(true),
  unit: z.string().optional(),
  displayOrder: z.number().int().default(0),
});

const updateAttributeSchema = createAttributeSchema.partial();

export class CategoryController {
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private static validateAttributeTypeOptions(type: AttributeType, options?: string[]) {
    if ((type === AttributeType.SELECT || type === AttributeType.MULTI_SELECT) && (!options || options.length === 0)) {
      throw new AppError(400, 'OPTIONS_REQUIRED', 'Allowed values are required for select and multi-select attributes');
    }
    if ((type === AttributeType.TEXT || type === AttributeType.NUMBER || type === AttributeType.BOOLEAN || type === AttributeType.DATE) && options && options.length > 0) {
      throw new AppError(400, 'OPTIONS_NOT_ALLOWED', 'Allowed values are supported only for select and multi-select attributes');
    }
  }

  /**
   * GET /api/v1/categories
   * Returns top-level categories with subcategories count
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
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

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/categories/tree
   * Returns full 2-3 level taxonomy tree
   */
  static async getTree(req: Request, res: Response, next: NextFunction) {
    try {
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

      res.status(200).json({
        success: true,
        data: tree,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/categories/:slug
   */
  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
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

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/categories/:id/attributes
   * Resolves dynamic attributes (including parent category inheritance)
   */
  static async getAttributes(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      const category = await prisma.category.findUnique({
        where: { id },
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

      // Inherit parent attributes if subcategory
      const parentAttrs = (category as any).parent?.attributes || [];
      const ownAttrs = (category as any).attributes || [];

      // Combine attributes, own attributes take precedence over same key
      const attrMap = new Map();
      parentAttrs.forEach((a: any) => attrMap.set(a.key, a));
      ownAttrs.forEach((a: any) => attrMap.set(a.key, a));

      const mergedAttributes = Array.from(attrMap.values()).sort(
        (a: any, b: any) => a.displayOrder - b.displayOrder
      );

      res.status(200).json({
        success: true,
        data: {
          category: {
            id: category.id,
            name: category.name,
            slug: category.slug,
          },
          attributes: mergedAttributes,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/categories (Admin)
   */
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createCategorySchema.parse(req.body);
      const normalizedSlug = CategoryController.slugify(body.slug || body.name);

      if (!normalizedSlug) {
        throw new AppError(400, 'INVALID_SLUG', 'Category slug cannot be empty');
      }

      if (body.parentId) {
        const parent = await prisma.category.findUnique({ where: { id: body.parentId } });
        if (!parent) {
          throw new AppError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Parent category not found');
        }
      }

      const existing = await prisma.category.findUnique({
        where: { slug: normalizedSlug },
      });
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

      await writeAuditLog({
        userId: req.user?.id,
        action: 'ADMIN_CREATE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: category.id,
        newData: category,
        request: req,
      });

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/categories/:id (Admin)
   */
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = updateCategorySchema.parse(req.body);

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
        const normalizedSlug = CategoryController.slugify(body.slug);
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

      await writeAuditLog({
        userId: req.user?.id,
        action: 'ADMIN_UPDATE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: id,
        newData: category,
        request: req,
      });

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/categories/:id (Admin)
   */
  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
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

      await prisma.category.delete({
        where: { id },
      });

      await writeAuditLog({
        userId: req.user?.id,
        action: 'ADMIN_DELETE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: id,
        oldData: category,
        request: req,
      });

      res.status(200).json({
        success: true,
        data: { message: 'Category deleted successfully' },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/categories/:id/attributes (Admin)
   */
  static async addAttribute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const categoryId = req.params.id as string;
      const body = createAttributeSchema.parse(req.body);
      CategoryController.validateAttributeTypeOptions(body.type, body.options);

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

      await writeAuditLog({
        userId: req.user?.id,
        action: 'ADMIN_CREATE_CATEGORY_ATTRIBUTE',
        entityType: 'CATEGORY_ATTRIBUTE',
        entityId: attribute.id,
        newData: attribute,
        request: req,
      });

      res.status(201).json({
        success: true,
        data: attribute,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/categories/attributes/:attrId (Admin)
   */
  static async updateAttribute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const attrId = req.params.attrId as string;
      const body = updateAttributeSchema.parse(req.body);
      if (body.type) {
        CategoryController.validateAttributeTypeOptions(body.type, body.options);
      }

      const current = await prisma.categoryAttribute.findUnique({ where: { id: attrId } });
      if (!current) {
        throw new AppError(404, 'ATTRIBUTE_NOT_FOUND', 'Attribute not found');
      }

      const attribute = await prisma.categoryAttribute.update({
        where: { id: attrId },
        data: {
          ...body,
          options: body.options !== undefined ? (body.options as any) : undefined,
          validationRules: body.validationRules !== undefined ? body.validationRules : undefined,
        },
      });

      await writeAuditLog({
        userId: req.user?.id,
        action: 'ADMIN_UPDATE_CATEGORY_ATTRIBUTE',
        entityType: 'CATEGORY_ATTRIBUTE',
        entityId: attrId,
        oldData: current,
        newData: attribute,
        request: req,
      });

      res.status(200).json({
        success: true,
        data: attribute,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/categories/attributes/:attrId (Admin)
   */
  static async deleteAttribute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const attrId = req.params.attrId as string;
      const current = await prisma.categoryAttribute.findUnique({ where: { id: attrId } });
      if (!current) {
        throw new AppError(404, 'ATTRIBUTE_NOT_FOUND', 'Attribute not found');
      }
      await prisma.categoryAttribute.delete({
        where: { id: attrId },
      });

      await writeAuditLog({
        userId: req.user?.id,
        action: 'ADMIN_DELETE_CATEGORY_ATTRIBUTE',
        entityType: 'CATEGORY_ATTRIBUTE',
        entityId: attrId,
        oldData: current,
        request: req,
      });

      res.status(200).json({
        success: true,
        data: { message: 'Attribute deleted successfully' },
      });
    } catch (err) {
      next(err);
    }
  }
}
