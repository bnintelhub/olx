import { Server as SocketIOServer, Socket } from 'socket.io';
import { RevenueAnalyticsService } from '../payments/services/revenue.analytics.service';

export function setupAdminMetricsSocket(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    socket.on('join_admin_metrics', async () => {
      socket.join('admin_metrics');
      try {
        const metrics = await RevenueAnalyticsService.getRealtimeMetrics();
        socket.emit('admin:metrics_update', metrics);
      } catch (err) {
        console.warn('Failed to emit initial admin metrics:', err);
      }
    });

    socket.on('leave_admin_metrics', () => {
      socket.leave('admin_metrics');
    });
  });

  // Periodic heartbeat broadcast for real-time velocity & growth trajectory
  setInterval(async () => {
    try {
      const room = io.sockets.adapter.rooms.get('admin_metrics');
      if (room && room.size > 0) {
        const metrics = await RevenueAnalyticsService.getRealtimeMetrics();
        io.to('admin_metrics').emit('admin:metrics_update', metrics);
      }
    } catch {
      // Quiet fail in background timer
    }
  }, 10000);
}
