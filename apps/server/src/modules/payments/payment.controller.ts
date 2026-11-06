import { FastifyReply, FastifyRequest } from 'fastify';
import { PaymentService } from './payment.service';
import {
  createPaymentOrderSchema,
  paymentIdParamSchema,
  refundPaymentSchema,
  adminOrdersQuerySchema,
} from './payment.schema';
import { PayUCallbackPayload } from './payment.types';

export class PaymentController {
  // POST /api/v1/payments/orders
  static async createOrder(request: FastifyRequest, reply: FastifyReply) {
    const body = createPaymentOrderSchema.parse(request.body);
    const userId = request.user!.id;

    const result = await PaymentService.createPaymentOrder(userId, body);

    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Payment order created. Redirect user to checkoutUrl with checkoutParams.',
    });
  }

  // GET /api/v1/payments/orders/:id
  static async getOrder(request: FastifyRequest, reply: FastifyReply) {
    const { id } = paymentIdParamSchema.parse(request.params);
    const userId = request.user!.id;

    const result = await PaymentService.getPaymentOrder(userId, id);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  // POST /api/v1/payments/:id/verify
  static async verifyPayment(request: FastifyRequest, reply: FastifyReply) {
    const { id } = paymentIdParamSchema.parse(request.params);
    const userId = request.user!.id;

    const result = await PaymentService.verifyPayment(userId, id);

    return reply.status(200).send({
      success: true,
      data: result,
      message: result.message,
    });
  }

  // POST /api/v1/payments/payu/success (PayU Hosted Checkout SURL)
  static async payuSuccess(request: FastifyRequest, reply: FastifyReply) {
    const payload = (request.body as PayUCallbackPayload) || {};
    const redirectUrl = await PaymentService.handleRedirect(payload, 'SUCCESS');
    return reply.redirect(redirectUrl);
  }

  // POST /api/v1/payments/payu/failure (PayU Hosted Checkout FURL)
  static async payuFailure(request: FastifyRequest, reply: FastifyReply) {
    const payload = (request.body as PayUCallbackPayload) || {};
    const redirectUrl = await PaymentService.handleRedirect(payload, 'FAILED');
    return reply.redirect(redirectUrl);
  }

  // POST /api/v1/payments/webhooks/payu (PayU Server Webhook)
  static async payuWebhook(request: FastifyRequest, reply: FastifyReply) {
    const payload = (request.body as PayUCallbackPayload) || {};
    const result = await PaymentService.handleWebhook(payload);

    return reply.status(200).send({
      status: 'OK',
      ...result,
    });
  }

  // POST /api/v1/payments/:id/refund (Admin Initiated)
  static async refundPayment(request: FastifyRequest, reply: FastifyReply) {
    const { id } = paymentIdParamSchema.parse(request.params);
    const body = refundPaymentSchema.parse(request.body || {});
    const adminUserId = request.user!.id;

    const result = await PaymentService.processRefund(adminUserId, id, body.reason);

    return reply.status(200).send({
      success: true,
      data: result,
      message: result.message,
    });
  }

  // GET /api/v1/payments/admin/overview
  static async getOverview(request: FastifyRequest, reply: FastifyReply) {
    const data = await PaymentService.getFinancialOverview();
    return reply.status(200).send({ success: true, data });
  }

  // GET /api/v1/payments/admin/orders
  static async getAdminOrders(request: FastifyRequest, reply: FastifyReply) {
    const query = adminOrdersQuerySchema.parse(request.query);
    const data = await PaymentService.getAdminOrders(query);
    return reply.status(200).send({ success: true, data });
  }
}

