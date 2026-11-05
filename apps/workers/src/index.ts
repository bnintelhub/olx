import { startOtpWorker } from './workers/otp.worker';
import { startMediaWorker } from './workers/media.worker';

async function bootstrap() {
  console.log('🚀 Starting OLX Monorepo Background Workers...');

  const otpWorker = startOtpWorker();
  const mediaWorker = startMediaWorker();

  console.log('✅ BullMQ Workers are active and listening for background jobs.');

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down workers gracefully...`);
    await Promise.all([otpWorker.close(), mediaWorker.close()]);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal error starting workers:', err);
  process.exit(1);
});

