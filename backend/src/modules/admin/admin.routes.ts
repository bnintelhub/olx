import { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller';
import { authorizeRoles } from '../../plugins/auth.plugin';
import { UserRole } from '@prisma/client';

export async function adminRoutes(fastify: FastifyInstance) {
  const adminGuard = {
    preHandler: [fastify.authenticate, authorizeRoles(UserRole.ADMIN, UserRole.MODERATOR)],
  };
  const superAdminGuard = {
    preHandler: [fastify.authenticate, authorizeRoles(UserRole.ADMIN)],
  };

  fastify.get('/stats', adminGuard, AdminController.getStats);
  fastify.get('/users', adminGuard, AdminController.getUsers);
  fastify.get('/users/:id', adminGuard, AdminController.getUserDetail);
  fastify.patch('/users/:id/action', superAdminGuard, AdminController.updateUserAction);

  fastify.get('/ads', adminGuard, AdminController.getAds);
  fastify.delete('/ads/:id', superAdminGuard, AdminController.deleteAd);

  fastify.get('/profile', adminGuard, AdminController.getProfile);
  fastify.put('/profile', adminGuard, AdminController.updateProfile);
  fastify.put('/change-password', adminGuard, AdminController.changePassword);
}
