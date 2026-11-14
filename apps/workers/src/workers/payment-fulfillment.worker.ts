import { Worker, Job } from 'bullmq';
import { env, getRedisBullConnection } from '../config/env';
import { prisma, BoostStatus, BoostType } from '@olx/database';

export interface PaymentFulfillmentJobData {
  paymentOrderId: string;
  merchantTransactionId: string;
  userId: string;
  listingId?: string;
  purpose: string;
  productId: string;
  amount: number;
}

// Durable background worker to fulfill verified payments asynchronously
export function startPaymentFulfillmentWorker(): Worker<PaymentFulfillmentJobData> {
  const connection = getRedisBullConnection();

  const worker = new Worker<PaymentFulfillmentJobData>(
    'payment-fulfillment',
    async (job: Job<PaymentFulfillmentJobData>) => {
      const { paymentOrderId, listingId, purpose, productId } = job.data;
      console.log(`[FulfillmentWorker] Processing payment fulfillment for order ${paymentOrderId}...`);

      // Retrieve order and verify existence
      const order = await prisma.paymentOrder.findUnique({
        where: { id: paymentOrderId },
      });

      if (!order) {
        throw new Error(`Payment order ${paymentOrderId} not found`);
      }

      if (order.status !== 'SUCCESS') {
        console.warn(`[FulfillmentWorker] Order ${paymentOrderId} status is "${order.status}". Skipping fulfillment.`);
        return { skipped: true, status: order.status };
      }

      const metadata = (order.metadata as Record<string, any>) || {};

      // Idempotency: skip if already fulfilled
      if (metadata.fulfillmentStatus === 'FULFILLED') {
        console.log(`[FulfillmentWorker] Order ${paymentOrderId} already fulfilled. Skipping.`);
        return { alreadyFulfilled: true };
      }

      // Calculate duration days based on product ID
      let durationDays = 7;
      if (productId.includes('3_days')) durationDays = 3;
      if (productId.includes('14_days')) durationDays = 14;
      if (productId.includes('30_days') || productId.includes('monthly')) durationDays = 30;

      let boostType: BoostType = BoostType.FEATURED;
      if (purpose === 'TOP_LISTING') boostType = BoostType.HOME_SPOTLIGHT;
      if (purpose === 'LISTING_BOOST') boostType = BoostType.URGENT;

      await prisma.$transaction(async (tx) => {
        if (listingId && (purpose === 'LISTING_BOOST' || purpose === 'FEATURED_LISTING' || purpose === 'TOP_LISTING')) {
          const endsAt = new Date(Date.now() + durationDays * 24 * 3600 * 1000);

          await tx.featuredAd.create({
            data: {
              adId: listingId,
              type: boostType,
              status: BoostStatus.ACTIVE,
              startsAt: new Date(),
              endsAt,
            },
          });

          await tx.ad.update({
            where: { id: listingId },
            data: { renewedAt: new Date() },
          });
        }

        await tx.paymentOrder.update({
          where: { id: paymentOrderId },
          data: {
            metadata: {
              ...metadata,
              fulfillmentStatus: 'FULFILLED',
              fulfilledAt: new Date().toISOString(),
            },
          },
        });
      });

      console.log(`[FulfillmentWorker] Order ${paymentOrderId} successfully fulfilled!`);
      return { success: true, paymentOrderId };
    },
    {
      connection,
      concurrency: 5,
      skipVersionCheck: true,
    }
  );

  worker.on('error', (err) => {
    console.warn('[FulfillmentWorker] Redis connection warning:', err.message);
  });

  worker.on('failed', (job, err) => {
    console.error(`[FulfillmentWorker] Job ${job?.id} failed with error:`, err);
  });

  return worker;
}
