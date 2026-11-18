import { prisma } from '../../config/prisma';
import { TicketPriority, TicketStatus, Prisma } from '@prisma/client';

export class SupportRepository {
  static async createTicket(data: {
    requesterId: string;
    subject: string;
    category: string;
    priority: TicketPriority;
    message: string;
    slaTargetAt: Date;
  }) {
    return prisma.supportTicket.create({
      data: {
        requesterId: data.requesterId,
        subject: data.subject,
        category: data.category,
        priority: data.priority,
        status: TicketStatus.OPEN,
        slaTargetAt: data.slaTargetAt,
        entries: {
          create: {
            authorId: data.requesterId,
            body: data.message,
            isInternal: false,
          },
        },
      },
      include: {
        entries: {
          include: {
            author: {
              select: {
                id: true,
                phoneNumber: true,
                email: true,
                role: true,
                profile: { select: { name: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });
  }

  static async getUserTickets(requesterId: string, page = 1, limit = 20, status?: TicketStatus) {
    const where: Prisma.SupportTicketWhereInput = {
      requesterId,
      ...(status ? { status } : {}),
    };

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          entries: {
            where: { isInternal: false },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getTicketById(ticketId: string, includeInternal = false) {
    return prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        requester: {
          select: {
            id: true,
            phoneNumber: true,
            email: true,
            role: true,
            profile: { select: { name: true, avatarUrl: true } },
          },
        },
        assignedTo: {
          select: {
            id: true,
            phoneNumber: true,
            email: true,
            role: true,
            profile: { select: { name: true, avatarUrl: true } },
          },
        },
        entries: {
          where: includeInternal ? {} : { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                phoneNumber: true,
                email: true,
                role: true,
                profile: { select: { name: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });
  }

  static async addTicketEntry(ticketId: string, authorId: string, body: string, isInternal = false) {
    return prisma.supportTicketEntry.create({
      data: {
        ticketId,
        authorId,
        body,
        isInternal,
      },
      include: {
        author: {
          select: {
            id: true,
            phoneNumber: true,
            email: true,
            role: true,
            profile: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  static async updateTicket(ticketId: string, data: Prisma.SupportTicketUpdateInput) {
    return prisma.supportTicket.update({
      where: { id: ticketId },
      data,
    });
  }

  static async getStaffTickets(params: {
    search?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.SupportTicketWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }
    if (params.priority) {
      where.priority = params.priority;
    }
    if (params.category && params.category !== 'ALL') {
      where.category = params.category;
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { id: { contains: s, mode: 'insensitive' } },
        { subject: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
        {
          requester: {
            OR: [
              { phoneNumber: { contains: s } },
              { email: { contains: s, mode: 'insensitive' } },
              { profile: { name: { contains: s, mode: 'insensitive' } } },
            ],
          },
        },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        include: {
          requester: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              profile: { select: { name: true } },
            },
          },
          assignedTo: {
            select: {
              id: true,
              email: true,
              profile: { select: { name: true } },
            },
          },
          entries: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    return {
      tickets,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  static async getSupportStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [openTickets, inProgressTickets, urgentTickets, waitingTickets, resolvedToday, total] = await Promise.all([
      prisma.supportTicket.count({ where: { status: TicketStatus.OPEN } }),
      prisma.supportTicket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      prisma.supportTicket.count({
        where: {
          priority: TicketPriority.URGENT,
          status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
        },
      }),
      prisma.supportTicket.count({ where: { status: TicketStatus.WAITING_ON_CUSTOMER } }),
      prisma.supportTicket.count({
        where: {
          status: TicketStatus.RESOLVED,
          resolvedAt: { gte: todayStart },
        },
      }),
      prisma.supportTicket.count(),
    ]);

    return {
      openTickets,
      inProgressTickets,
      urgentTickets,
      waitingTickets,
      resolvedToday,
      total,
    };
  }
}
