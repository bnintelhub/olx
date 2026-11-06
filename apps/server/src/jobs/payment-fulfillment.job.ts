import { Queue } from 'bullmq';
import { env } from '../config/env';

export interface PaymentFulfillmentJobData {
  paymentOrderId: string;
  merchantTransactionId: string;
  userId: string;
  listingId?: string;
  purpose: string;
  productId: string;
  amount: number;
}

const connection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
};

// Queue for asynchronous, idempotent payment fulfillment
export const paymentFulfillmentQueue = new Queue<PaymentFulfillmentJobData>('payment-fulfillment', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000, // 3s, 6s, 12s, 24s, 48s backoff
    },
    removeOnComplete: {
      count: 1000,
      age: 7 * 24 * 3600, // Keep telemetry for 7 days
    },
    removeOnFail: false,
  },
});

export async function queuePaymentFulfillmentJob(data: PaymentFulfillmentJobData): Promise<void> {
  // Use paymentOrderId as job ID to guarantee idempotency in Redis queue
  await paymentFulfillmentQueue.add('fulfill-payment', data, {
    jobId: `fulfill_${data.paymentOrderId}`,
  });
}

