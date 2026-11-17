import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AdminService } from '../admin/admin.service';
import { RevenueAnalyticsService } from '../payments/services/revenue.analytics.service';
import { authorizeRoles } from '../../plugins/auth.plugin';
import { UserRole } from '@prisma/client';

const staffRoles = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MODERATOR,
  UserRole.CUSTOMER_SUPPORT,
  UserRole.FINANCE_ADMIN,
  UserRole.CONTENT_MANAGER,
  UserRole.ANALYST,
];

function writeEvent(reply: FastifyReply, event: string, data: unknown, id?: string) {
  // SSE requires one `data:` line followed by two newlines to complete an event.
  const payload = [`event: ${event}`, id ? `id: ${id}` : '', `data: ${JSON.stringify(data)}`, '', '']
    .filter(Boolean)
    .join('\n');
  reply.raw.write(payload);
}

export async function eventsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/stream',
    {
      preHandler: [fastify.authenticate, authorizeRoles(...staffRoles)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { role?: string };
      // Only Super Admin/Admin may request a simulated dashboard role.
      // Other staff must always receive data for their own role.
      const canSimulateRole = request.user!.role === UserRole.SUPER_ADMIN || request.user!.role === UserRole.ADMIN;
      const role = canSimulateRole && query.role ? query.role : request.user!.role;
      const streamId = `${Date.now()}`;
      let closed = false;

      // Hijacking lets Fastify leave this HTTP response open while events stream.
      reply.hijack();
      reply.raw.statusCode = 200;
      reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      reply.raw.setHeader('Connection', 'keep-alive');
      // Nginx must forward each event immediately instead of buffering the stream.
      reply.raw.setHeader('X-Accel-Buffering', 'no');
      reply.raw.flushHeaders?.();

      const sendDashboard = async () => {
        try {
          // Each replica refreshes from the database, so SSE also works behind
          // Nginx load balancing without depending on in-memory socket rooms.
          const stats = await AdminService.getStats(role);
          if (!closed) {
            writeEvent(reply, 'dashboard_stats', stats, streamId);
            writeEvent(reply, 'reports_update', {
              openReports: stats.openReports ?? 0,
              emittedAt: new Date().toISOString(),
            });
            const metrics = await RevenueAnalyticsService.getRealtimeMetrics();
            writeEvent(reply, 'metrics_update', metrics);
          }
        } catch (error) {
          request.log.warn({ error }, 'SSE dashboard update failed');
        }
      };

      const heartbeat = setInterval(() => {
        // Heartbeats keep idle proxies and browsers from closing the connection.
        if (!closed) reply.raw.write(': heartbeat\n\n');
      }, 15000);
      // A periodic snapshot makes dashboard, report and revenue metrics self-healing.
      const dashboardUpdates = setInterval(sendDashboard, 6000);

      request.raw.on('close', () => {
        closed = true;
        // Always stop timers when the browser navigates away to prevent leaks.
        clearInterval(heartbeat);
        clearInterval(dashboardUpdates);
      });

      // EventSource automatically reconnects after a network interruption.
      writeEvent(reply, 'ready', { stream: 'admin', reconnectAfterMs: 3000 }, streamId);
      await sendDashboard();
    },
  );
}
