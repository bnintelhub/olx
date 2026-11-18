import { prisma } from '../../config/prisma';
import { NotificationType, UserRole } from '@prisma/client';
import { sseConnectionManager } from './sse-connection.manager';
import { PushService } from '../../integrations/push/push.service';
import { AppError } from '../../shared/errors/app-error';

export interface DispatchNotificationParams {
  recipientId: string;
  senderId?: string;
  type?: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'HIGH' | 'NORMAL';
  clickUrl?: string;
}

export interface DispatchNotificationResult {
  notificationId: string;
  deliveredVia: 'SSE' | 'PUSH';
  sseConnected: boolean;
  success: boolean;
}

const STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MODERATOR,
  UserRole.CUSTOMER_SUPPORT,
  UserRole.FINANCE_ADMIN,
  UserRole.CONTENT_MANAGER,
  UserRole.ANALYST,
];

export class NotificationDeliveryService {
  /**
   * Orchestrates reliable notification delivery:
   * 1. Persists record in Database first (Single source of truth).
   * 2. If user is actively connected via SSE -> Delivers in-app SSE event (Push avoided).
   * 3. If user is disconnected/offline -> Falls back to Push notification.
   * 4. For staff/admin users -> SSE only (No push).
   */
  static async dispatch(params: DispatchNotificationParams): Promise<DispatchNotificationResult> {
    const { recipientId, senderId, title, body, data, priority = 'NORMAL', clickUrl } = params;

    if (!recipientId || !title.trim() || !body.trim()) {
      throw new AppError(400, 'INVALID_NOTIFICATION_PAYLOAD', 'Recipient, title, and body are required');
    }

    // 1. Validate recipient existence and role
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, role: true },
    });

    if (!recipient) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Recipient user does not exist');
    }

    // 2. Persist notification in database first (source of truth)
    const notification = await prisma.notification.create({
      data: {
        userId: recipientId,
        type: params.type || NotificationType.SYSTEM_ALERT,
        title: title.trim(),
        body: body.trim(),
        data: {
          ...data,
          clickUrl: clickUrl || data?.clickUrl,
          senderId,
          priority,
        },
        isRead: false,
      },
    });

    // 3. Compute current unread count for real-time badge updates (strictly excluding chat messages)
    const unreadCount = await prisma.notification.count({
      where: {
        userId: recipientId,
        isRead: false,
        type: { not: NotificationType.CHAT_MESSAGE },
      },
    });

    const isStaff = STAFF_ROLES.includes(recipient.role);

    // 4. Staff Rule: Admin & Support Desk receive notifications via SSE ONLY
    if (isStaff) {
      const delivered = await sseConnectionManager.sendToUser(recipientId, 'notification', {
        id: notification.id,
        type: data?.type || 'support_message',
        title: notification.title,
        message: notification.body,
        data: notification.data,
        unreadCount,
        createdAt: notification.createdAt.toISOString(),
      });

      return {
        notificationId: notification.id,
        deliveredVia: 'SSE',
        sseConnected: delivered,
        success: true,
      };
    }

    // 5. Customer Delivery Rule: Check active SSE connection
    const isSseConnected = sseConnectionManager.isUserConnected(recipientId);

    if (isSseConnected) {
      const sseDelivered = await sseConnectionManager.sendToUser(recipientId, 'notification', {
        id: notification.id,
        type: data?.type || 'support_message',
        title: notification.title,
        message: notification.body,
        data: notification.data,
        unreadCount,
        createdAt: notification.createdAt.toISOString(),
      });

      // If SSE delivery succeeded, do not send push notification (prevents duplicates)
      if (sseDelivered) {
        return {
          notificationId: notification.id,
          deliveredVia: 'SSE',
          sseConnected: true,
          success: true,
        };
      }
    }

    // 6. Push Fallback: If user is not active on SSE (or SSE transmission failed)
    const pushSent = await PushService.sendPushNotification(
      recipientId,
      notification.title,
      notification.body,
      {
        ...(notification.data as Record<string, any>),
        notificationId: notification.id,
      },
      {
        notificationId: notification.id,
        type: params.type || 'SYSTEM_ALERT',
        clickUrl: clickUrl || '/support',
        priority,
      }
    );

    return {
      notificationId: notification.id,
      deliveredVia: 'PUSH',
      sseConnected: false,
      success: pushSent,
    };
  }
}
