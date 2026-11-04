import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const userActionSchema = z.object({
  action: z.enum(['SUSPEND', 'BAN', 'ACTIVATE', 'CHANGE_ROLE', 'UPDATE_CAPABILITIES']),
  role: z.nativeEnum(UserRole).optional(),
  capabilities: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

export const updateAdminProfileSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().optional(),
});

export const changeAdminPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});
