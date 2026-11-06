import { z } from 'zod';
import { PaymentPurpose } from './payment.types';

export const createPaymentOrderSchema = z.object({
  purpose: z.nativeEnum(PaymentPurpose),
  productId: z.string().min(1, 'Product identifier is required').max(100),
  listingId: z.string().uuid('Invalid listing UUID').optional(),
  returnUrl: z.string().url('Invalid return URL').optional(),
});

export const refundPaymentSchema = z.object({
  reason: z.string().max(255, 'Reason cannot exceed 255 characters').optional(),
});

export const paymentIdParamSchema = z.object({
  id: z.string().min(1, 'Payment identifier is required'),
});

export const adminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ALL', 'CREATED', 'INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUND_REQUESTED', 'REFUNDED']).default('ALL'),
  search: z.string().optional(),
});

export type CreatePaymentOrderBody = z.infer<typeof createPaymentOrderSchema>;
export type RefundPaymentBody = z.infer<typeof refundPaymentSchema>;
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;

