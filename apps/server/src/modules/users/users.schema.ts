import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().optional(),
  businessName: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
