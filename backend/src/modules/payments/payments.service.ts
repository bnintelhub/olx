import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { PaymentGatewayService } from '../../integrations/payment-gateway/razorpay.service';
import { BoostStatus, BoostType } from '@prisma/client';

export class PaymentsService {
  private static calculatePrice(boostType: BoostType, durationDays: number): number {
    const baseRates: Record<BoostType, number> = {
      FEATURED: 199,
      URGENT: 99,
      HOME_SPOTLIGHT: 299,
    };
    return (baseRates[boostType] || 99) * durationDays * 100; // in paise
  }

  static async createBoostOrder(userId: string, adId: string, boostType: BoostType, durationDays: number) {
    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');

    const amount = this.calculatePrice(boostType, durationDays);

    const order = await PaymentGatewayService.createOrder({
      amount,
      receipt: `rcpt_${adId.slice(0, 8)}`,
      notes: { adId, userId, boostType, durationDays: String(durationDays) },
    });

    return {
      order,
      amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    };
  }

  static async verifyAndApplyBoost(userId: string, data: {
    adId: string;
    boostType: BoostType;
    durationDays: number;
    paymentId: string;
  }) {
    const ad = await prisma.ad.findUnique({ where: { id: data.adId } });
    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');

    const endsAt = new Date(Date.now() + data.durationDays * 24 * 60 * 60 * 1000);

    return prisma.featuredAd.create({
      data: {
        adId: data.adId,
        type: data.boostType,
        status: BoostStatus.ACTIVE,
        startsAt: new Date(),
        endsAt,
      },
    });
  }
}
