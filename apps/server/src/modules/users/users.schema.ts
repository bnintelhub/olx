import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().nullable().optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().nullable().optional(),
  businessName: z.string().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
