import { z } from 'zod';

export const mediaIdParamSchema = z.object({
  mediaId: z.string().min(1, 'Media ID is required'),
});

export const listingImageItemSchema = z.object({
  mediaId: z.string().min(1, 'Media ID is required'),
  sortOrder: z.number().int().min(0).default(0),
  isCover: z.boolean().default(false),
});

export const updateListingImagesSchema = z.object({
  images: z
    .array(listingImageItemSchema)
    .min(1, 'At least 1 image is required')
    .max(12, 'Maximum 12 images allowed'),
});

export type ListingImageItem = z.infer<typeof listingImageItemSchema>;
export type UpdateListingImagesInput = z.infer<typeof updateListingImagesSchema>;

