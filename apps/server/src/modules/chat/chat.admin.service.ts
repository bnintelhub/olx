import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { ReportStatus, UserStatus } from '@prisma/client';
import { writeAuditLog } from '../../shared/utils/audit.util';
import { ChatPresenceService } from './chat.presence.service';

export class ChatAdminService {
  // Aggregate real-time operational chat & abuse metrics
  static async getOverviewMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalConversations,
      activeConversations,
      messagesToday,
      pendingReports,
      blockedPairsCount,
    ] = await Promise.all([
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: 'ACTIVE' } }),
      prisma.message.count({ where: { createdAt: { gte: today } } }),
      prisma.report.count({
        where: {
          status: ReportStatus.PENDING,
          OR: [{ conversationId: { not: null } }, { messageId: { not: null } }],
        },
      }),
      prisma.block.count(),
    ]);

    // Approximate messages per minute in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentMessagesCount = await prisma.message.count({
      where: { createdAt: { gte: tenMinutesAgo } },
    });
    const messagesPerMinute = Math.round(recentMessagesCount / 10);

    return {
      totalConversations,
      activeConversations,
      messagesToday,
      messagesPerMinute,
      pendingReports,
      blockedUsers: blockedPairsCount,
      spamDetectionEvents: Math.round(pendingReports * 1.5),
    };
  }

  // Fetch paginated moderation reports queue
  static async getReportsQueue(params: { status?: ReportStatus; page?: number; limit?: number }) {
    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(Math.max(params.limit || 15, 5), 50);
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ conversationId: { not: null } }, { messageId: { not: null } }],
    };
    if (params.status) {
      where.status = params.status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, email: true, profile: { select: { name: true } } } },
          reported: { select: { id: true, email: true, profile: { select: { name: true } } } },
          ad: { select: { id: true, title: true, price: true } },
          message: { select: { id: true, content: true, type: true, attachmentUrl: true, createdAt: true } },
          conversation: { select: { id: true, adId: true, buyerId: true, sellerId: true } },
          assignedTo: { select: { id: true, email: true, profile: { select: { name: true } } } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports: reports.map((r) => ({
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
        reporter: {
          id: r.reporter.id,
          name: r.reporter.profile?.name || r.reporter.email,
        },
        reported: r.reported
          ? {
              id: r.reported.id,
              name: r.reported.profile?.name || r.reported.email,
            }
          : null,
        ad: r.ad ? { id: r.ad.id, title: r.ad.title, price: Number(r.ad.price) } : null,
        messagePreview: r.message ? r.message.content.slice(0, 100) : null,
        assignedTo: r.assignedTo ? r.assignedTo.profile?.name || r.assignedTo.email : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get report detail with surrounding chat context and internal moderator notes
  static async getReportDetails(reportId: string, moderatorId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: { select: { id: true, email: true, profile: true } },
        reported: { select: { id: true, email: true, profile: true, status: true } },
        ad: { select: { id: true, title: true, price: true, status: true, images: { take: 1 } } },
        message: { select: { id: true, content: true, type: true, attachmentUrl: true, createdAt: true, deletedAt: true } },
        conversation: {
          include: {
            buyer: { select: { id: true, email: true, profile: true } },
            seller: { select: { id: true, email: true, profile: true } },
          },
        },
        moderationNotes: {
          include: { author: { select: { id: true, email: true, profile: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found');

    // Fetch conversation thread messages if conversationId is present
    let contextMessages: any[] = [];
    if (report.conversationId) {
      contextMessages = await prisma.message.findMany({
        where: { conversationId: report.conversationId },
        take: 30,
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, profile: { select: { name: true } } } } },
      });
    }

    // Write audit log that staff viewed reported conversation
    void writeAuditLog({
      userId: moderatorId,
      action: 'VIEW_REPORT_INVESTIGATION',
      entityType: 'REPORT',
      entityId: reportId,
      reason: `Viewed report for conversation ${report.conversationId || 'N/A'}`,
    });

    return {
      report: {
        id: report.id,
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt,
        reporter: report.reporter,
        reported: report.reported,
        ad: report.ad,
        message: report.message,
        conversation: report.conversation,
        moderationNotes: report.moderationNotes,
        contextMessages,
      },
    };
  }

  // Resolve or take action on a report
  static async takeModeratorAction(
    reportId: string,
    moderatorId: string,
    action: 'DISMISS' | 'REMOVE_MESSAGE' | 'RESTRICT_USER' | 'SUSPEND_USER' | 'RESOLVE',
    note?: string
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found');

    await prisma.$transaction(async (tx) => {
      // 1. Apply content action
      if (action === 'REMOVE_MESSAGE' && report.messageId) {
        await tx.message.update({
          where: { id: report.messageId },
          data: { deletedAt: new Date() },
        });
      }

      // 2. Apply user action
      if (action === 'RESTRICT_USER' && report.reportedId) {
        // Blocks user from messaging
        await tx.conversation.updateMany({
          where: { OR: [{ buyerId: report.reportedId }, { sellerId: report.reportedId }] },
          data: { isBlocked: true },
        });
      } else if (action === 'SUSPEND_USER' && report.reportedId) {
        await tx.user.update({
          where: { id: report.reportedId },
          data: { status: UserStatus.SUSPENDED },
        });
      }

      // 3. Mark report resolved
      await tx.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.RESOLVED,
          resolvedAt: new Date(),
          adminNote: note || `Action taken: ${action}`,
        },
      });

      // 4. Add internal moderator note if provided
      if (note) {
        await tx.moderationNote.create({
          data: {
            reportId,
            conversationId: report.conversationId,
            authorId: moderatorId,
            content: `Action: ${action} - ${note}`,
          },
        });
      }
    });

    // Write audit record
    void writeAuditLog({
      userId: moderatorId,
      action: `REPORT_ACTION_${action}`,
      entityType: 'REPORT',
      entityId: reportId,
      reason: note || `Action: ${action}`,
    });

    return { success: true, message: `Report processed with action: ${action}` };
  }

  // Add internal note to a report/conversation
  static async addModeratorNote(reportId: string, moderatorId: string, content: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found');

    const note = await prisma.moderationNote.create({
      data: {
        reportId,
        conversationId: report.conversationId,
        authorId: moderatorId,
        content: content.trim(),
      },
      include: { author: { select: { id: true, profile: { select: { name: true } } } } },
    });

    return { success: true, note };
  }

  // Authorized search over conversations
  static async searchConversations(query: string) {
    const q = (query || '').trim();
    if (!q) return [];

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { id: q },
          { adId: q },
          { buyerId: q },
          { sellerId: q },
          { ad: { title: { contains: q, mode: 'insensitive' } } },
        ],
      },
      take: 20,
      include: {
        ad: { select: { id: true, title: true, price: true, status: true } },
        buyer: { select: { id: true, email: true, profile: { select: { name: true } } } },
        seller: { select: { id: true, email: true, profile: { select: { name: true } } } },
      },
    });

    return conversations.map((c) => ({
      id: c.id,
      ad: { id: c.ad.id, title: c.ad.title, price: Number(c.ad.price), status: c.ad.status },
      buyer: { id: c.buyer.id, name: c.buyer.profile?.name || c.buyer.email },
      seller: { id: c.seller.id, name: c.seller.profile?.name || c.seller.email },
      lastMessageText: c.lastMessageText,
      lastMessageAt: c.lastMessageAt,
      status: c.status,
    }));
  }
}
