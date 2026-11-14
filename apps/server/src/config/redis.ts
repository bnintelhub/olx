import Redis from 'ioredis';
import { env } from './env';

const isTls = env.REDIS_URL.startsWith('rediss://');

export const redis = new Redis(env.REDIS_URL, {
  tls: isTls ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) {
      return null; // Stop retrying after 5 attempts to avoid flooding
    }
    return Math.min(times * 100, 2000);
  },
  lazyConnect: true,
  keepAlive: 10000,
  enableReadyCheck: false,
});

let isConnected = false;

redis.on('connect', () => {
  isConnected = true;
  console.log('Redis connected successfully');
});

redis.on('error', (err) => {
  isConnected = false;
  console.warn('Redis error (falling back gracefully):', err.message);
});

redis.on('close', () => {
  isConnected = false;
});

export async function initRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (err: any) {
    console.warn('Could not establish initial Redis connection:', err.message);
  }
}

export async function isRedisHealthy(): Promise<boolean> {
  if (!isConnected) return false;
  try {
    const res = await redis.ping();
    return res === 'PONG';
  } catch {
    return false;
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!isConnected) return null;
  try {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!isConnected) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Ignore cache write errors
  }
}

export async function delCache(...keys: string[]): Promise<void> {
  if (!isConnected || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // Ignore cache delete errors
  }
}

export function getRedisBullConnection() {
  try {
    let rawUrl = (env.REDIS_URL || '').trim();
    rawUrl = rawUrl.replace(/^REDIS_URL\s*=\s*/i, '').replace(/^['"]|['"]$/g, '');
    const parsed = new URL(rawUrl);
    const isTls = parsed.protocol === 'rediss:';

    return {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port ? Number(parsed.port) : 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: null,
      keepAlive: 10000,
      enableReadyCheck: false,
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}
