import { FastifyInstance } from 'fastify';
import { ReportsController } from './reports.controller';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';

export async function reportRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  // User report & block endpoints
  fastify.post('/reports', auth, ReportsController.reportAd);
  fastify.post('/blocks', auth, ReportsController.blockUser);

  // Moderation & Review (Moderator, Admin, Super Admin)
  fastify.get(
    '/pending',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.LISTINGS_APPROVE, Permissions.LISTINGS_REJECT)] },
    ReportsController.getPendingAds
  );
  fastify.patch(
    '/ads/:id/review',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.LISTINGS_APPROVE, Permissions.LISTINGS_REJECT)] },
    ReportsController.reviewAd
  );

  // Reports Investigation (Customer Support can read, Moderator can investigate)
  fastify.get(
    '/reports',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.REPORTS_READ)] },
    ReportsController.getReports
  );
  fastify.patch(
    '/reports/:id',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.REPORTS_INVESTIGATE)] },
    ReportsController.resolveReport
  );
}
