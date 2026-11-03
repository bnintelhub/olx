import { z } from 'zod';

export const searchSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  categorySlug: z.string().optional(),
  locationId: z.string().optional(),
  citySlug: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type SearchParams = z.infer<typeof searchSchema> & {
  attributes?: Record<string, any>;
};
