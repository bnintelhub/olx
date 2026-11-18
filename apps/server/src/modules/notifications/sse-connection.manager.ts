import { SSEReplyInterface } from '@fastify/sse';
import { redis } from '../../config/redis';

export interface SSEConnection {
  connectionId: string;
  userId: string;
  role: string;
  reply: SSEReplyInterface;
  connectedAt: Date;
}

export interface SSENotificationEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  unreadCount?: number;
  createdAt: string;
}

class SSEConnectionManager {
  // Local active connections grouped by userId: Map<userId, Map<connectionId, SSEConnection>>
  private connections = new Map<string, Map<string, SSEConnection>>();

  /**
   * Registers a new active SSE stream connection for a user.
   * Supports multiple concurrent browser tabs/devices per user.
   */
  register(
    userId: string,
    role: string,
    reply: SSEReplyInterface,
    connectionId: string = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  ): () => void {
    let userConns = this.connections.get(userId);
    if (!userConns) {
      userConns = new Map<string, SSEConnection>();
      this.connections.set(userId, userConns);
    }

    const connection: SSEConnection = {
      connectionId,
      userId,
      role,
      reply,
      connectedAt: new Date(),
    };

    userConns.set(connectionId, connection);

    // Update Redis presence key for multi-instance / cluster awareness
    void this.syncRedisPresence(userId);

    // Cleanup hook when connection closes or client disconnects
    const cleanup = () => {
      this.unregister(userId, connectionId);
    };

    reply.onClose(cleanup);
    return cleanup;
  }

  /**
   * Unregisters a closed SSE stream.
   */
  unregister(userId: string, connectionId: string): void {
    const userConns = this.connections.get(userId);
    if (!userConns) return;

    userConns.delete(connectionId);
    if (userConns.size === 0) {
      this.connections.delete(userId);
    }

    void this.syncRedisPresence(userId);
  }

  /**
   * Checks whether the user has at least one active, connected SSE stream.
   * Does NOT rely solely on database flags.
   */
  isUserConnected(userId: string): boolean {
    const userConns = this.connections.get(userId);
    if (!userConns || userConns.size === 0) {
      return false;
    }

    // Verify at least one connection is genuinely alive
    for (const conn of userConns.values()) {
      if (conn.reply.isConnected) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns total count of active SSE connections for a user across tabs.
   */
  getUserConnectionCount(userId: string): number {
    const userConns = this.connections.get(userId);
    if (!userConns) return 0;
    let active = 0;
    for (const conn of userConns.values()) {
      if (conn.reply.isConnected) active++;
    }
    return active;
  }

  /**
   * Sends an SSE event to all active connections/tabs of a specific user.
   * Returns true if successfully delivered to at least one active connection.
   */
  async sendToUser(userId: string, eventName: string, data: any): Promise<boolean> {
    const userConns = this.connections.get(userId);
    if (!userConns || userConns.size === 0) {
      return false;
    }

    const payload = {
      id: data.id || `${Date.now()}`,
      event: eventName,
      data,
    };

    let delivered = false;
    const staleConnectionIds: string[] = [];

    for (const [connId, conn] of userConns.entries()) {
      try {
        if (conn.reply.isConnected) {
          await conn.reply.send(payload);
          delivered = true;
        } else {
          staleConnectionIds.push(connId);
        }
      } catch (err) {
        staleConnectionIds.push(connId);
      }
    }

    // Evict any connections that failed during transmission
    for (const connId of staleConnectionIds) {
      this.unregister(userId, connId);
    }

    return delivered;
  }

  /**
   * Broadcasts an SSE event to all connected staff members matching specified roles.
   * Used for real-time Support Desk & Admin alerts (SSE only).
   */
  async broadcastToRole(targetRoles: string[], eventName: string, data: any): Promise<number> {
    let sentCount = 0;
    const roleSet = new Set(targetRoles.map((r) => String(r).toUpperCase()));

    for (const [userId, userConns] of this.connections.entries()) {
      for (const [connId, conn] of userConns.entries()) {
        const roleUpper = conn.role ? String(conn.role).toUpperCase() : '';
        // Deliver to target staff roles, and always deliver to SUPER_ADMIN
        if ((roleSet.has(roleUpper) || roleUpper === 'SUPER_ADMIN') && conn.reply.isConnected) {
          try {
            await conn.reply.send({
              id: data.id || `${Date.now()}`,
              event: eventName,
              data,
            });
            sentCount++;
          } catch {
            this.unregister(userId, connId);
          }
        }
      }
    }

    return sentCount;
  }

  /**
   * Synchronizes active connection presence to Redis with TTL.
   */
  private async syncRedisPresence(userId: string): Promise<void> {
    try {
      const activeCount = this.getUserConnectionCount(userId);
      const redisKey = `sse:active:${userId}`;

      if (activeCount > 0) {
        await redis.set(redisKey, String(activeCount), 'EX', 120);
      } else {
        await redis.del(redisKey);
      }
    } catch {
      // Graceful fallback if Redis is temporarily unreachable
    }
  }

  /**
   * Total active connections across all users (for metrics & tests).
   */
  getTotalActiveConnections(): number {
    let total = 0;
    for (const conns of this.connections.values()) {
      total += conns.size;
    }
    return total;
  }

  /**
   * Reset all memory connections (primarily for testing harnesses).
   */
  clearAll(): void {
    this.connections.clear();
  }
}

export const sseConnectionManager = new SSEConnectionManager();
