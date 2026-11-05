import { z } from 'zod';
import { MediaStatus, MediaEntityScope } from '@prisma/client';

export const adminMediaQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.union([z.nativeEnum(MediaStatus), z.literal('ALL')]).optional(),
  scope: z.union([z.nativeEnum(MediaEntityScope), z.literal('ALL')]).optional(),
  mimeType: z.string().optional(),
  search: z.string().optional(),
  userId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'fileSize', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateMediaMetadataSchema = z.object({
  originalName: z.string().min(1).max(255).optional(),
  scope: z.nativeEnum(MediaEntityScope).optional(),
  isAttached: z.boolean().optional(),
  attachedToId: z.string().nullable().optional(),
  status: z.nativeEnum(MediaStatus).optional(),
});

export type AdminMediaQueryInput = z.infer<typeof adminMediaQuerySchema>;
export type UpdateMediaMetadataInput = z.infer<typeof updateMediaMetadataSchema>;
