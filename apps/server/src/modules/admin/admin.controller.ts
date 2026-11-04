import { FastifyReply, FastifyRequest } from 'fastify';
import { AdminService } from './admin.service';
import {
  userActionSchema,
  updateAdminProfileSchema,
  changeAdminPasswordSchema,
  createInvitationSchema,
} from './admin.schema';
import { AdStatus } from '@prisma/client';
import { writeAuditLog } from '../../shared/utils/audit.util';

export class AdminController {
  // Retrieves live dashboard KPI counts including users, active ads, and pending reports.
  // Helps staff monitor operational volume and backlog in real-time.
  static async getStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await AdminService.getStats();
    return reply.status(200).send({ success: true, data: stats });
  }

  // Lists platform accounts with pagination, text search, and role/status filtering.
  // Caps page size at 100 to prevent heavy database queries and memory pressure.
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

  // Loads comprehensive user details including profile, listings, and report history.
  // Used by moderators to review account history before taking moderation actions.
  static async getUserDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = await AdminService.getUserDetail(id);
    return reply.status(200).send({ success: true, data: user });
  }

  // Applies administrative account actions like suspension, bans, or role promotions.
  // Records an immutable audit log entry for accountability and security compliance.
  static async updateUserAction(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { action, role, capabilities } = userActionSchema.parse(request.body);
    const updated = await AdminService.updateUserAction(id, action, role, capabilities);

    await writeAuditLog({
      userId: request.user?.id,
      action: `ADMIN_ACTION_${action}`,
      entityType: 'USER',
      entityId: id,
      request,
    });

    return reply.status(200).send({ success: true, data: updated });
  }

  // Fetches paginated classified listings for moderation and content safety review.
  // Supports filtering by review status and keyword search across title and description.
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

  // Soft-deletes a listing violating marketplace policies and preserves it for audit.
  // Emits an administrative audit event capturing the performing moderator's identity.
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

  // Returns profile and permissions of the currently authenticated admin session.
  // Allows the client portal to display correct user details and navigation options.
  static async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const profile = await AdminService.getUserDetail(request.user!.id);
    return reply.status(200).send({ success: true, data: profile });
  }

  // Updates current admin's email and profile metadata, then evicts cache.
  // Ensures role and identity updates propagate immediately without stale sessions.
  static async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const body = updateAdminProfileSchema.parse(request.body);
    const updated = await AdminService.updateProfile(request.user!.id, body);
    return reply.status(200).send({ success: true, data: updated });
  }

  // Verifies the administrator's current password before saving the new credential.
  // Prevents unauthorized credential modifications if an admin workstation is unlocked.
  static async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const { currentPassword, newPassword } = changeAdminPasswordSchema.parse(request.body);
    const result = await AdminService.changePassword(request.user!.id, currentPassword, newPassword);
    return reply.status(200).send({ success: true, data: result });
  }

  // Issues a 48-hour single-use onboarding token for new staff members.
  // Logs the invitation event with assigned role for audit trail tracking.
  static async createStaffInvitation(request: FastifyRequest, reply: FastifyReply) {
    const { email, role } = createInvitationSchema.parse(request.body);
    const result = await AdminService.createStaffInvitation(request.user!.id, email, role);

    await writeAuditLog({
      userId: request.user!.id,
      action: 'STAFF_INVITATION_SENT',
      entityType: 'INVITATION',
      entityId: result.invitation.id,
      newData: { email, role },
      request,
    });

    return reply.status(201).send({ success: true, data: result });
  }

  // Lists all staff invitations showing current status, invited role, and expiration.
  // Enables super admins to track pending team onboarding and spot pending invitations.
  static async getStaffInvitations(request: FastifyRequest, reply: FastifyReply) {
    const list = await AdminService.getStaffInvitations();
    return reply.status(200).send({ success: true, data: list });
  }

  // Invalidates a pending invitation link before it is claimed by the recipient.
  // Emits an audit log entry so invitation cancellations are securely tracked.
  static async revokeStaffInvitation(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const revoked = await AdminService.revokeStaffInvitation(id);

    await writeAuditLog({
      userId: request.user!.id,
      action: 'STAFF_INVITATION_REVOKED',
      entityType: 'INVITATION',
      entityId: id,
      request,
    });

    return reply.status(200).send({ success: true, data: revoked });
  }
}
