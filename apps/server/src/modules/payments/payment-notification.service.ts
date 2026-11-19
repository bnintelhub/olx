import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { sseConnectionManager } from '../notifications/sse-connection.manager';
import { NotificationType, UserRole } from '@prisma/client';

export interface PaymentNotificationParams {
  orderId: string;
  merchantTransactionId: string;
  amount: number;
  currency: string;
  userId: string;
  payerName?: string;
  payerEmail?: string;
  purpose: string;
  providerTransactionId?: string;
  paymentMethod?: string;
}

export interface RefundNotificationParams {
  orderId: string;
  merchantTransactionId: string;
  refundedAmount: number;
  currency: string;
  reason?: string;
  adminUserId?: string;
}

const AUTHORIZED_STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.FINANCE_ADMIN,
];

export class PaymentNotificationService {
  // Delivers real-time payment notification to active admin/finance staff and persists to DB
  static async notifyPaymentSuccess(params: PaymentNotificationParams): Promise<void> {
    const { orderId, merchantTransactionId, amount, currency, userId, purpose } = params;

    // Idempotency: avoid sending duplicate notifications for the same payment order
    const redisKey = `payment:notified:${orderId}:SUCCESS`;
    try {
      const acquired = await redis.set(redisKey, '1', 'EX', 86400, 'NX');
      if (!acquired) {
        return;
      }
    } catch {
      // Continue gracefully if Redis is temporarily unreachable
    }

    // Resolve payer display name from DB if not already provided
    let payerName = params.payerName;
    let payerEmail = params.payerEmail;
    if (!payerName && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, profile: { select: { name: true } } },
      });
      payerName = user?.profile?.name || user?.email?.split('@')[0] || 'User';
      payerEmail = user?.email || undefined;
    }

    // Query active staff members with authorized roles from DB
    // Querying fresh roles from DB immediately revokes access if an admin's role changed
    const authorizedStaff = await prisma.user.findMany({
      where: {
        role: { in: AUTHORIZED_STAFF_ROLES },
        status: 'ACTIVE',
      },
      select: { id: true, role: true },
    });

    if (authorizedStaff.length === 0) {
      return;
    }

    const eventId = `pay_evt_${orderId}_SUCCESS`;
    const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
    const cleanPurpose = purpose.replace(/_/g, ' ').toLowerCase();
    const title = `Payment Received — ${formattedAmount}`;
    const message = `Received ${formattedAmount} from ${payerName || 'User'} for ${cleanPurpose}.`;

    const eventData = {
      id: eventId,
      orderId,
      txnId: merchantTransactionId,
      providerTransactionId: params.providerTransactionId,
      amount,
      currency,
      userId,
      payerName: payerName || 'User',
      payerEmail,
      purpose,
      paymentMethod: params.paymentMethod,
      clickUrl: `/payments?search=${encodeURIComponent(orderId)}`,
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    // 1. Batch persist notification to DB for offline & reconnect sync
    try {
      await prisma.notification.createMany({
        data: authorizedStaff.map((staff) => ({
          userId: staff.id,
          type: NotificationType.SYSTEM_ALERT,
          title,
          body: message,
          data: eventData,
          isRead: false,
        })),
      });
    } catch (err) {
      console.error('[PaymentNotificationService] DB persistence warning:', err);
    }

    // 2. Real-time delivery to currently connected staff SSE streams
    const ssePayload = {
      id: eventId,
      type: 'payment_received',
      title,
      message,
      data: eventData,
      createdAt: eventData.createdAt,
    };

    for (const staff of authorizedStaff) {
      void sseConnectionManager.sendToUser(staff.id, 'payment_received', ssePayload);
    }
  }

  // Delivers refund event to authorized staff and persists notification
  static async notifyPaymentRefund(params: RefundNotificationParams): Promise<void> {
    const { orderId, merchantTransactionId, refundedAmount, currency, reason } = params;

    const redisKey = `payment:notified:${orderId}:REFUND`;
    try {
      const acquired = await redis.set(redisKey, '1', 'EX', 86400, 'NX');
      if (!acquired) {
        return;
      }
    } catch {
      // Continue gracefully if Redis is temporarily unreachable
    }

    const authorizedStaff = await prisma.user.findMany({
      where: {
        role: { in: AUTHORIZED_STAFF_ROLES },
        status: 'ACTIVE',
      },
      select: { id: true, role: true },
    });

    if (authorizedStaff.length === 0) {
      return;
    }

    const eventId = `pay_evt_${orderId}_REFUND`;
    const formattedAmount = `₹${refundedAmount.toLocaleString('en-IN')}`;
    const title = `Payment Refunded — ${formattedAmount}`;
    const reasonText = reason ? ` Reason: ${reason}` : '';
    const message = `Refund of ${formattedAmount} processed for order ${orderId}.${reasonText}`;

    const eventData = {
      id: eventId,
      orderId,
      txnId: merchantTransactionId,
      refundedAmount,
      currency,
      reason,
      clickUrl: `/payments?search=${encodeURIComponent(orderId)}&view=refunds`,
      status: 'REFUNDED',
      createdAt: new Date().toISOString(),
    };

    try {
      await prisma.notification.createMany({
        data: authorizedStaff.map((staff) => ({
          userId: staff.id,
          type: NotificationType.SYSTEM_ALERT,
          title,
          body: message,
          data: eventData,
          isRead: false,
        })),
      });
    } catch (err) {
      console.error('[PaymentNotificationService] DB persistence warning on refund:', err);
    }

    const ssePayload = {
      id: eventId,
      type: 'payment_refund',
      title,
      message,
      data: eventData,
      createdAt: eventData.createdAt,
    };

    for (const staff of authorizedStaff) {
      void sseConnectionManager.sendToUser(staff.id, 'payment_refund', ssePayload);
    }
  }
}
