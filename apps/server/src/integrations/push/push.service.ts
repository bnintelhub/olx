import { dispatchNotificationPushJob } from '../../jobs/push.job';

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  notificationId: string;
  type?: string;
  clickUrl?: string;
  data?: Record<string, any>;
  priority?: 'HIGH' | 'NORMAL';
}

export class PushService {
  /**
   * Enqueues push notification to BullMQ for asynchronous processing by apps/workers.
   * Completely decouples the Fastify server from external FCM network latency.
   */
  static async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    options?: { notificationId?: string; type?: string; clickUrl?: string; priority?: 'HIGH' | 'NORMAL' }
  ): Promise<boolean> {
    const notificationId = options?.notificationId || `${Date.now()}`;

    try {
      await dispatchNotificationPushJob({
        recipientId: userId,
        title,
        body,
        notificationId,
        type: options?.type,
        clickUrl: options?.clickUrl,
        data,
        priority: options?.priority,
      });

      return true;
    } catch (err: any) {
      console.warn(`[PushService] Failed to enqueue push job for user ${userId}:`, err.message);
      return false;
    }
  }
}
