import './config/env';
import Redis from 'ioredis';
import { getRedisBullConnection } from './config/env';
import { startOtpWorker } from './workers/otp.worker';
import { startMediaWorker } from './workers/media.worker';
import { startPaymentFulfillmentWorker } from './workers/payment-fulfillment.worker';
import { startPushWorker } from './workers/push.worker';
import { startStorageHousekeeping } from './tasks/cleanup.task';

async function bootstrap() {
  console.log('🚀 Starting OLX Monorepo Background Workers...');

  const otpWorker = startOtpWorker();
  const mediaWorker = startMediaWorker();
  const paymentWorker = startPaymentFulfillmentWorker();
  const pushWorker = startPushWorker();
  const housekeeping = startStorageHousekeeping();

  // Active Realtime Worker Heartbeat in Redis (TTL: 15s, sent every 5s)
  const redisConnection = getRedisBullConnection();
  const heartbeatRedis = new Redis(redisConnection);
  const HEARTBEAT_KEY = 'worker:heartbeat:active';
  const HEARTBEAT_INTERVAL_MS = 5000;
  const HEARTBEAT_TTL_SEC = 15;

  const sendHeartbeat = async () => {
    try {
      await heartbeatRedis.set(
        HEARTBEAT_KEY,
        JSON.stringify({
          status: 'healthy',
          timestamp: Date.now(),
          uptimeSeconds: Math.floor(process.uptime()),
        }),
        'EX',
        HEARTBEAT_TTL_SEC
      );
    } catch {
      // Quiet fail if redis temporarily reconnecting
    }
  };

  await sendHeartbeat();
  const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  console.log('✅ BullMQ Workers & Storage Housekeeping are active with live heartbeat.');

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down workers gracefully...`);
    clearInterval(heartbeatTimer);
    await heartbeatRedis.del(HEARTBEAT_KEY).catch(() => {});
    await heartbeatRedis.quit().catch(() => {});
    housekeeping.stop();
    await Promise.all([otpWorker.close(), mediaWorker.close(), paymentWorker.close(), pushWorker.close()]);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal error starting workers:', err);
  process.exit(1);
});
