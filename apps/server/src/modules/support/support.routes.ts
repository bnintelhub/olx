import { FastifyInstance } from 'fastify';
import { SupportController } from './support.controller';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';

// Client Customer Support Desk Routes (/api/v1/support)
export async function supportRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.post('/tickets', auth, SupportController.createTicket);
  fastify.get('/tickets', auth, SupportController.getUserTickets);
  fastify.get('/tickets/:id', auth, SupportController.getUserTicketDetail);
  fastify.post('/tickets/:id/reply', auth, SupportController.addUserReply);
}

// Staff Customer Support & Inquiries Admin Routes (/api/v1/admin/support)
export async function adminSupportRoutes(fastify: FastifyInstance) {
  const staffRead = {
    preHandler: [fastify.authenticate, requirePermission(Permissions.SUPPORT_READ, Permissions.SUPPORT_MANAGE)],
  };
  const staffManage = {
    preHandler: [fastify.authenticate, requirePermission(Permissions.SUPPORT_MANAGE)],
  };

  fastify.get('/stats', staffRead, SupportController.getStaffStats);
  fastify.get('/tickets', staffRead, SupportController.getStaffTickets);
  fastify.get('/tickets/:id', staffRead, SupportController.getStaffTicketDetail);
  fastify.patch('/tickets/:id', staffManage, SupportController.updateStaffTicket);
  fastify.post('/tickets/:id/reply', staffManage, SupportController.addStaffReply);
}
