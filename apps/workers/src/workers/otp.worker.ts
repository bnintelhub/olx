import { Worker, Job } from 'bullmq';
import { env } from '../config/env';

export interface OtpJobData {
  to: string;
  otp: string;
  purpose: string;
}

export function startOtpWorker() {
  const connection = {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null,
  };

  const worker = new Worker<OtpJobData>(
    'otp-dispatch',
    async (job: Job<OtpJobData>) => {
      const { to, otp, purpose } = job.data;
      console.log(`[Worker - otp-dispatch] Processing job #${job.id} for: ${to} (${purpose})`);

      // Mock email delivery or integrate external provider
      console.log(`\n======================================================`);
      console.log(`📧 [WORKER EMAIL DISPATCH]`);
      console.log(`To: ${to}`);
      console.log(`Purpose: ${purpose}`);
      console.log(`Code: ${otp}`);
      console.log(`======================================================\n`);
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker - otp-dispatch] Job #${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker - otp-dispatch] Job #${job?.id} failed with error:`, err.message);
  });

  return worker;
}

