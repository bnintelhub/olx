import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { AdStatus, ReportReason, ReportStatus } from '@prisma/client';
import { SETTING_DEFAULTS } from '../../config/constants';
import { dispatchNotificationJob } from '../../jobs/notification.job';

export class ReportsService {
  static async reportAd(reporterId: string, adId: string, reason: ReportReason, details: string) {
    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');

    if (ad.userId === reporterId) {
      throw new AppError(400, 'CANNOT_REPORT_OWN_AD', 'You cannot report your own listing');
    }

    const existing = await prisma.report.findFirst({
      where: { reporterId, adId, status: { in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW] } },
    });
    if (existing) {
      throw new AppError(409, 'ALREADY_REPORTED', 'You have already submitted a report for this listing');
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedId: ad.userId,
        adId,
        reason,
        details,
        status: ReportStatus.PENDING,
      },
    });

    const reportCount = await prisma.report.count({
      where: { adId, status: { in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW] } },
    });

    if (reportCount >= 3 && ad.status === AdStatus.ACTIVE) {
      await prisma.ad.update({
        where: { id: adId },
        data: {
          status: AdStatus.PENDING_REVIEW,
          rejectionReason: 'Auto-flagged: listing received multiple fraud/counterfeit reports from users',
        },
      });
    }

    return report;
  }

  static async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new AppError(400, 'INVALID_BLOCK', 'You cannot block yourself');
    }

    return prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
  }

  static async getPendingAds() {
    return prisma.ad.findMany({
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
  }

  static async reviewAd(id: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');

    if (ad.status !== AdStatus.PENDING_REVIEW) {
      throw new AppError(409, 'INVALID_REVIEW_STATE', 'Only listings pending review can be approved or rejected');
    }

    if (action === 'APPROVE') {
      const updated = await prisma.ad.update({
        where: { id },
        data: {
          status: AdStatus.ACTIVE,
          rejectionReason: null,
          renewedAt: new Date(),
          expiresAt: new Date(Date.now() + (SETTING_DEFAULTS.listingExpiryDays as number) * 24 * 60 * 60 * 1000),
        },
      });

      void dispatchNotificationJob({
        userId: ad.userId,
        type: 'AD_APPROVED',
        title: 'Listing Approved',
        body: `Your listing "${ad.title}" is now active!`,
      });

      return updated;
    } else {
      if (!rejectionReason?.trim()) {
        throw new AppError(400, 'REASON_REQUIRED', 'Rejection reason is required');
      }

      const updated = await prisma.ad.update({
        where: { id },
        data: {
          status: AdStatus.REJECTED,
          rejectionReason: rejectionReason.trim(),
        },
      });

      void dispatchNotificationJob({
        userId: ad.userId,
        type: 'AD_REJECTED',
        title: 'Listing Rejected',
        body: `Your listing "${ad.title}" was rejected: ${rejectionReason}`,
      });

      return updated;
    }
  }

  static async getReports(status?: ReportStatus) {
    return prisma.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        ad: { select: { id: true, title: true, status: true, price: true } },
        reporter: { select: { id: true, phoneNumber: true, profile: { select: { name: true } } } },
        reported: { select: { id: true, phoneNumber: true, status: true, profile: { select: { name: true } } } },
      },
    });
  }

  static async resolveReport(id: string, body: any) {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found');

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: body.status,
        resolutionReason: body.resolutionReason,
        adminNote: body.adminNote,
      },
    });

    if (body.takeDownAd && report.adId) {
      await prisma.ad.update({
        where: { id: report.adId },
        data: { status: AdStatus.REJECTED, rejectionReason: `Taken down due to report: ${body.resolutionReason}` },
      });
    }

    if (body.banUser && report.reportedId) {
      await prisma.user.update({
        where: { id: report.reportedId },
        data: { status: 'BANNED' },
      });
    }

    return updated;
  }
}
