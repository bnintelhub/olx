import { FastifyReply, FastifyRequest } from 'fastify';
import { AdminService } from './admin.service';
import { userActionSchema, updateAdminProfileSchema, changeAdminPasswordSchema } from './admin.schema';
import { AdStatus } from '@prisma/client';
import { writeAuditLog } from '../../shared/utils/audit.util';

export class AdminController {
  static async getStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await AdminService.getStats();
    return reply.status(200).send({ success: true, data: stats });
  }

  static async getUsers(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const users = await AdminService.getUsers({
      page: Math.max(1, Number(query?.page) || 1),
      limit: Math.min(100, Math.max(1, Number(query?.limit) || 20)),
      q: query?.q,
      status: query?.status,
      role: query?.role,
    });
    return reply.status(200).send({ success: true, data: users });
  }

  static async getUserDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = await AdminService.getUserDetail(id);
    return reply.status(200).send({ success: true, data: user });
  }

  static async updateUserAction(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { action, role } = userActionSchema.parse(request.body);
    const updated = await AdminService.updateUserAction(id, action, role);

    await writeAuditLog({
      userId: request.user?.id,
      action: `ADMIN_ACTION_${action}`,
      entityType: 'USER',
      entityId: id,
      request,
    });

    return reply.status(200).send({ success: true, data: updated });
  }

  static async getAds(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const ads = await AdminService.getAds({
      page: Math.max(1, Number(query?.page) || 1),
      limit: Math.min(100, Math.max(1, Number(query?.limit) || 20)),
      status: query?.status as AdStatus | undefined,
      q: query?.q,
    });
    return reply.status(200).send({ success: true, data: ads });
  }

  static async deleteAd(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const deleted = await AdminService.deleteAd(id);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'ADMIN_DELETE_AD',
      entityType: 'AD',
      entityId: id,
      request,
    });

    return reply.status(200).send({ success: true, data: deleted });
  }

  static async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const profile = await AdminService.getUserDetail(request.user!.id);
    return reply.status(200).send({ success: true, data: profile });
  }

  static async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const body = updateAdminProfileSchema.parse(request.body);
    const updated = await AdminService.updateProfile(request.user!.id, body);
    return reply.status(200).send({ success: true, data: updated });
  }

  static async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const { currentPassword, newPassword } = changeAdminPasswordSchema.parse(request.body);
    const result = await AdminService.changePassword(request.user!.id, currentPassword, newPassword);
    return reply.status(200).send({ success: true, data: result });
  }
}
