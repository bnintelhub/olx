import { FastifyReply, FastifyRequest } from 'fastify';
import { SupportService } from './support.service';
import {
  createTicketSchema,
  createTicketReplySchema,
  adminReplyTicketSchema,
  adminUpdateTicketSchema,
  listTicketsQuerySchema,
} from './support.schema';
import { writeAuditLog } from '../../shared/utils/audit.util';

export class SupportController {
  // Client Endpoints
  static async createTicket(request: FastifyRequest, reply: FastifyReply) {
    const input = createTicketSchema.parse(request.body);
    const ticket = await SupportService.createTicket(request.user!.id, input);

    return reply.status(201).send({
      success: true,
      data: ticket,
      message: 'Support ticket submitted successfully. Our team will review it shortly.',
    });
  }

  static async getUserTickets(request: FastifyRequest, reply: FastifyReply) {
    const query = listTicketsQuerySchema.parse(request.query);
    const result = await SupportService.getUserTickets(
      request.user!.id,
      query.page,
      query.limit,
      query.status
    );

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  static async getUserTicketDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const ticket = await SupportService.getUserTicketDetail(request.user!.id, id);

    return reply.status(200).send({
      success: true,
      data: ticket,
    });
  }

  static async addUserReply(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { message } = createTicketReplySchema.parse(request.body);
    const entry = await SupportService.addUserReply(request.user!.id, id, message);

    return reply.status(200).send({
      success: true,
      data: entry,
      message: 'Reply sent successfully.',
    });
  }

  // Admin / Staff Endpoints
  static async getStaffStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await SupportService.getSupportStats();
    return reply.status(200).send({
      success: true,
      data: stats,
    });
  }

  static async getStaffTickets(request: FastifyRequest, reply: FastifyReply) {
    const query = listTicketsQuerySchema.parse(request.query);
    const result = await SupportService.getStaffTickets(query);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  static async getStaffTicketDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const ticket = await SupportService.getStaffTicketDetail(id);

    return reply.status(200).send({
      success: true,
      data: ticket,
    });
  }

  static async updateStaffTicket(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const input = adminUpdateTicketSchema.parse(request.body);
    const ticket = await SupportService.updateStaffTicket(id, input);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'SUPPORT_UPDATE_TICKET',
      entityType: 'SUPPORT_TICKET',
      entityId: id,
      request,
    });

    return reply.status(200).send({
      success: true,
      data: ticket,
      message: 'Support ticket updated successfully.',
    });
  }

  static async addStaffReply(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const input = adminReplyTicketSchema.parse(request.body);
    const entry = await SupportService.addStaffReply(request.user!.id, id, input);

    await writeAuditLog({
      userId: request.user?.id,
      action: input.isInternal ? 'SUPPORT_ADD_INTERNAL_NOTE' : 'SUPPORT_REPLY_TICKET',
      entityType: 'SUPPORT_TICKET',
      entityId: id,
      request,
    });

    return reply.status(200).send({
      success: true,
      data: entry,
      message: input.isInternal ? 'Internal note added.' : 'Reply sent to customer.',
    });
  }
}
