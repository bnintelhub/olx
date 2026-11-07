import { FastifyInstance } from 'fastify';
import { PaymentController } from './payment.controller';
import { PaymentAnalyticsController } from './payment.analytics.controller';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';

export async function paymentRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  // 1. Authenticated User Payment Endpoints
  fastify.post('/orders', auth, PaymentController.createOrder);
  fastify.get('/orders/:id', auth, PaymentController.getOrder);
  fastify.post('/:id/verify', auth, PaymentController.verifyPayment);

  // Backward-compatible alias endpoints
  fastify.post('/create-order', auth, PaymentController.createOrder);
  fastify.post('/verify', auth, PaymentController.verifyPayment);

  // 2. PayU Hosted Checkout SURL / FURL Callbacks (Public form-post from user browser)
  fastify.post('/payu/success', PaymentController.payuSuccess);
  fastify.post('/payu/failure', PaymentController.payuFailure);

  // 3. PayU Server Webhook (Public server-to-server with cryptographic signature validation)
  fastify.post('/webhooks/payu', PaymentController.payuWebhook);

  // 4. Finance Admin & Refund Endpoints (Restricted to Finance Admin / Super Admin)
  fastify.post(
    '/:id/refund',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.PAYMENTS_REFUND)] },
    PaymentController.refundPayment
  );
  fastify.post(
    '/admin/refund',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.PAYMENTS_REFUND)] },
    PaymentController.refundPayment
  );
  fastify.get(
    '/admin/overview',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.PAYMENTS_READ, Permissions.REVENUE_READ)] },
    PaymentController.getOverview
  );
  fastify.get(
    '/admin/orders',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.PAYMENTS_READ, Permissions.REVENUE_READ)] },
    PaymentController.getAdminOrders
  );

  // 5. Complete Financial Analytics & Export Suite
  const analyticsAuth = {
    preHandler: [fastify.authenticate, requirePermission(Permissions.PAYMENTS_READ, Permissions.REVENUE_READ)],
  };
  fastify.get('/admin/analytics/overview', analyticsAuth, PaymentAnalyticsController.getOverview);
  fastify.get('/admin/analytics/trend', analyticsAuth, PaymentAnalyticsController.getTrend);
  fastify.get('/admin/analytics/breakdown', analyticsAuth, PaymentAnalyticsController.getBreakdown);
  fastify.get('/admin/analytics/refunds', analyticsAuth, PaymentAnalyticsController.getRefunds);
  fastify.get('/admin/analytics/performance', analyticsAuth, PaymentAnalyticsController.getPerformance);
  fastify.get('/admin/analytics/realtime', analyticsAuth, PaymentAnalyticsController.getRealtime);
  fastify.get('/admin/export', analyticsAuth, PaymentAnalyticsController.exportPayments);
}

