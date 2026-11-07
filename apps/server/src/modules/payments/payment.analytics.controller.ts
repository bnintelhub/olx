import { FastifyReply, FastifyRequest } from 'fastify';
import { RevenueAnalyticsService } from './services/revenue.analytics.service';
import { PaymentExportService } from './services/payment.export.service';

export class PaymentAnalyticsController {
  // GET /api/v1/payments/admin/analytics/overview
  static async getOverview(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query as any) || {};
    const data = await RevenueAnalyticsService.getOverview(query.period, query.from, query.to);
    return reply.status(200).send({ success: true, data });
  }

  // GET /api/v1/payments/admin/analytics/trend
  static async getTrend(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query as any) || {};
    const data = await RevenueAnalyticsService.getRevenueTrend(query.range, query.metric, query.from, query.to);
    return reply.status(200).send({ success: true, data });
  }

  // GET /api/v1/payments/admin/analytics/breakdown
  static async getBreakdown(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query as any) || {};
    const data = await RevenueAnalyticsService.getRevenueBreakdown(query.period, query.from, query.to);
    return reply.status(200).send({ success: true, data });
  }

  // GET /api/v1/payments/admin/analytics/refunds
  static async getRefunds(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query as any) || {};
    const data = await RevenueAnalyticsService.getRefundAnalytics(query.period, query.from, query.to);
    return reply.status(200).send({ success: true, data });
  }

  // GET /api/v1/payments/admin/analytics/performance
  static async getPerformance(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query as any) || {};
    const data = await RevenueAnalyticsService.getPaymentPerformance(query.period, query.from, query.to);
    return reply.status(200).send({ success: true, data });
  }

  // GET /api/v1/payments/admin/analytics/realtime
  static async getRealtime(request: FastifyRequest, reply: FastifyReply) {
    const data = await RevenueAnalyticsService.getRealtimeMetrics();
    return reply.status(200).send({ success: true, data });
  }

  // GET /api/v1/payments/admin/export
  static async exportPayments(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query as any) || {};
    const csv = await PaymentExportService.exportToCsv(query);
    const filename = `bharatmarket-payments-${new Date().toISOString().slice(0, 10)}.csv`;

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .status(200)
      .send(csv);
  }
}
