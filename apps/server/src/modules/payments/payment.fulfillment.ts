import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { getCatalogProduct } from './payment.catalog';
import { PaymentStatus, PaymentPurpose } from './payment.types';
import { writeAuditLog } from '../../shared/utils/audit.util';
import { BoostStatus, BoostType } from '@prisma/client';

export class PaymentFulfillmentService {
  // Idempotently fulfills the purchased product/service for a verified successful payment
  static async fulfillOrder(paymentOrderId: string): Promise<{ isFulfilled: boolean; message: string }> {
    const order = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: { listing: true, user: true },
    });

    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', `Payment order ${paymentOrderId} not found`);
    }

    if (order.status !== PaymentStatus.SUCCESS) {
      throw new AppError(
        400,
        'ORDER_NOT_PAID',
        `Cannot fulfill order in "${order.status}" status. Payment must be SUCCESS.`
      );
    }

    const metadata = (order.metadata as Record<string, any>) || {};

    // Idempotency: Return immediately if already fulfilled
    if (metadata.fulfillmentStatus === 'FULFILLED') {
      return {
        isFulfilled: true,
        message: 'Order was already fulfilled.',
      };
    }

    const product = getCatalogProduct(order.productId);

    // Business action fulfillment by purpose
    await prisma.$transaction(async (tx) => {
      if (
        order.purpose === PaymentPurpose.LISTING_BOOST ||
        order.purpose === PaymentPurpose.FEATURED_LISTING ||
        order.purpose === PaymentPurpose.TOP_LISTING
      ) {
        if (!order.listingId) {
          throw new AppError(400, 'LISTING_REQUIRED', 'Listing ID is required for ad promotion products');
        }

        const boostType: BoostType = (product.boostType as BoostType) || BoostType.FEATURED;
        const endsAt = new Date(Date.now() + product.durationDays * 24 * 3600 * 1000);

        // Create active promotion boost
        await tx.featuredAd.create({
          data: {
            adId: order.listingId,
            type: boostType,
            status: BoostStatus.ACTIVE,
            startsAt: new Date(),
            endsAt,
          },
        });

        // Touch the ad to refresh ranking
        await tx.ad.update({
          where: { id: order.listingId },
          data: { renewedAt: new Date() },
        });
      }

      // Mark order metadata as fulfilled atomically
      const updatedMetadata = {
        ...metadata,
        fulfillmentStatus: 'FULFILLED',
        fulfilledAt: new Date().toISOString(),
        productName: product.name,
      };

      await tx.paymentOrder.update({
        where: { id: order.id },
        data: { metadata: updatedMetadata },
      });
    });

    await writeAuditLog({
      userId: order.userId,
      action: 'PAYMENT_FULFILLED',
      entityType: 'PAYMENT_ORDER',
      entityId: order.id,
      status: 'SUCCESS',
      newData: {
        paymentOrderId: order.id,
        purpose: order.purpose,
        productId: order.productId,
        listingId: order.listingId,
      },
    });

    return {
      isFulfilled: true,
      message: `Product "${product.name}" successfully activated.`,
    };
  }
}

