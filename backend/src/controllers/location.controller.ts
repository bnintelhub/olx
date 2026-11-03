import { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { writeAuditLog } from '../utils/audit';
import { z } from 'zod';

const createLocationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).optional(),
  parentId: z.string().uuid().nullable().optional(),
  type: z.enum(['COUNTRY', 'STATE', 'CITY', 'LOCALITY']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateLocationSchema = createLocationSchema.partial();

const typeOrder: Record<string, number> = { COUNTRY: 1, STATE: 2, CITY: 3, LOCALITY: 4 };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class LocationController {
  static async getCities(req: Request, res: Response, next: NextFunction) {
    try {
      const cities = await prisma.location.findMany({
        where: { type: 'CITY', isActive: true },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({ success: true, data: cities });
    } catch (err) {
      next(err);
    }
  }

  static async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      const tree = await prisma.location.findMany({
        where: { parentId: null, isActive: true },
        include: {
          children: {
            where: { isActive: true },
            include: {
              children: {
                where: { isActive: true },
                include: { children: { where: { isActive: true }, orderBy: { name: 'asc' } } },
                orderBy: { name: 'asc' },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });
      res.status(200).json({ success: true, data: tree });
    } catch (err) {
      next(err);
    }
  }

  static async getAdminList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const type = typeof req.query.type === 'string' ? req.query.type : '';
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      const where: any = {};
      if (type) where.type = type;
      if (isActive !== undefined) where.isActive = isActive;
      if (q) {
        where.OR = [{ name: { contains: q } }, { slug: { contains: q } }, { pincode: { contains: q } }];
      }
      const locations = await prisma.location.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        include: { parent: { select: { id: true, name: true, type: true } }, _count: { select: { ads: true } } },
        take: 300,
      });
      res.status(200).json({ success: true, data: locations });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createLocationSchema.parse(req.body);
      const normalizedSlug = slugify(body.slug || body.name);
      if (!normalizedSlug) throw new AppError(400, 'INVALID_SLUG', 'Location slug cannot be empty');

      if (body.parentId) {
        const parent = await prisma.location.findUnique({ where: { id: body.parentId } });
        if (!parent) throw new AppError(404, 'PARENT_LOCATION_NOT_FOUND', 'Parent location not found');
        if (typeOrder[body.type] !== typeOrder[parent.type] + 1) {
          throw new AppError(400, 'INVALID_LOCATION_HIERARCHY', `${body.type} must be inside ${Object.keys(typeOrder).find((key) => typeOrder[key] === typeOrder[body.type] - 1)}`);
        }
      } else if (body.type !== 'COUNTRY') {
        throw new AppError(400, 'ROOT_MUST_BE_COUNTRY', 'Only COUNTRY can be created without a parent');
      }

      const duplicate = await prisma.location.findFirst({
        where: { parentId: body.parentId || null, OR: [{ slug: normalizedSlug }, { name: body.name }] },
      });
      if (duplicate) throw new AppError(400, 'DUPLICATE_LOCATION', 'Duplicate location under the same parent');

      const location = await prisma.location.create({
        data: {
          name: body.name,
          slug: normalizedSlug,
          parentId: body.parentId || null,
          type: body.type,
          latitude: body.latitude,
          longitude: body.longitude,
          pincode: body.pincode || null,
          isActive: body.isActive ?? true,
        },
      });

      await writeAuditLog({
        userId: req.user?.id,
        action: 'ADMIN_CREATE_LOCATION',
        entityType: 'LOCATION',
        entityId: location.id,
        newData: location,
        request: req,
      });

      res.status(201).json({ success: true, data: location });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = updateLocationSchema.parse(req.body);
      const existing = await prisma.location.findUnique({ where: { id } });
      if (!existing) throw new AppError(404, 'LOCATION_NOT_FOUND', 'Location not found');

      const nextType = body.type || existing.type;
      const nextParentId = body.parentId !== undefined ? body.parentId : existing.parentId;
      if (nextParentId) {
        if (nextParentId === id) throw new AppError(400, 'INVALID_PARENT_LOCATION', 'Location cannot be its own parent');
        const parent = await prisma.location.findUnique({ where: { id: nextParentId } });
        if (!parent) throw new AppError(404, 'PARENT_LOCATION_NOT_FOUND', 'Parent location not found');
        if (typeOrder[nextType] !== typeOrder[parent.type] + 1) {
          throw new AppError(400, 'INVALID_LOCATION_HIERARCHY', `${nextType} cannot be inside ${parent.type}`);
        }
      }

      const normalizedSlug = body.slug ? slugify(body.slug) : undefined;
      if (normalizedSlug) {
        const duplicate = await prisma.location.findFirst({
          where: { id: { not: id }, parentId: nextParentId || null, slug: normalizedSlug },
        });
        if (duplicate) throw new AppError(400, 'DUPLICATE_LOCATION', 'Duplicate slug under the same parent');
      }

      const location = await prisma.location.update({
        where: { id },
        data: {
          ...body,
          slug: normalizedSlug || undefined,
          pincode: body.pincode === undefined ? undefined : body.pincode || null,
        },
      });

      await writeAuditLog({
        userId: req.user?.id,
        action: 'ADMIN_UPDATE_LOCATION',
        entityType: 'LOCATION',
        entityId: id,
        oldData: existing,
        newData: location,
        request: req,
      });

      res.status(200).json({ success: true, data: location });
    } catch (err) {
      next(err);
    }
  }
}
