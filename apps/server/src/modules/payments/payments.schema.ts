import { z } from 'zod';
import { BoostType } from '@prisma/client';

export const createOrderSchema = z.object({
  adId: z.string().uuid('Valid Ad ID required'),
  boostType: z.nativeEnum(BoostType).default(BoostType.FEATURED),
  durationDays: z.coerce.number().int().min(1).max(30).default(7),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
  adId: z.string().uuid(),
  boostType: z.nativeEnum(BoostType),
  durationDays: z.coerce.number().int().default(7),
});
