import { Server as SocketIOServer, Socket } from 'socket.io';
import { RevenueAnalyticsService } from '../payments/services/revenue.analytics.service';
import { AdminService } from './admin.service';

let globalIoInstance: SocketIOServer | null = null;

export function setupAdminMetricsSocket(io: SocketIOServer) {
  globalIoInstance = io;

  io.on('connection', (socket: Socket) => {
    // 1. Join Admin Dashboard Room for live overview data
    socket.on('join_admin_dashboard', async (data?: { role?: string }) => {
      socket.join('admin_dashboard');
      try {
        const role = data?.role || 'SUPER_ADMIN';
        const stats = await AdminService.getStats(role);
        socket.emit('admin:dashboard_stats', stats);
      } catch (err) {
        console.warn('Failed to emit initial admin dashboard stats:', err);
      }
    });

    // 2. Leave Admin Dashboard Room
    socket.on('leave_admin_dashboard', () => {
      socket.leave('admin_dashboard');
    });

    // 3. Manual Stats Refresh Request over socket
    socket.on('admin:request_stats', async (data?: { role?: string }) => {
      try {
        const role = data?.role || 'SUPER_ADMIN';
        const stats = await AdminService.getStats(role);
        socket.emit('admin:dashboard_stats', stats);
      } catch (err) {
        console.warn('Failed to refresh admin dashboard stats:', err);
      }
    });

    // 4. Legacy / Secondary Metrics Room
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

  // Periodic heartbeat broadcast for real-time dashboard overview & platform health
  setInterval(async () => {
    try {
      const dashboardRoom = io.sockets.adapter.rooms.get('admin_dashboard');
      if (dashboardRoom && dashboardRoom.size > 0) {
        const stats = await AdminService.getStats('SUPER_ADMIN');
        io.to('admin_dashboard').emit('admin:dashboard_stats', stats);
      }

      const metricsRoom = io.sockets.adapter.rooms.get('admin_metrics');
      if (metricsRoom && metricsRoom.size > 0) {
        const metrics = await RevenueAnalyticsService.getRealtimeMetrics();
        io.to('admin_metrics').emit('admin:metrics_update', metrics);
      }
    } catch {
      // Quiet fail in background timer
    }
  }, 6000);
}

/**
 * Broadcast an instant live update to all connected admin dashboard clients
 */
export async function broadcastAdminDashboardUpdate(role = 'SUPER_ADMIN') {
  if (!globalIoInstance) return;
  try {
    const dashboardRoom = globalIoInstance.sockets.adapter.rooms.get('admin_dashboard');
    if (dashboardRoom && dashboardRoom.size > 0) {
      const stats = await AdminService.getStats(role);
      globalIoInstance.to('admin_dashboard').emit('admin:dashboard_stats', stats);
    }
  } catch (err) {
    console.warn('Failed to broadcast admin dashboard update:', err);
  }
}

