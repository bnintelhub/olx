import { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';

export async function adminRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  // Analytics & Platform Stats (Super Admin, Admin, Analyst)
  fastify.get(
    '/stats',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.ANALYTICS_READ)] },
    AdminController.getStats
  );

  // User Management (Super Admin, Admin, Customer Support for Read)
  fastify.get(
    '/users',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.USERS_READ)] },
    AdminController.getUsers
  );
  fastify.get(
    '/users/:id',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.USERS_READ)] },
    AdminController.getUserDetail
  );
  fastify.patch(
    '/users/:id/action',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.USERS_MANAGE)] },
    AdminController.updateUserAction
  );

  // Listing Moderation & Operational Control
  fastify.get(
    '/ads',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.LISTINGS_READ)] },
    AdminController.getAds
  );
  fastify.delete(
    '/ads/:id',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.LISTINGS_DELETE)] },
    AdminController.deleteAd
  );

  // Admin Self Profile
  fastify.get('/profile', auth, AdminController.getProfile);
  fastify.put('/profile', auth, AdminController.updateProfile);
  fastify.put('/change-password', auth, AdminController.changePassword);

  // Staff Invitations Workflow (Super Admin only)
  fastify.post(
    '/invitations',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.ADMINS_MANAGE)] },
    AdminController.createStaffInvitation
  );
  fastify.get(
    '/invitations',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.ADMINS_MANAGE)] },
    AdminController.getStaffInvitations
  );
  fastify.delete(
    '/invitations/:id',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.ADMINS_MANAGE)] },
    AdminController.revokeStaffInvitation
  );

  // Forensic Audit Trail (Immutable, restricted to roles with audit:read permission)
  fastify.get(
    '/audit-logs',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.AUDIT_READ)] },
    AdminController.getAuditLogs
  );
}
