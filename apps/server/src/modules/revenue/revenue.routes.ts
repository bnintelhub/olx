import { FastifyInstance } from 'fastify';
import { RevenueController } from './revenue.controller';
import { authorizeRoles } from '../../plugins/auth.plugin';
import { UserRole } from '@prisma/client';

export async function revenueRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };
  const adminGuard = {
    preHandler: [
      fastify.authenticate,
      authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_ADMIN, UserRole.CONTENT_MANAGER),
    ],
  };

  // Public & User-facing routes
  fastify.get('/policy', RevenueController.getPublicPolicy);
  fastify.get('/quota', auth, RevenueController.getUserQuota);

  // Administrative dynamic policy control
  fastify.get('/admin/policy', adminGuard, RevenueController.adminGetPolicy);
  fastify.put('/admin/policy', adminGuard, RevenueController.adminUpdatePolicy);
  fastify.post('/admin/policy/reset', adminGuard, RevenueController.adminResetPolicy);
}

