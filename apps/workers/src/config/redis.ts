import Redis from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redisClient.on('error', (err) => {
      console.warn('[Workers Redis] Error:', err.message);
    });
  }

  return redisClient;
}

export const redis = getRedisClient();
