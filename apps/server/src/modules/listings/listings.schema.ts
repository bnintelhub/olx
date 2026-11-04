import { z } from 'zod';
import { AdStatus } from '@prisma/client';

export const createListingSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(150),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.coerce.number().positive('Price must be greater than zero'),
  isNegotiable: z.boolean().default(true),
  categoryId: z.string().uuid('Valid Category ID is required'),
  locationId: z.string().uuid('Valid Location ID is required'),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  contactPreference: z.enum(['CHAT_AND_CALL', 'CHAT_ONLY', 'CALL_ONLY']).default('CHAT_AND_CALL'),
  attributes: z.record(z.any()).default({}),
  images: z
    .array(
      z.object({
        url: z.string().min(1, 'Image URL is required'),
        isCover: z.boolean().optional(),
      })
    )
    .min(1, 'At least 1 photo is required')
    .max(12, 'Maximum 12 photos allowed'),
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
