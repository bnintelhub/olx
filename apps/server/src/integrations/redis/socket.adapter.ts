import { createAdapter } from '@socket.io/redis-adapter';
import { Server as SocketIOServer } from 'socket.io';
import { redis, isRedisHealthy } from '../../config/redis';
import Redis from 'ioredis';

let pubClient: Redis | null = null;
let subClient: Redis | null = null;

/**
 * Configures the Socket.IO Redis Adapter for multi-instance horizontal scaling
 * and automatic failover across backend server replicas.
 */
export async function setupSocketRedisAdapter(io: SocketIOServer): Promise<boolean> {
  const healthy = await isRedisHealthy();
  if (!healthy && redis.status !== 'ready' && redis.status !== 'connect') {
    console.warn('⚠️ [Socket.IO] Redis is not connected. Falling back to in-memory adapter.');
    return false;
  }

  try {
    pubClient = redis.duplicate();
    subClient = redis.duplicate();

    pubClient.on('error', (err) => {
      console.warn('⚠️ [Socket.IO Redis Pub] Error:', err.message);
    });

    subClient.on('error', (err) => {
      console.warn('⚠️ [Socket.IO Redis Sub] Error:', err.message);
    });

    await Promise.all([
      pubClient.connect().catch((err) => {
        console.warn('⚠️ [Socket.IO Redis Pub] Connect warning:', err.message);
      }),
      subClient.connect().catch((err) => {
        console.warn('⚠️ [Socket.IO Redis Sub] Connect warning:', err.message);
      }),
    ]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ [Socket.IO] Redis Adapter attached (Multi-server clustering enabled)');
    return true;
  } catch (err: any) {
    console.warn('⚠️ [Socket.IO] Could not attach Redis Adapter; using in-memory adapter:', err.message);
    return false;
  }
}

/**
 * Gracefully disconnects Redis adapter pub/sub clients on server shutdown.
 */
export async function closeSocketRedisAdapter(): Promise<void> {
  try {
    if (pubClient) {
      pubClient.disconnect();
      pubClient = null;
    }
    if (subClient) {
      subClient.disconnect();
      subClient = null;
    }
  } catch {
    // Ignore close errors
  }
}

