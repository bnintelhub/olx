import { z } from 'zod';
import { AdStatus } from '@prisma/client';

export const listingImageInputSchema = z
  .object({
    mediaId: z.string().optional(),
    url: z.string().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isCover: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.mediaId || data.url), {
    message: 'Either mediaId or url must be provided for each image',
  });

export const createListingSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(150),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.coerce.number().positive('Price must be greater than zero'),
  isNegotiable: z.boolean().default(true),
  categoryId: z.string().min(1, 'Category ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  contactPreference: z.enum(['CHAT_AND_CALL', 'CHAT_ONLY', 'CALL_ONLY']).default('CHAT_AND_CALL'),
  attributes: z.record(z.any()).default({}),
  images: z
    .array(listingImageInputSchema)
    .min(1, 'At least 1 photo is required')
    .max(8, 'Maximum 8 photos allowed per listing'),
});

export const reorderListingImagesSchema = z.object({
  images: z
    .array(
      z.object({
        mediaId: z.string().min(1, 'Media ID is required'),
        sortOrder: z.number().int().min(0).default(0),
        isCover: z.boolean().default(false),
      })
    )
    .min(1, 'At least 1 photo is required')
    .max(8, 'Maximum 8 photos allowed per listing'),
});

export const updateListingSchema = z.object({
  title: z.string().min(10).max(150).optional(),
  description: z.string().min(20).optional(),
  price: z.coerce.number().positive().optional(),
  isNegotiable: z.boolean().optional(),
  contactPreference: z.enum(['CHAT_AND_CALL', 'CHAT_ONLY', 'CALL_ONLY']).optional(),
  attributes: z.record(z.any()).optional(),
});

export const updateListingStatusSchema = z.object({
  status: z.nativeEnum(AdStatus),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
