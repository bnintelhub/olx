import { z } from 'zod';
import { MediaAssetStatus, MediaEntityType } from '@prisma/client';

export const normalizeMediaScope = (val: unknown) => {
  if (typeof val !== 'string') return val;
  const upper = val.toUpperCase().trim();
  if (upper === 'CATEGORY_BANNER' || upper === 'CATEGORY_ICON' || upper === 'CATEGORIES') return 'CATEGORY';
  if (upper === 'LISTING_IMAGE' || upper === 'LISTINGS' || upper === 'ADS') return 'LISTING';
  if (upper === 'USER_AVATAR' || upper === 'AVATARS' || upper === 'USERS') return 'USER';
  if (upper === 'BANNER_IMAGE' || upper === 'BANNERS') return 'BANNER';
  if (upper === 'CHAT_ATTACHMENT' || upper === 'CHATS') return 'CHAT';
  if (upper === 'REVIEW_IMAGE' || upper === 'SUPPORT_ATTACHMENT' || upper === 'SYSTEM_ASSET') return 'SYSTEM';
  return upper;
};

export const adminMediaQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.union([z.nativeEnum(MediaAssetStatus), z.literal('ALL')]).optional(),
  scope: z.preprocess(
    normalizeMediaScope,
    z.union([z.nativeEnum(MediaEntityType), z.literal('ALL'), z.literal('UNATTACHED')]).optional()
  ),
  mimeType: z.string().optional(),
  search: z.string().optional(),
  userId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'sizeBytes', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateMediaMetadataSchema = z.object({
  originalName: z.string().min(1).max(255).optional(),
  scope: z.preprocess(
    normalizeMediaScope,
    z.nativeEnum(MediaEntityType).optional()
  ),
  isAttached: z.boolean().optional(),
  attachedToId: z.string().nullable().optional(),
  status: z.nativeEnum(MediaAssetStatus).optional(),
});

export type AdminMediaQueryInput = z.infer<typeof adminMediaQuerySchema>;
export type UpdateMediaMetadataInput = z.infer<typeof updateMediaMetadataSchema>;
