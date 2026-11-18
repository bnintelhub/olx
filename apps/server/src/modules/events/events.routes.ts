import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AdminService } from '../admin/admin.service';
import { RevenueAnalyticsService } from '../payments/services/revenue.analytics.service';
import { authorizeRoles } from '../../plugins/auth.plugin';
import { UserRole } from '@prisma/client';
import { sseConnectionManager } from '../notifications/sse-connection.manager';

const staffRoles = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MODERATOR,
  UserRole.CUSTOMER_SUPPORT,
  UserRole.FINANCE_ADMIN,
  UserRole.CONTENT_MANAGER,
  UserRole.ANALYST,
];

export async function eventsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/stream',
    {
      preHandler: [fastify.authenticate, authorizeRoles(...staffRoles)],
      sse: 'only',
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { role?: string };
      const canSimulateRole =
        request.user!.role === UserRole.SUPER_ADMIN ||
        request.user!.role === UserRole.ADMIN;
      const role =
        canSimulateRole && query.role ? query.role : request.user!.role;
      const streamId = `${Date.now()}`;

      if (request.raw?.socket) {
        request.raw.socket.setTimeout(0);
        request.raw.socket.setNoDelay(true);
        request.raw.socket.setKeepAlive(true);
      }

      reply.sse.keepAlive();

      // Register staff connection in SSE Connection Manager for live alerts
      const cleanupManager = sseConnectionManager.register(
        request.user!.id,
        role,
        reply.sse,
        streamId
      );

      await reply.sse.send({
        id: streamId,
        event: 'ready',
        data: { stream: 'admin', reconnectAfterMs: 3000 },
      });

      const sendDashboard = async () => {
        try {
          if (!reply.sse.isConnected) return;

          const stats = await AdminService.getStats(role);
          if (!reply.sse.isConnected) return;

          await reply.sse.send({
            id: streamId,
            event: 'dashboard_stats',
            data: stats,
          });
          await reply.sse.send({
            id: streamId,
            event: 'reports_update',
            data: {
              openReports: stats.openReports ?? 0,
              emittedAt: new Date().toISOString(),
            },
          });

          const metrics =
            await RevenueAnalyticsService.getRealtimeMetrics();
          if (reply.sse.isConnected) {
            await reply.sse.send({
              id: streamId,
              event: 'metrics_update',
              data: metrics,
            });
          }
        } catch (error) {
          request.log.warn({ error }, 'SSE dashboard update failed');
        }
      };

      await sendDashboard();

      const dashboardUpdates = setInterval(sendDashboard, 6000);
      reply.sse.onClose(() => {
        clearInterval(dashboardUpdates);
        cleanupManager();
      });
    },
  );
}
