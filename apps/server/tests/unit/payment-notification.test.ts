import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentNotificationService } from '../../src/modules/payments/payment-notification.service';
import { sseConnectionManager } from '../../src/modules/notifications/sse-connection.manager';
import { prisma } from '../../src/config/prisma';
import { redis } from '../../src/config/redis';
import { UserRole } from '@prisma/client';

vi.mock('../../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
  },
}));

vi.mock('../../src/config/redis', () => ({
  redis: {
    set: vi.fn(),
  },
}));

describe('PaymentNotificationService — Real-Time Admin SSE & DB Delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sseConnectionManager as any).connections.clear();
  });

  it('notifies active authorized staff and persists DB notification on successful payment', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK' as any);

    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
      { id: 'admin-1', role: UserRole.ADMIN },
      { id: 'finance-1', role: UserRole.FINANCE_ADMIN },
    ] as any);

    const sendToUserSpy = vi.spyOn(sseConnectionManager, 'sendToUser').mockResolvedValue(true);

    await PaymentNotificationService.notifyPaymentSuccess({
      orderId: 'payord_101',
      merchantTransactionId: 'OLX_20261119_1234',
      amount: 499,
      currency: 'INR',
      userId: 'user-payer-1',
      payerName: 'John Doe',
      payerEmail: 'john@example.com',
      purpose: 'FEATURED_LISTING',
      paymentMethod: 'UPI',
    });

    // Check DB persistence call
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'admin-1',
          title: 'Payment Received — ₹499',
          body: expect.stringContaining('Received ₹499 from John Doe'),
        }),
        expect.objectContaining({
          userId: 'finance-1',
          title: 'Payment Received — ₹499',
        }),
      ]),
    });

    // Check SSE transmission to each authorized staff member
    expect(sendToUserSpy).toHaveBeenCalledWith(
      'admin-1',
      'payment_received',
      expect.objectContaining({
        id: 'pay_evt_payord_101_SUCCESS',
        type: 'payment_received',
        title: 'Payment Received — ₹499',
      })
    );
    expect(sendToUserSpy).toHaveBeenCalledWith(
      'finance-1',
      'payment_received',
      expect.objectContaining({
        id: 'pay_evt_payord_101_SUCCESS',
      })
    );
  });

  it('enforces idempotency: ignores duplicate webhook notifications when Redis key exists', async () => {
    // Redis returns null indicating key was already set
    vi.mocked(redis.set).mockResolvedValueOnce(null as any);
    const sendToUserSpy = vi.spyOn(sseConnectionManager, 'sendToUser');

    await PaymentNotificationService.notifyPaymentSuccess({
      orderId: 'payord_101',
      merchantTransactionId: 'OLX_20261119_1234',
      amount: 499,
      currency: 'INR',
      userId: 'user-payer-1',
      purpose: 'FEATURED_LISTING',
    });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(sendToUserSpy).not.toHaveBeenCalled();
  });

  it('delivers refund event to authorized staff and saves to DB', async () => {
    vi.mocked(redis.set).mockResolvedValueOnce('OK' as any);

    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
      { id: 'admin-1', role: UserRole.ADMIN },
    ] as any);

    const sendToUserSpy = vi.spyOn(sseConnectionManager, 'sendToUser').mockResolvedValue(true);

    await PaymentNotificationService.notifyPaymentRefund({
      orderId: 'payord_101',
      merchantTransactionId: 'OLX_20261119_1234',
      refundedAmount: 499,
      currency: 'INR',
      reason: 'User requested cancellation',
    });

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'admin-1',
          title: 'Payment Refunded — ₹499',
          body: expect.stringContaining('User requested cancellation'),
        }),
      ]),
    });

    expect(sendToUserSpy).toHaveBeenCalledWith(
      'admin-1',
      'payment_refund',
      expect.objectContaining({
        id: 'pay_evt_payord_101_REFUND',
        type: 'payment_refund',
      })
    );
  });
});
