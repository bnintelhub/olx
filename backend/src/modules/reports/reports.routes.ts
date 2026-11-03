import { FastifyInstance } from 'fastify';
import { ReportsController } from './reports.controller';
import { authorizeRoles } from '../../plugins/auth.plugin';
import { UserRole } from '@prisma/client';

export async function reportRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };
  const modGuard = {
    preHandler: [fastify.authenticate, authorizeRoles(UserRole.ADMIN, UserRole.MODERATOR)],
  };

  // User endpoints
  fastify.post('/reports', auth, ReportsController.reportAd);
  fastify.post('/blocks', auth, ReportsController.blockUser);

  // Moderation endpoints
  fastify.get('/pending', modGuard, ReportsController.getPendingAds);
  fastify.patch('/ads/:id/review', modGuard, ReportsController.reviewAd);
  fastify.get('/reports', modGuard, ReportsController.getReports);
  fastify.patch('/reports/:id', modGuard, ReportsController.resolveReport);
}
