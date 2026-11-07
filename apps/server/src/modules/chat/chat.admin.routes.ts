import { FastifyInstance } from 'fastify';
import { ChatAdminController } from './chat.admin.controller';

export async function chatAdminRoutes(fastify: FastifyInstance) {
  const staffAuth = { preHandler: [fastify.authenticate] };

  fastify.get('/overview', staffAuth, ChatAdminController.getOverviewMetrics);
  fastify.get('/reports', staffAuth, ChatAdminController.getReportsQueue);
  fastify.get('/reports/:id', staffAuth, ChatAdminController.getReportDetails);
  fastify.post('/reports/:id/action', staffAuth, ChatAdminController.takeModeratorAction);
  fastify.post('/reports/:id/notes', staffAuth, ChatAdminController.addModeratorNote);
  fastify.get('/search', staffAuth, ChatAdminController.searchConversations);
}
