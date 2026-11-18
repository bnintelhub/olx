import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { fcmTokenStore } from '../../integrations/push/fcm.token.store';
import { dispatchTestPushJob } from '../../jobs/push.job';
import { sseConnectionManager } from './sse-connection.manager';
import { NotificationDeliveryService } from './notification-delivery.service';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';
import { NotificationType } from '@prisma/client';

export class NotificationsService {
  static async getMyNotifications(userId: string) {
    return prisma.notification.findMany({
      where: {
        userId,
        type: { not: 'CHAT_MESSAGE' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
        type: { not: 'CHAT_MESSAGE' },
      },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        type: { not: 'CHAT_MESSAGE' },
      },
      data: { isRead: true },
    });
  }

  static async markOneAsRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId, isRead: false },
      data: { isRead: true },
    });
  }
}

export class NotificationsController {
  static async list(request: FastifyRequest, reply: FastifyReply) {
    const notifications = await NotificationsService.getMyNotifications(request.user!.id);
    return reply.status(200).send({ success: true, data: notifications });
  }

  static async getUnreadCount(request: FastifyRequest, reply: FastifyReply) {
    const count = await NotificationsService.getUnreadCount(request.user!.id);
    return reply.status(200).send({ success: true, count });
  }

  static async markRead(request: FastifyRequest, reply: FastifyReply) {
    await NotificationsService.markAllAsRead(request.user!.id);
    return reply.status(200).send({ success: true, message: 'All notifications marked as read' });
  }

  static async markOneRead(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!id) {
      return reply.status(400).send({ success: false, message: 'Notification ID is required' });
    }
    await NotificationsService.markOneAsRead(request.user!.id, id);
    const unreadCount = await NotificationsService.getUnreadCount(request.user!.id);
    return reply.status(200).send({ success: true, message: 'Notification marked as read', unreadCount });
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
    for (const t of targetTokens) {
      await dispatchTestPushJob({ token: t, userName });
    }

    return reply.status(200).send({
      success: true,
      message: 'Test push notification queued successfully to background worker',
    });
  }

  /**
   * Establishes real-time SSE stream for active users.
   * Multi-tab friendly; tracks active connections in SSEConnectionManager.
   */
  static async stream(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user!;
    const connectionId = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Prevent underlying Node socket timeouts from prematurely destroying the SSE connection
    if (request.raw?.socket) {
      request.raw.socket.setTimeout(0);
      request.raw.socket.setNoDelay(true);
      request.raw.socket.setKeepAlive(true);
    }

    // Keep SSE connection open after handler finishes
    reply.sse.keepAlive();

    // Register active connection
    sseConnectionManager.register(user.id, user.role, reply.sse, connectionId);

    const unreadCount = await NotificationsService.getUnreadCount(user.id);

    // Initial handshake event
    await reply.sse.send({
      id: `init-${Date.now()}`,
      event: 'ready',
      data: {
        connectionId,
        userId: user.id,
        role: user.role,
        unreadCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Staff/Admin dispatch endpoint to send real-time notification to a user.
   * Delivers via SSE if user has active stream, otherwise falls back to Push.
   */
  static async dispatch(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as {
      recipientId: string;
      title: string;
      body: string;
      type?: NotificationType;
      data?: Record<string, any>;
      priority?: 'HIGH' | 'NORMAL';
      clickUrl?: string;
    };

    if (!body?.recipientId || !body?.title || !body?.body) {
      return reply.status(400).send({
        success: false,
        message: 'recipientId, title, and body are required',
      });
    }

    const result = await NotificationDeliveryService.dispatch({
      recipientId: body.recipientId,
      senderId: request.user!.id,
      type: body.type,
      title: body.title,
      body: body.body,
      data: body.data,
      priority: body.priority,
      clickUrl: body.clickUrl,
    });

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  /**
   * Staff diagnostic check: verify whether a user is currently connected to SSE.
   */
  static async checkStatus(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = (request.query as { userId?: string }) || {};
    const targetUserId = userId || request.user!.id;
    const isConnected = sseConnectionManager.isUserConnected(targetUserId);
    const activeTabs = sseConnectionManager.getUserConnectionCount(targetUserId);

    return reply.status(200).send({
      success: true,
      userId: targetUserId,
      isConnected,
      activeTabs,
    });
  }
}

export async function notificationRoutes(fastify: FastifyInstance) {
  const sendFirebaseConfig = async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      apiKey: env.FIREBASE_API_KEY || null,
      authDomain: env.FIREBASE_AUTH_DOMAIN || null,
      projectId: env.FIREBASE_PROJECT_ID || null,
      storageBucket: env.FIREBASE_STORAGE_BUCKET || null,
      messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || null,
      appId: env.FIREBASE_APP_ID || null,
      measurementId: env.FIREBASE_MEASUREMENT_ID || null,
    });
  };

  // Public configuration for Service Workers
  fastify.get('/firebase-client-config', sendFirebaseConfig);
  fastify.get('/notifications/firebase-client-config', sendFirebaseConfig);

  const auth = { preHandler: [fastify.authenticate] };
  const staffAuth = {
    preHandler: [
      fastify.authenticate,
      requirePermission(Permissions.SUPPORT_MANAGE, Permissions.USERS_MANAGE, Permissions.ADMINS_MANAGE),
    ],
  };

  // Real-time SSE stream endpoint
  fastify.get('/stream', { preHandler: [fastify.authenticate], sse: 'only' }, NotificationsController.stream);
  fastify.get('/notifications/stream', { preHandler: [fastify.authenticate], sse: 'only' }, NotificationsController.stream);

  // Connection status & diagnostics
  fastify.get('/status', auth, NotificationsController.checkStatus);
  fastify.get('/unread-count', auth, NotificationsController.getUnreadCount);

  // Staff dispatch endpoint (SSE if online, Push if offline)
  fastify.post('/dispatch', staffAuth, NotificationsController.dispatch);
  fastify.post('/notifications/dispatch', staffAuth, NotificationsController.dispatch);

  // Notification management
  fastify.get('/', auth, NotificationsController.list);
  fastify.get('/list', auth, NotificationsController.list);
  fastify.get('/notifications', auth, NotificationsController.list);

  fastify.patch('/read-all', auth, NotificationsController.markRead);
  fastify.patch('/notifications/read-all', auth, NotificationsController.markRead);

  fastify.patch('/:id/read', auth, NotificationsController.markOneRead);
  fastify.patch('/notifications/:id/read', auth, NotificationsController.markOneRead);

  fastify.post('/push-token', auth, NotificationsController.registerToken);
  fastify.post('/notifications/push-token', auth, NotificationsController.registerToken);

  fastify.delete('/push-token', auth, NotificationsController.unregisterToken);
  fastify.delete('/notifications/push-token', auth, NotificationsController.unregisterToken);

  fastify.post('/test-push', auth, NotificationsController.sendTestPush);
  fastify.post('/notifications/test-push', auth, NotificationsController.sendTestPush);
}
