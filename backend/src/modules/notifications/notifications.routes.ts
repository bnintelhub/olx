import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../config/prisma';

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
}

export async function notificationRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };
  fastify.get('/notifications', auth, NotificationsController.list);
  fastify.patch('/notifications/read-all', auth, NotificationsController.markRead);
}
