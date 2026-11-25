import { z } from 'zod';

export const singleEventSchema = z.object({
  eventId: z.string().min(4).max(100),
  eventType: z.enum([
    'IMPRESSION',
    'CLICK',
    'VIEW',
    'SEARCH',
    'CATEGORY_BROWSE',
    'WISHLIST',
    'CHAT',
  ]),
  listingId: z.string().max(36).optional().nullable(),
  categoryId: z.string().max(36).optional().nullable(),
  sessionId: z.string().max(100).optional().nullable(),
  feedPosition: z.coerce.number().int().min(0).max(500).optional(),
  feedVersion: z.string().max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ingestEventsSchema = z.union([
  singleEventSchema,
  z.object({
    events: z.array(singleEventSchema).min(1).max(25),
  }),
]);

export type SingleEventInput = z.infer<typeof singleEventSchema>;
