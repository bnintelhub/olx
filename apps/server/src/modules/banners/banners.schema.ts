import { z } from 'zod';

export const createBannerSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  subtitle: z.string().max(255).optional().nullable(),
  ctaText: z.string().max(100).optional().nullable(),
  targetUrl: z.string().max(500).optional().nullable(),
  position: z.string().max(50).default('HOME_HERO'),
  mediaType: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
  desktopMediaUrl: z.string().max(500).optional().nullable(),
  mobileMediaUrl: z.string().max(500).optional().nullable(),
  imageMediaAssetId: z.string().uuid().optional().nullable(),
  cityId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  locationText: z.string().max(150).optional().nullable(),
  categoryText: z.string().max(150).optional().nullable(),
  priority: z.coerce.number().int().min(0).max(1000).default(0),
  displayOrder: z.coerce.number().int().default(0),
  status: z.enum(['ACTIVE', 'PAUSED', 'DRAFT']).default('ACTIVE'),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().or(z.date()),
  endsAt: z.string().datetime().or(z.date()),
});

export const updateBannerSchema = createBannerSchema.partial();

export const queryBannersSchema = z.object({
  position: z.string().default('HOME_HERO'),
  cityId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export const adminQueryBannersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ALL', 'ACTIVE', 'PAUSED', 'DRAFT', 'EXPIRED']).default('ALL'),
  search: z.string().optional(),
});

export const bannerIdParamSchema = z.object({
  id: z.string().uuid('Invalid banner ID'),
});

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type QueryBannersInput = z.infer<typeof queryBannersSchema>;
export type AdminQueryBannersInput = z.infer<typeof adminQueryBannersSchema>;

