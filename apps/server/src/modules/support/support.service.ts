import { NotificationType, TicketPriority, TicketStatus, UserRole } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { SupportRepository } from './support.repository';
import {
  CreateTicketInput,
  AdminReplyTicketInput,
  AdminUpdateTicketInput,
  ListTicketsQuery,
} from './support.schema';
import { AppError } from '../../shared/errors/app-error';
import { NotificationDeliveryService } from '../notifications/notification-delivery.service';
import { sseConnectionManager } from '../notifications/sse-connection.manager';

export class SupportService {
  static async createTicket(userId: string, input: CreateTicketInput) {
    const priority = input.priority as TicketPriority;

    const slaHours = {
      [TicketPriority.URGENT]: 12,
      [TicketPriority.HIGH]: 24,
      [TicketPriority.NORMAL]: 48,
      [TicketPriority.LOW]: 72,
    }[priority] || 48;

    const slaTargetAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const ticket = await SupportRepository.createTicket({
      requesterId: userId,
      subject: input.subject.trim(),
      category: input.category.trim().toUpperCase(),
      priority,
      message: input.message.trim(),
      slaTargetAt,
    });

    // Notify online staff in real-time via SSE (single event)
    const ticketNumber = ticket.id.slice(0, 8).toUpperCase();

    void sseConnectionManager.broadcastToRole(
      [UserRole.CUSTOMER_SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      'support_activity',
      {
        ticketId: ticket.id,
        ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
        type: 'TICKET_CREATED',
      }
    ).catch(() => {});

    // Persist staff notifications in database for dropdown bell count
    void (async () => {
      try {
        const staffUsers = await prisma.user.findMany({
          where: {
            role: { in: [UserRole.CUSTOMER_SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
            status: 'ACTIVE',
          },
          select: { id: true, role: true },
          take: 50,
        });

        if (staffUsers.length > 0) {
          const title = `New Support Ticket #${ticketNumber}`;
          const body = `${ticket.subject} (${ticket.priority})`;

          await prisma.notification.createMany({
            data: staffUsers.map((s) => ({
              userId: s.id,
              type: NotificationType.SYSTEM_ALERT,
              title,
              body,
              data: {
                ticketId: ticket.id,
                ticketNumber,
                type: 'TICKET_CREATED',
                clickUrl: '/support',
              },
            })),
          });
        }
      } catch {
        // Silently catch background staff notification error
      }
    })();

    return ticket;
  }

  static async getUserTickets(userId: string, page = 1, limit = 20, status?: string) {
    const validStatus = status && Object.values(TicketStatus).includes(status as TicketStatus)
      ? (status as TicketStatus)
      : undefined;

    return SupportRepository.getUserTickets(userId, page, limit, validStatus);
  }

  static async getUserTicketDetail(userId: string, ticketId: string) {
    const ticket = await SupportRepository.getTicketById(ticketId, false);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }
    if (ticket.requesterId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view this ticket');
    }
    return ticket;
  }

  static async addUserReply(userId: string, ticketId: string, message: string) {
    const ticket = await SupportRepository.getTicketById(ticketId, false);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }
    if (ticket.requesterId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to reply to this ticket');
    }
    if (ticket.status === TicketStatus.CLOSED) {
      throw new AppError(400, 'TICKET_CLOSED', 'This support ticket is closed. Please submit a new inquiry.');
    }

    const entry = await SupportRepository.addTicketEntry(ticketId, userId, message.trim(), false);

    // If waiting on customer or resolved, re-open to IN_PROGRESS so support desk knows the user responded
    let newStatus = ticket.status;
    if (ticket.status === TicketStatus.WAITING_ON_CUSTOMER || ticket.status === TicketStatus.RESOLVED) {
      newStatus = TicketStatus.IN_PROGRESS;
    }

    await SupportRepository.updateTicket(ticketId, {
      status: newStatus,
      updatedAt: new Date(),
    });

    // Notify online staff in real-time via SSE (single event)
    const replyTicketNumber = ticket.id.slice(0, 8).toUpperCase();
    const replySnippet = message.length > 120 ? `${message.slice(0, 117)}...` : message;

    void sseConnectionManager.broadcastToRole(
      [UserRole.CUSTOMER_SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      'support_activity',
      {
        ticketId: ticket.id,
        ticketNumber: replyTicketNumber,
        subject: ticket.subject,
        message: replySnippet,
        type: 'CUSTOMER_REPLY',
      }
    ).catch(() => {});

    // Persist staff notifications in database for dropdown bell count
    void (async () => {
      try {
        const targetRoles = [UserRole.CUSTOMER_SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN];
        const staffUsers = await prisma.user.findMany({
          where: {
            OR: [
              ...(ticket.assignedToId ? [{ id: ticket.assignedToId }] : []),
              { role: { in: targetRoles } },
            ],
            status: 'ACTIVE',
          },
          select: { id: true, role: true },
          take: 50,
        });

        if (staffUsers.length > 0) {
          const title = `Customer Reply on Ticket #${replyTicketNumber}`;
          const body = replySnippet;

          await prisma.notification.createMany({
            data: staffUsers.map((s) => ({
              userId: s.id,
              type: NotificationType.SYSTEM_ALERT,
              title,
              body,
              data: {
                ticketId: ticket.id,
                ticketNumber: replyTicketNumber,
                type: 'CUSTOMER_REPLY',
                clickUrl: '/support',
              },
            })),
          });
        }
      } catch {
        // Silently catch background staff notification error
      }
    })();

    return entry;
  }

  static async getStaffTickets(query: ListTicketsQuery) {
    const status = query.status && Object.values(TicketStatus).includes(query.status as TicketStatus)
      ? (query.status as TicketStatus)
      : undefined;

    const priority = query.priority && Object.values(TicketPriority).includes(query.priority as TicketPriority)
      ? (query.priority as TicketPriority)
      : undefined;

    return SupportRepository.getStaffTickets({
      search: query.search,
      status,
      priority,
      category: query.category,
      page: query.page,
      limit: query.limit,
    });
  }

  static async getStaffTicketDetail(ticketId: string) {
    const ticket = await SupportRepository.getTicketById(ticketId, true);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }
    return ticket;
  }

  static async updateStaffTicket(ticketId: string, input: AdminUpdateTicketInput) {
    const ticket = await SupportRepository.getTicketById(ticketId, true);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }

    const updateData: any = {};
    if (input.status) {
      updateData.status = input.status as TicketStatus;
      if (input.status === 'RESOLVED' || input.status === 'CLOSED') {
        updateData.resolvedAt = new Date();
      } else {
        updateData.resolvedAt = null;
      }
    }
    if (input.priority) {
      updateData.priority = input.priority as TicketPriority;
    }
    if (input.assignedToId !== undefined) {
      updateData.assignedToId = input.assignedToId;
    }

    return SupportRepository.updateTicket(ticketId, updateData);
  }

  static async addStaffReply(staffUserId: string, ticketId: string, input: AdminReplyTicketInput) {
    const ticket = await SupportRepository.getTicketById(ticketId, true);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }

    const entry = await SupportRepository.addTicketEntry(
      ticketId,
      staffUserId,
      input.message.trim(),
      Boolean(input.isInternal)
    );

    const updateData: any = { updatedAt: new Date() };

    if (!input.isInternal) {
      if (input.status) {
        updateData.status = input.status as TicketStatus;
        if (input.status === 'RESOLVED' || input.status === 'CLOSED') {
          updateData.resolvedAt = new Date();
        }
      } else if (ticket.status === TicketStatus.OPEN || ticket.status === TicketStatus.IN_PROGRESS) {
        updateData.status = TicketStatus.WAITING_ON_CUSTOMER;
      }
    }

    await SupportRepository.updateTicket(ticketId, updateData);

    // Deliver real-time notification to the customer (SSE if active, fallback to Push)
    if (!input.isInternal) {
      void NotificationDeliveryService.dispatch({
        recipientId: ticket.requesterId,
        senderId: staffUserId,
        type: NotificationType.SYSTEM_ALERT,
        title: `Support Ticket #${ticket.id.slice(0, 8).toUpperCase()} Update`,
        body: input.message.length > 140 ? `${input.message.slice(0, 137)}...` : input.message,
        data: {
          type: 'support_message',
          ticketId: ticket.id,
          ticketNumber: ticket.id.slice(0, 8).toUpperCase(),
          subject: ticket.subject,
          clickUrl: `/support?ticketId=${ticket.id}`,
        },
        priority: ticket.priority === TicketPriority.URGENT ? 'HIGH' : 'NORMAL',
        clickUrl: `/support?ticketId=${ticket.id}`,
      }).catch(() => { });
    }

    return entry;
  }

  static async getSupportStats() {
    return SupportRepository.getSupportStats();
  }
}
