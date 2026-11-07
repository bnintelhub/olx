import { FastifyReply, FastifyRequest } from 'fastify';
import { ChatAdminService } from './chat.admin.service';
import { z } from 'zod';
import { ReportStatus } from '@prisma/client';

export class ChatAdminController {
  static async getOverviewMetrics(_request: FastifyRequest, reply: FastifyReply) {
    const metrics = await ChatAdminService.getOverviewMetrics();
    return reply.status(200).send({ success: true, data: metrics });
  }

  static async getReportsQueue(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      status: z.nativeEnum(ReportStatus).optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(5).max(50).default(15),
    });
    const query = querySchema.parse(request.query);
    const result = await ChatAdminService.getReportsQueue(query);
    return reply.status(200).send({ success: true, data: result });
  }

  static async getReportDetails(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const result = await ChatAdminService.getReportDetails(id, request.user!.id);
    return reply.status(200).send({ success: true, data: result });
  }

  static async takeModeratorAction(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const actionSchema = z.object({
      action: z.enum(['DISMISS', 'REMOVE_MESSAGE', 'RESTRICT_USER', 'SUSPEND_USER', 'RESOLVE']),
      note: z.string().max(1000).optional(),
    });
    const { action, note } = actionSchema.parse(request.body);
    const result = await ChatAdminService.takeModeratorAction(id, request.user!.id, action, note);
    return reply.status(200).send({ success: true, data: result });
  }

  static async addModeratorNote(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const noteSchema = z.object({
      content: z.string().min(1).max(2000),
    });
    const { content } = noteSchema.parse(request.body);
    const result = await ChatAdminService.addModeratorNote(id, request.user!.id, content);
    return reply.status(201).send({ success: true, data: result });
  }

  static async searchConversations(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query as { q?: string }).q || '';
    const result = await ChatAdminService.searchConversations(query);
    return reply.status(200).send({ success: true, data: result });
  }
}
