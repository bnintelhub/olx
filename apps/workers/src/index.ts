import './config/env';
import { startOtpWorker } from './workers/otp.worker';
import { startMediaWorker } from './workers/media.worker';
import { startPaymentFulfillmentWorker } from './workers/payment-fulfillment.worker';
import { startStorageHousekeeping } from './tasks/cleanup.task';

async function bootstrap() {
  console.log('🚀 Starting OLX Monorepo Background Workers...');

  const otpWorker = startOtpWorker();
  const mediaWorker = startMediaWorker();
  const paymentWorker = startPaymentFulfillmentWorker();
  const housekeeping = startStorageHousekeeping();

  console.log('✅ BullMQ Workers & Storage Housekeeping are active.');

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down workers gracefully...`);
    housekeeping.stop();
    await Promise.all([otpWorker.close(), mediaWorker.close(), paymentWorker.close()]);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal error starting workers:', err);
  process.exit(1);
});
