import { z } from 'zod';
import { ReportReason } from '@prisma/client';

export const reportAdSchema = z.object({
  adId: z.string().uuid('Valid Ad ID required'),
  reason: z.nativeEnum(ReportReason),
  details: z.string().optional().default(''),
});

export const blockUserSchema = z.object({
  userId: z.string().uuid('Valid user ID required to block'),
  reason: z.string().optional(),
});

export const reviewAdSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
  resolutionReason: z.string().min(3, 'Resolution reason is required'),
  adminNote: z.string().optional(),
  takeDownAd: z.boolean().optional(),
  banUser: z.boolean().optional(),
});
