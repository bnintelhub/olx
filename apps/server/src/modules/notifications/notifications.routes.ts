import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { fcmTokenStore } from '../../integrations/push/fcm.token.store';
import { fcmService } from '../../integrations/push/fcm.service';

export class NotificationsService {
  static async getMyNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}

export class NotificationsController {
  static async list(request: FastifyRequest, reply: FastifyReply) {
    const notifications = await NotificationsService.getMyNotifications(request.user!.id);
    return reply.status(200).send({ success: true, data: notifications });
  }

  static async markRead(request: FastifyRequest, reply: FastifyReply) {
    await NotificationsService.markAllAsRead(request.user!.id);
    return reply.status(200).send({ success: true, message: 'All notifications marked as read' });
  }

  static async registerToken(request: FastifyRequest, reply: FastifyReply) {
    const { token, platform } = (request.body as { token?: string; platform?: string }) || {};
    if (!token || typeof token !== 'string') {
      return reply.status(400).send({ success: false, message: 'FCM token is required' });
    }
    await fcmTokenStore.registerToken(request.user!.id, token, platform || 'web');
    return reply.status(200).send({ success: true, message: 'Push token registered successfully' });
  }

  static async unregisterToken(request: FastifyRequest, reply: FastifyReply) {
    const { token } = (request.body as { token?: string }) || {};
    if (!token || typeof token !== 'string') {
      return reply.status(400).send({ success: false, message: 'FCM token is required' });
    }
    await fcmTokenStore.unregisterToken(request.user!.id, token);
    return reply.status(200).send({ success: true, message: 'Push token unregistered successfully' });
  }

  static async sendTestPush(request: FastifyRequest, reply: FastifyReply) {
    const { token } = (request.body as { token?: string }) || {};
    const userId = request.user!.id;
    const targetTokens = token ? [token] : await fcmTokenStore.getTokensForUser(userId);

    if (targetTokens.length === 0) {
      return reply.status(400).send({ success: false, message: 'No registered push devices found' });
    }

    const userName = (request.user as any)?.profile?.name || (request.user as any)?.email || 'User';
    let sent = false;
    for (const t of targetTokens) {
      const ok = await fcmService.sendDirectTestPush(t, userName);
      if (ok) sent = true;
    }

    return reply.status(200).send({
      success: sent,
      message: sent ? 'Test push notification sent successfully' : 'Failed to send test push',
    });
  }
}

export async function notificationRoutes(fastify: FastifyInstance) {
  // Public configuration for Service Workers (strictly from env, never hardcoded)
  fastify.get('/notifications/firebase-client-config', async (_req, reply) => {
    return reply.status(200).send({
      apiKey: env.FIREBASE_API_KEY || null,
      authDomain: env.FIREBASE_AUTH_DOMAIN || null,
      projectId: env.FIREBASE_PROJECT_ID || null,
      storageBucket: env.FIREBASE_STORAGE_BUCKET || null,
      messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || null,
      appId: env.FIREBASE_APP_ID || null,
      measurementId: env.FIREBASE_MEASUREMENT_ID || null,
    });
  });

  const auth = { preHandler: [fastify.authenticate] };
  fastify.get('/notifications', auth, NotificationsController.list);
  fastify.patch('/notifications/read-all', auth, NotificationsController.markRead);
  fastify.post('/notifications/push-token', auth, NotificationsController.registerToken);
  fastify.delete('/notifications/push-token', auth, NotificationsController.unregisterToken);
  fastify.post('/notifications/test-push', auth, NotificationsController.sendTestPush);
}
