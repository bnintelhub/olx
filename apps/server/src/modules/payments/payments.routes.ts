import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PaymentsService } from './payments.service';
import { createOrderSchema, verifyPaymentSchema } from './payments.schema';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';
import { z } from 'zod';

const refundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().optional(),
});

export class PaymentsController {
  static async createOrder(request: FastifyRequest, reply: FastifyReply) {
    const { adId, boostType, durationDays } = createOrderSchema.parse(request.body);
    const orderData = await PaymentsService.createBoostOrder(request.user!.id, adId, boostType, durationDays);
    return reply.status(200).send({ success: true, data: orderData });
  }

  static async verifyPayment(request: FastifyRequest, reply: FastifyReply) {
    const body = verifyPaymentSchema.parse(request.body);
    const boost = await PaymentsService.verifyAndApplyBoost(request.user!.id, {
      adId: body.adId,
      boostType: body.boostType,
      durationDays: body.durationDays,
      paymentId: body.paymentId,
    });
    return reply.status(200).send({
      success: true,
      data: boost,
      message: 'Payment verified and promotion activated!',
    });
  }

  // Finance Admin endpoints
  static async getOverview(request: FastifyRequest, reply: FastifyReply) {
    const data = await PaymentsService.getFinancialOverview();
    return reply.status(200).send({ success: true, data });
  }

  static async processRefund(request: FastifyRequest, reply: FastifyReply) {
    const { paymentId, reason } = refundSchema.parse(request.body);
    const refund = await PaymentsService.processRefund(paymentId, reason);
    return reply.status(200).send({ success: true, data: refund });
  }
}

export async function paymentRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  // User payment endpoints
  fastify.post('/create-order', auth, PaymentsController.createOrder);
  fastify.post('/verify', auth, PaymentsController.verifyPayment);

  // Protected Finance Admin endpoints (Strictly Finance Admin / Super Admin)
  fastify.get(
    '/admin/overview',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.PAYMENTS_READ, Permissions.REVENUE_READ)] },
    PaymentsController.getOverview
  );
  fastify.post(
    '/admin/refund',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.PAYMENTS_REFUND)] },
    PaymentsController.processRefund
  );
}
