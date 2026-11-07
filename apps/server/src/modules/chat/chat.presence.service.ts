import { redis } from '../../config/redis';

// Local memory map for fast socket-to-user resolution
const userSocketsMap = new Map<string, Set<string>>();
const typingThrottleMap = new Map<string, number>();

export class ChatPresenceService {
  // Registers active socket connection for a user
  static async setUserOnline(userId: string, socketId: string): Promise<void> {
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, new Set());
    }
    userSocketsMap.get(userId)!.add(socketId);

    try {
      if (redis.status === 'ready' || redis.status === 'connect') {
        await redis.set(`presence:user:${userId}`, '1', 'EX', 60);
      }
    } catch {
      // ignore redis offline
    }
  }

  // Removes socket connection and updates presence when all sockets disconnect
  static async setUserOffline(userId: string, socketId: string): Promise<boolean> {
    const userSockets = userSocketsMap.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        userSocketsMap.delete(userId);
        try {
          if (redis.status === 'ready' || redis.status === 'connect') {
            await redis.del(`presence:user:${userId}`);
          }
        } catch {
          // ignore
        }
        return true; // Completely offline
      }
    }
    return false; // Still online on another device
  }

  // Refreshes presence heartbeat TTL
  static async touchPresence(userId: string): Promise<void> {
    try {
      if (redis.status === 'ready' || redis.status === 'connect') {
        await redis.set(`presence:user:${userId}`, '1', 'EX', 60);
      }
    } catch {
      // ignore
    }
  }

  // Checks if a user is currently online
  static async isUserOnline(userId: string): Promise<boolean> {
    if (userSocketsMap.has(userId) && (userSocketsMap.get(userId)?.size ?? 0) > 0) {
      return true;
    }
    try {
      if (redis.status === 'ready' || redis.status === 'connect') {
        const val = await redis.get(`presence:user:${userId}`);
        return val === '1';
      }
    } catch {
      // ignore
    }
    return false;
  }

  // Batch query online statuses for an array of user IDs
  static async getOnlineStatusBatch(userIds: string[]): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    for (const uid of userIds) {
      result[uid] = false;
    }

    // 1. Check local memory map first
    for (const uid of userIds) {
      if (userSocketsMap.has(uid) && (userSocketsMap.get(uid)?.size ?? 0) > 0) {
        result[uid] = true;
      }
    }

    // 2. Query Redis for any remaining users
    const missingUids = userIds.filter((uid) => !result[uid]);
    if (missingUids.length > 0) {
      try {
        if (redis.status === 'ready' || redis.status === 'connect') {
          const pipeline = redis.pipeline();
          for (const uid of missingUids) {
            pipeline.get(`presence:user:${uid}`);
          }
          const replies = await pipeline.exec();
          if (replies) {
            replies.forEach(([err, val], idx) => {
              if (!err && val === '1') {
                result[missingUids[idx]] = true;
              }
            });
          }
        }
      } catch {
        // ignore
      }
    }

    return result;
  }

  // Throttles typing indicators (max 1 typing event per 3 seconds per conversation)
  static shouldThrottleTyping(userId: string, conversationId: string): boolean {
    const key = `${userId}:${conversationId}`;
    const now = Date.now();
    const lastSent = typingThrottleMap.get(key) || 0;
    if (now - lastSent < 3000) {
      return true;
    }
    typingThrottleMap.set(key, now);
    return false;
  }

  // Get active socket IDs for a user (for direct socket emission across multi-devices)
  static getUserSockets(userId: string): string[] {
    const sockets = userSocketsMap.get(userId);
    return sockets ? Array.from(sockets) : [];
  }
}
