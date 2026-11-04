import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const userActionSchema = z.object({
  action: z.enum(['SUSPEND', 'BAN', 'ACTIVATE', 'CHANGE_ROLE', 'UPDATE_CAPABILITIES']),
  role: z.nativeEnum(UserRole).optional(),
  capabilities: z.array(z.string()).optional(),
  reason: z.string().optional(),
  ticketReference: z.string().optional(),
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

export const createInvitationSchema = z.object({
  email: z.string().email('Valid email address required'),
  role: z.nativeEnum(UserRole),
  expiryType: z.enum(['2_DAYS', '3_DAYS', '7_DAYS', 'NO_EXPIRY', 'CUSTOM']).optional().default('2_DAYS'),
  customExpiresAt: z.string().optional().nullable(),
  reason: z.string().optional(),
  ticketReference: z.string().optional(),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  search: z.string().optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
