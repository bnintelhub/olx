import { redis } from '../../config/redis';

// Dual-layer Token Store: Redis with in-memory fallback
class FcmTokenStore {
  private memoryTokens = new Map<string, Set<string>>();
  private memoryTokenToUser = new Map<string, string>();

  private getUserKey(userId: string): string {
    return `fcm:user:${userId}:tokens`;
  }

  private getTokenKey(token: string): string {
    return `fcm:token:${token}`;
  }

  async registerToken(userId: string, token: string, platform = 'web'): Promise<void> {
    if (!userId || !token) return;

    // 1. Update in-memory fallback
    if (!this.memoryTokens.has(userId)) {
      this.memoryTokens.set(userId, new Set());
    }
    this.memoryTokens.get(userId)!.add(token);
    this.memoryTokenToUser.set(token, userId);

    // 2. Update Redis if connected
    try {
      const userKey = this.getUserKey(userId);
      const tokenKey = this.getTokenKey(token);
      await redis.sadd(userKey, token);
      await redis.expire(userKey, 60 * 86400); // 60 days
      await redis.set(tokenKey, JSON.stringify({ userId, platform, updatedAt: new Date().toISOString() }), 'EX', 60 * 86400);
    } catch {
      // Redis is optional; in-memory fallback continues
    }
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    if (!userId || !token) return;

    this.memoryTokens.get(userId)?.delete(token);
    this.memoryTokenToUser.delete(token);

    try {
      await redis.srem(this.getUserKey(userId), token);
      await redis.del(this.getTokenKey(token));
    } catch {
      // Ignored
    }
  }

  async getTokensForUser(userId: string): Promise<string[]> {
    if (!userId) return [];

    try {
      const redisTokens = await redis.smembers(this.getUserKey(userId));
      if (redisTokens && redisTokens.length > 0) {
        // Sync into memory cache
        if (!this.memoryTokens.has(userId)) {
          this.memoryTokens.set(userId, new Set());
        }
        for (const t of redisTokens) this.memoryTokens.get(userId)!.add(t);
        return redisTokens;
      }
    } catch {
      // Fall through to memory
    }

    const memTokens = this.memoryTokens.get(userId);
    return memTokens ? Array.from(memTokens) : [];
  }

  async removeInvalidToken(token: string, userId?: string): Promise<void> {
    const targetUserId = userId || this.memoryTokenToUser.get(token);
    if (targetUserId) {
      await this.unregisterToken(targetUserId, token);
      return;
    }

    this.memoryTokenToUser.delete(token);
    try {
      const raw = await redis.get(this.getTokenKey(token));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.userId) {
          await redis.srem(this.getUserKey(parsed.userId), token);
        }
      }
      await redis.del(this.getTokenKey(token));
    } catch {
      // Ignored
    }
  }
}

export const fcmTokenStore = new FcmTokenStore();

