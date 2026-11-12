import { FastifyInstance } from 'fastify';
import { BannersController } from './banners.controller';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';

export async function bannerRoutes(fastify: FastifyInstance) {
  // Public client active feed & interaction tracking
  fastify.get('/', BannersController.getActive);
  fastify.post('/:id/impression', BannersController.trackImpression);
  fastify.post('/:id/click', BannersController.trackClick);

  // Content Manager & Admin management guards
  const manageGuard = {
    preHandler: [fastify.authenticate, requirePermission(Permissions.BANNERS_MANAGE)],
  };

  // Admin routes
  fastify.get('/admin', manageGuard, BannersController.getAdminBanners);
  fastify.post('/admin/upload', manageGuard, BannersController.uploadMedia);
  fastify.post('/admin', manageGuard, BannersController.create);
  fastify.put('/admin/:id', manageGuard, BannersController.update);
  fastify.patch('/admin/:id/status', manageGuard, BannersController.toggleStatus);
  fastify.delete('/admin/:id', manageGuard, BannersController.delete);
}

