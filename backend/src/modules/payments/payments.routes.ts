import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PaymentsService } from './payments.service';
import { createOrderSchema, verifyPaymentSchema } from './payments.schema';

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
}

export async function paymentRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };
  fastify.post('/create-order', auth, PaymentsController.createOrder);
  fastify.post('/verify', auth, PaymentsController.verifyPayment);
}
