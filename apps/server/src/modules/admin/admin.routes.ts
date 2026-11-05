import { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller';
import { AdminMediaController } from './admin.media.controller';
import { requirePermission, authorizeRoles } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';
import { UserRole } from '@prisma/client';

export async function adminRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  // Analytics & Platform Stats (Accessible to all staff dashboard roles)
  fastify.get(
    '/stats',
    {
      preHandler: [
        fastify.authenticate,
        authorizeRoles(
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.MODERATOR,
          UserRole.CUSTOMER_SUPPORT,
          UserRole.FINANCE_ADMIN,
          UserRole.CONTENT_MANAGER,
          UserRole.ANALYST
        ),
      ],
    },
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
  fastify.patch(
    '/users/:id/status',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.USERS_MANAGE)] },
    AdminController.updateUserStatus
  );

  // Listing Moderation & Operational Control
  fastify.get(
    '/ads',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.LISTINGS_READ)] },
    AdminController.getAds
  );
  fastify.patch(
    '/ads/:id/status',
    {
      preHandler: [
        fastify.authenticate,
        authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR),
      ],
    },
    AdminController.updateAdStatus
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

  // Media Management & Storage Observability (Super Admin, Admin)
  fastify.get(
    '/media/overview',
    { preHandler: [fastify.authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN)] },
    AdminMediaController.getOverview
  );
  fastify.get(
    '/media',
    { preHandler: [fastify.authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN)] },
    AdminMediaController.getAllMedia
  );
  fastify.get(
    '/media/:id',
    { preHandler: [fastify.authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN)] },
    AdminMediaController.getMediaById
  );
  fastify.put(
    '/media/:id',
    { preHandler: [fastify.authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN)] },
    AdminMediaController.updateMedia
  );
  fastify.patch(
    '/media/:id',
    { preHandler: [fastify.authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN)] },
    AdminMediaController.updateMedia
  );
  fastify.delete(
    '/media/:id',
    { preHandler: [fastify.authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN)] },
    AdminMediaController.deleteMedia
  );
  fastify.post(
    '/media/cleanup-orphans',
    { preHandler: [fastify.authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN)] },
    AdminMediaController.cleanupOrphanedMedia
  );
}
