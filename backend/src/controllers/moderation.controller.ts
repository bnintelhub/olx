import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { AdStatus, ReportReason, ReportStatus, BoostType, BoostStatus } from '@prisma/client';
import { writeAuditLog } from '../utils/audit';
import { SettingsService } from '../services/settings.service';
import { sendConfiguredNotification } from '../services/notification.service';

export class ModerationController {
  /**
   * GET /api/v1/moderation/pending
   * Returns list of ads awaiting moderation review
   */
  static async getPendingAds(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ads = await prisma.ad.findMany({
        where: { status: AdStatus.PENDING_REVIEW },
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { sortOrder: 'asc' } },
          reports: { select: { id: true, reason: true, details: true } },
          user: {
            select: {
              id: true,
              phoneNumber: true,
              role: true,
              profile: { select: { name: true, ratingAverage: true } },
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          ads,
          total: ads.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/moderation/ads/:id/review
   * Approve or reject an ad listing
   */
  static async reviewAd(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { action, rejectionReason } = req.body;

      if (!action || !['APPROVE', 'REJECT'].includes(action)) {
        throw new AppError(400, 'INVALID_ACTION', 'Action must be APPROVE or REJECT');
      }

      const ad = await prisma.ad.findUnique({ where: { id } });
      if (!ad) {
        throw new AppError(404, 'AD_NOT_FOUND', 'Ad listing not found');
      }
      if (ad.status !== AdStatus.PENDING_REVIEW) {
        throw new AppError(409, 'INVALID_REVIEW_STATE', 'Only listings pending review can be approved or rejected');
      }
      if (action === 'REJECT' && !String(rejectionReason || '').trim()) {
        throw new AppError(400, 'REASON_REQUIRED', 'Rejection reason is required when rejecting an ad');
      }

      let updated: Awaited<ReturnType<typeof prisma.ad.update>>;
      if (action === 'APPROVE') {
        const result = await prisma.ad.updateMany({
          where: { id, status: AdStatus.PENDING_REVIEW },
          data: {
            status: AdStatus.ACTIVE,
            rejectionReason: null,
            renewedAt: new Date(),
            expiresAt: new Date(Date.now() + await SettingsService.get<number>('listingExpiryDays') * 24 * 60 * 60 * 1000),
          },
        });
        if (result.count !== 1) throw new AppError(409, 'DUPLICATE_ACTION', 'Listing was already reviewed');
        updated = await prisma.ad.findUniqueOrThrow({ where: { id } });
      } else {
        const result = await prisma.ad.updateMany({
          where: { id, status: AdStatus.PENDING_REVIEW },
          data: {
            status: AdStatus.REJECTED,
            rejectionReason: String(rejectionReason).trim(),
          },
        });
        if (result.count !== 1) throw new AppError(409, 'DUPLICATE_ACTION', 'Listing was already reviewed');
        updated = await prisma.ad.findUniqueOrThrow({ where: { id } });
      }
      await writeAuditLog({
        userId: req.user?.id,
        action: action === 'APPROVE' ? 'MODERATION_APPROVE_AD' : 'MODERATION_REJECT_AD',
        entityType: 'AD',
        entityId: id,
        oldData: { status: ad.status },
        newData: { status: updated.status, rejectionReason: updated.rejectionReason },
        request: req,
      });
      await sendConfiguredNotification({ userId: ad.userId, type: action === 'REJECT' ? 'AD_REJECTED' : 'AD_APPROVED', templateKey: action === 'REJECT' ? 'LISTING_REJECTED' : 'LISTING_APPROVED', values: { title: ad.title, reason: String(rejectionReason || '') }, data: { adId: id, status: updated.status } });

      res.status(200).json({
        success: true,
        data: updated,
        message: `Ad has been ${action === 'APPROVE' ? 'approved and made active' : 'rejected'}.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/moderation/reports
   * File a report against an ad
   */
  static async reportAd(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const reporterId = req.user!.id;
      const { adId, messageId, conversationId, reason, details } = req.body;

      if (!adId && !messageId) {
        throw new AppError(400, 'REPORT_TARGET_REQUIRED', 'An ad or message ID is required');
      }

      if (!reason || !Object.values(ReportReason).includes(reason)) {
        throw new AppError(400, 'INVALID_REASON', 'Valid report reason is required');
      }

      const ad = adId ? await prisma.ad.findUnique({ where: { id: adId } }) : null;
      if (adId && !ad) throw new AppError(404, 'AD_NOT_FOUND', 'Ad listing not found');
      const message = messageId ? await prisma.message.findUnique({ where: { id: messageId }, include: { conversation: true } }) : null;
      if (messageId && !message) throw new AppError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
      const targetConversationId = conversationId || message?.conversationId;
      if (message && (message.conversation.buyerId !== reporterId && message.conversation.sellerId !== reporterId)) {
        throw new AppError(403, 'FORBIDDEN', 'You can only report a message in your own conversation');
      }

      const report = await prisma.report.create({
        data: {
          reporterId,
          reportedId: ad?.userId || (message?.senderId === reporterId ? null : message?.senderId),
          adId: ad?.id,
          conversationId: targetConversationId,
          messageId: message?.id,
          reason: reason as ReportReason,
          details: details ? String(details) : undefined,
          status: ReportStatus.PENDING,
        },
      });

      // Auto-escalation: If an ad gets 3 or more reports, move it to PENDING_REVIEW
      const pendingReportsCount = ad ? await prisma.report.count({
        where: { adId, status: ReportStatus.PENDING },
      }) : 0;

      if (ad && pendingReportsCount >= 3 && ad.status === AdStatus.ACTIVE) {
        await prisma.ad.update({
          where: { id: adId },
          data: {
            status: AdStatus.PENDING_REVIEW,
            rejectionReason: 'Temporarily hidden for review due to multiple user reports',
          },
        });
      }

      res.status(201).json({
        success: true,
        data: report,
        message: 'Thank you for reporting. Our safety team will review this listing.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/moderation/reports
   * Returns list of user filed reports
   */
  static async getReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const reports = await prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              phoneNumber: true,
              profile: { select: { name: true } },
            },
          },
          ad: {
            select: {
              id: true,
              title: true,
              price: true,
              status: true,
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          reports,
          total: reports.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/moderation/reports/:id
   * Resolve or dismiss a user report
   */
  static async resolveReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, adminNote, takeDownAd } = req.body;

      if (!status || !Object.values(ReportStatus).includes(status)) {
        throw new AppError(400, 'INVALID_STATUS', 'Valid report status is required');
      }

      const report = await prisma.report.findUnique({ where: { id } });
      if (!report) {
        throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found');
      }

      const updated = await prisma.report.update({
        where: { id },
        data: {
          status: status as ReportStatus,
          adminNote: adminNote ? String(adminNote) : undefined,
        },
      });

      // Optionally take down the reported ad
      if (takeDownAd && report.adId) {
        await prisma.ad.update({
          where: { id: report.adId },
          data: {
            status: AdStatus.REJECTED,
            rejectionReason: adminNote || 'Removed by moderator due to safety violations',
          },
        });
      }

      await writeAuditLog({
        userId: req.user?.id,
        action: 'MODERATION_RESOLVE_REPORT',
        entityType: 'REPORT',
        entityId: id,
        oldData: { status: report.status },
        newData: { status: updated.status, takeDownAd: Boolean(takeDownAd) },
        request: req,
      });

      res.status(200).json({
        success: true,
        data: updated,
        message: `Report status updated to ${status}`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/moderation/blocks
   * Block a user
   */
  static async blockUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const blockerId = req.user!.id;
      const { blockedId } = req.body;

      if (!blockedId) {
        throw new AppError(400, 'BLOCKED_ID_REQUIRED', 'User ID to block is required');
      }

      if (blockerId === blockedId) {
        throw new AppError(400, 'CANNOT_BLOCK_SELF', 'You cannot block yourself');
      }

      const block = await prisma.block.upsert({
        where: {
          blockerId_blockedId: { blockerId, blockedId },
        },
        create: { blockerId, blockedId },
        update: {},
      });

      res.status(200).json({
        success: true,
        data: block,
        message: 'User has been blocked from contacting you.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/moderation/ads/:id/boost
   * Boost an ad listing as FEATURED
   */
  static async boostAd(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { type = 'FEATURED', days = 7 } = req.body;

      const ad = await prisma.ad.findUnique({ where: { id } });
      if (!ad) {
        throw new AppError(404, 'AD_NOT_FOUND', 'Ad listing not found');
      }

      const durationDays = Math.max(1, Math.min(30, Number(days) || 7));
      const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      const featured = await prisma.featuredAd.create({
        data: {
          adId: id,
          type: type as BoostType,
          status: BoostStatus.ACTIVE,
          startsAt: new Date(),
          endsAt,
        },
      });

      await writeAuditLog({
        userId: req.user?.id,
        action: 'MODERATION_BOOST_AD',
        entityType: 'AD',
        entityId: id,
        newData: { type, durationDays, endsAt },
        request: req,
      });

      res.status(200).json({
        success: true,
        data: featured,
        message: `Ad has been boosted as ${type} for ${durationDays} days.`,
      });
    } catch (err) {
      next(err);
    }
  }
}
