import { Queue, Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { getRedisBullConnection } from '../config/redis';
import { EmailService } from '../integrations/email/email.service';

export interface OtpJobData {
  to: string;
  otp: string;
  purpose: string;
}

const connection = getRedisBullConnection();

export const otpQueue = new Queue<OtpJobData>('otp-dispatch', {
  connection,
  skipVersionCheck: true,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

otpQueue.on('error', (err) => {
  console.warn('[BullMQ OTP Queue] Redis connection warning:', err.message);
});

export const otpWorker = new Worker<OtpJobData>(
  'otp-dispatch',
  async (job: Job<OtpJobData>) => {
    const { to, otp, purpose } = job.data;
    console.log(`[BullMQ Worker] Processing OTP email job #${job.id} for: ${to} (${purpose})`);
    await EmailService.sendOtpEmail(to, otp, purpose);
  },
  { connection, skipVersionCheck: true }
);

otpWorker.on('error', (err) => {
  console.warn('[BullMQ OTP Worker] Redis connection warning:', err.message);
});

otpWorker.on('completed', (job) => {
  console.log(`[BullMQ Worker] Job #${job.id} completed successfully`);
});

otpWorker.on('failed', (job, err) => {
  console.error(`[BullMQ Worker] Job #${job?.id} failed with error:`, err.message);
});

export async function dispatchOtpEmail(data: OtpJobData): Promise<string> {
  const job = await otpQueue.add('send-otp-email', data);
  return job.id || 'job-queued';
}

export async function closeOtpQueue(): Promise<void> {
  await otpWorker.close();
  await otpQueue.close();
}

