import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { AdStatus, UserRole, Prisma, ReportStatus, TicketPriority, TicketStatus } from '@prisma/client';
import { writeAuditLog } from '../utils/audit';
import { sendConfiguredNotification } from '../services/notification.service';
import { env } from '../config/env';

export class AdminController {
  private static maskContact(value: string | null | undefined): string | null {
    if (!value) return null;
    if (value.includes('@')) {
      const [local, domain] = value.split('@');
      return `${local.slice(0, 1)}***@${domain}`;
    }
    return `${value.slice(0, 3)}******${value.slice(-2)}`;
  }

  static async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      const role = typeof req.query.role === 'string' ? req.query.role : '';
      const accountType = typeof req.query.accountType === 'string' ? req.query.accountType : '';
      const where: Prisma.UserWhereInput = { status: { not: 'DELETED' } };
      if (status && Object.values(['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED']).includes(status)) {
        where.status = status as Prisma.UserWhereInput['status'];
      }
      if (role && Object.values(UserRole).includes(role as UserRole)) where.role = role as UserRole;
      if (accountType) where.profile = { accountType };
      if (q) {
        where.OR = [
          { id: q },
          { phoneNumber: { contains: q } },
          { email: { contains: q } },
          { profile: { name: { contains: q } } },
          { profile: { businessName: { contains: q } } },
        ];
      }
      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true, phoneNumber: true, email: true, role: true, status: true,
            isPhoneVerified: true, isEmailVerified: true, createdAt: true, lastLoginAt: true,
            profile: { select: { name: true, avatarUrl: true, accountType: true, businessName: true } },
            _count: { select: { ads: true, reportsFiled: true, reportsReceived: true } },
          },
        }),
      ]);
      const sensitive = req.user?.role === UserRole.ADMIN;
      res.json({
        success: true,
        data: {
          users: users.map((user) => ({
            ...user,
            phoneNumber: sensitive ? user.phoneNumber : AdminController.maskContact(user.phoneNumber),
            email: sensitive ? user.email : AdminController.maskContact(user.email),
          })),
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUserDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id : '';
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          profile: { include: { location: true } },
          ads: {
            where: { deletedAt: null },
            orderBy: { updatedAt: 'desc' },
            take: 100,
            include: { category: { select: { name: true } }, location: { select: { name: true } }, reports: { select: { id: true } }, images: { take: 1, orderBy: { sortOrder: 'asc' } } },
          },
          reportsFiled: { orderBy: { createdAt: 'desc' }, take: 50, include: { ad: { select: { id: true, title: true } } } },
          reportsReceived: { orderBy: { createdAt: 'desc' }, take: 50, include: { ad: { select: { id: true, title: true } } } },
          auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User account not found');
      const sensitive = req.user?.role === UserRole.ADMIN;
      res.json({
        success: true,
        data: {
          user: {
            ...user,
            phoneNumber: sensitive ? user.phoneNumber : AdminController.maskContact(user.phoneNumber),
            email: sensitive ? user.email : AdminController.maskContact(user.email),
            refreshTokenHash: undefined,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateUserAction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        throw new AppError(403, 'FORBIDDEN', 'Only administrators can change account status');
      }
      const id = typeof req.params.id === 'string' ? req.params.id : '';
      const { action, reason, accountType, businessName } = req.body as {
        action?: string; reason?: string; accountType?: string; businessName?: string;
      };
      if (!reason || String(reason).trim().length < 5) {
        throw new AppError(400, 'REASON_REQUIRED', 'A reason of at least 5 characters is required');
      }
      if (id === req.user.id) throw new AppError(409, 'SELF_ACTION_NOT_ALLOWED', 'You cannot change your own account');
      const user = await prisma.user.findUnique({ where: { id }, include: { profile: true } });
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User account not found');
      if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) {
        throw new AppError(403, 'PRIVILEGED_ACCOUNT', 'Privileged accounts cannot be changed here');
      }

      const validActions = ['SUSPEND', 'UNSUSPEND', 'BAN', 'DEACTIVATE', 'DELETE', 'RESTORE', 'CLASSIFY'];
      if (!action || !validActions.includes(action)) throw new AppError(400, 'INVALID_ACTION', 'Unsupported account action');
      if (action === 'CLASSIFY' && !['INDIVIDUAL', 'DEALER', 'BUSINESS'].includes(String(accountType))) {
        throw new AppError(400, 'INVALID_ACCOUNT_TYPE', 'Valid account type is required');
      }
      const oldData = { status: user.status, accountType: user.profile?.accountType, businessName: user.profile?.businessName };
      let updatedStatus = user.status;
      if (action === 'CLASSIFY') {
        await prisma.profile.upsert({
          where: { userId: id },
          create: { userId: id, name: user.profile?.name || 'User', accountType: String(accountType), businessName: businessName?.trim() || null },
          update: { accountType: String(accountType), businessName: businessName?.trim() || null },
        });
      } else {
        const statusByAction = { SUSPEND: 'SUSPENDED', UNSUSPEND: 'ACTIVE', BAN: 'BANNED', DEACTIVATE: 'SUSPENDED', DELETE: 'DELETED', RESTORE: 'ACTIVE' } as const;
        const nextStatus = statusByAction[action as keyof typeof statusByAction];
        if (user.status === nextStatus) throw new AppError(409, 'DUPLICATE_ACTION', 'Account is already in this state');
        if (action === 'RESTORE' && user.status === 'DELETED') {
          throw new AppError(409, 'DELETED_ACCOUNT', 'Deleted accounts cannot be restored after anonymization');
        }
        const updated = await prisma.user.update({
          where: { id },
          data: {
            status: nextStatus,
            refreshTokenHash: null,
            phoneNumber: action === 'DELETE' ? null : undefined,
            email: action === 'DELETE' ? null : undefined,
            googleId: action === 'DELETE' ? null : undefined,
            isPhoneVerified: action === 'DELETE' ? false : undefined,
            isEmailVerified: action === 'DELETE' ? false : undefined,
          },
        });
        updatedStatus = updated.status;
        if (action === 'DELETE') {
          await prisma.profile.updateMany({ where: { userId: id }, data: { name: 'Deleted user', businessName: null, bio: null, avatarUrl: null } });
        }
        if (nextStatus === 'BANNED' || nextStatus === 'DELETED') {
          await prisma.ad.updateMany({ where: { userId: id, status: AdStatus.ACTIVE }, data: { status: AdStatus.ARCHIVED, rejectionReason: nextStatus === 'BANNED' ? 'Seller account banned' : 'Seller account deleted' } });
        }
        if (action === 'RESTORE') {
          await prisma.ad.updateMany({ where: { userId: id, status: AdStatus.ARCHIVED, rejectionReason: 'Seller account banned' }, data: { status: AdStatus.PENDING_REVIEW, rejectionReason: null } });
        }
        if (nextStatus !== 'ACTIVE' && nextStatus !== 'DELETED') {
          const actionLabel = action === 'BAN' ? 'banned' : action === 'SUSPEND' || action === 'DEACTIVATE' ? 'suspended' : 'updated';
          await prisma.notification.create({ data: { userId: id, type: 'SYSTEM_ALERT', title: 'Account action applied', body: `Your account has been ${actionLabel}: ${String(reason).trim()}`, data: { action } } });
        }
      }
      await writeAuditLog({ userId: req.user.id, action: `ADMIN_USER_${action}`, entityType: 'USER', entityId: id, oldData, newData: { status: updatedStatus, accountType, businessName, reason: String(reason).trim() }, request: req });
      res.json({ success: true, data: { id, action, status: updatedStatus }, message: 'User action applied successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/stats
   * Comprehensive marketplace metrics for Admin Dashboard
   */
  static async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const requestedFrom = typeof req.query.from === 'string' ? new Date(req.query.from) : null;
      const requestedTo = typeof req.query.to === 'string' ? new Date(req.query.to) : null;
      const to = requestedTo && !Number.isNaN(requestedTo.getTime()) ? requestedTo : new Date();
      const from =
        requestedFrom && !Number.isNaN(requestedFrom.getTime())
          ? requestedFrom
          : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);

      const activeUserWhere = { status: 'ACTIVE' as const, role: { not: UserRole.ADMIN } };
      const [
        totalAds,
        activeAds,
        pendingAds,
        rejectedAds,
        soldAds,
        totalCategories,
        totalUsers,
        activeUsers,
        totalReports,
        totalConversations,
        listingsByDay,
        usersByDay,
        citiesWithCount,
        pendingQueue,
        recentReports,
        recentActivity,
      ] = await Promise.all([
        prisma.ad.count({ where: { deletedAt: null } }),
        prisma.ad.count({ where: { status: AdStatus.ACTIVE } }),
        prisma.ad.count({ where: { status: AdStatus.PENDING_REVIEW } }),
        prisma.ad.count({ where: { status: AdStatus.REJECTED } }),
        prisma.ad.count({ where: { status: AdStatus.SOLD } }),
        prisma.category.count(),
        prisma.user.count({ where: { status: { not: 'DELETED' } } }),
        prisma.user.count({ where: activeUserWhere }),
        prisma.report.count({ where: { status: 'PENDING' } }),
        prisma.conversation.count(),
        prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(Prisma.sql`
          SELECT DATE(created_at) AS date, COUNT(*) AS count
          FROM ads
          WHERE created_at >= ${from} AND created_at <= ${to} AND deleted_at IS NULL
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at)
        `),
        prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(Prisma.sql`
          SELECT DATE(created_at) AS date, COUNT(*) AS count
          FROM users
          WHERE created_at >= ${from} AND created_at <= ${to} AND status <> 'DELETED'
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at)
        `),
        prisma.location.findMany({
          where: { ads: { some: { deletedAt: null } } },
          select: {
            id: true,
            name: true,
            _count: { select: { ads: true } },
          },
          orderBy: { ads: { _count: 'desc' } },
          take: 10,
        }),
        prisma.ad.findMany({
          where: { status: AdStatus.PENDING_REVIEW },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            createdAt: true,
            category: { select: { name: true } },
            location: { select: { name: true } },
          },
        }),
        prisma.report.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
            ad: { select: { id: true, title: true } },
          },
        }),
        prisma.auditLog.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true,
            user: { select: { profile: { select: { name: true } } } },
          },
        }),
      ]);

      // Category breakdown (all parent categories)
      const categoriesWithCount = await prisma.category.findMany({
        where: { parentId: null },
        include: {
          _count: { select: { ads: true } },
        },
        orderBy: { displayOrder: 'asc' },
      });

      // Recent 10 ads
      const recentAds = await prisma.ad.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { name: true } },
          location: { select: { name: true } },
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          user: { select: { phoneNumber: true, profile: { select: { name: true } } } },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalAds,
            activeAds,
            pendingAds,
            rejectedAds,
            soldAds,
            totalCategories,
            totalUsers,
            activeUsers,
            totalReports,
            totalConversations,
          },
          dateRange: { from: from.toISOString(), to: to.toISOString() },
          categoryBreakdown: categoriesWithCount.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            iconUrl: c.iconUrl,
            count: c._count.ads,
          })),
          recentAds,
          trends: {
            listings: listingsByDay.map((point) => ({
              date: new Date(point.date).toISOString().slice(0, 10),
              count: Number(point.count),
            })),
            users: usersByDay.map((point) => ({
              date: new Date(point.date).toISOString().slice(0, 10),
              count: Number(point.count),
            })),
          },
          cityBreakdown: citiesWithCount.map((city) => ({
            id: city.id,
            name: city.name,
            count: city._count.ads,
          })),
          pendingQueue,
          recentReports,
          recentActivity,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/ads
   * Paginated list of all ads for Admin Management
   */
  static async getAds(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const status = req.query.status as string;
      const categoryId = req.query.categoryId as string;
      const locationId = req.query.locationId as string;
      const sellerId = req.query.sellerId as string;
      const reported = req.query.reported as string;
      const sort = (req.query.sort as string) || 'createdAt';
      const order: Prisma.SortOrder = req.query.order === 'asc' ? 'asc' : 'desc';
      const search = typeof req.query.q === 'string' ? req.query.q : undefined;
      const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
      const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
      const from = req.query.from ? new Date(String(req.query.from)) : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;

      if (from && Number.isNaN(from.getTime())) throw new AppError(400, 'INVALID_DATE', 'Invalid from date');
      if (to && Number.isNaN(to.getTime())) throw new AppError(400, 'INVALID_DATE', 'Invalid to date');
      if (from && to && from > to) throw new AppError(400, 'INVALID_DATE_RANGE', 'from must be before to');
      if (minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) {
        throw new AppError(400, 'INVALID_PRICE', 'Invalid minimum price');
      }
      if (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
        throw new AppError(400, 'INVALID_PRICE', 'Invalid maximum price');
      }
      if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
        throw new AppError(400, 'INVALID_PRICE_RANGE', 'Minimum price must not exceed maximum price');
      }

      const where: Prisma.AdWhereInput = { deletedAt: null };

      if (status && status !== 'ALL') {
        if (!Object.values(AdStatus).includes(status as AdStatus)) {
          throw new AppError(400, 'INVALID_STATUS', 'Invalid listing status');
        }
        where.status = status as AdStatus;
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }
      if (locationId) where.locationId = locationId;
      if (sellerId) where.userId = sellerId;
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = { gte: minPrice, lte: maxPrice };
      }
      if (from || to) {
        where.createdAt = { gte: from, lte: to };
      }
      if (reported === 'true') where.reports = { some: {} };
      if (reported === 'false') where.reports = { none: {} };

      if (search && search.trim()) {
        where.OR = [
          { title: { contains: search.trim() } },
          { description: { contains: search.trim() } },
          { id: search.trim() },
        ];
      }

      const orderBy: Prisma.AdOrderByWithRelationInput =
        sort === 'price' ? { price: order } :
        sort === 'updatedAt' ? { updatedAt: order } :
        sort === 'expiresAt' ? { expiresAt: order } :
        { createdAt: order };

      const [total, ads] = await Promise.all([
        prisma.ad.count({ where }),
        prisma.ad.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
          include: {
            category: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            images: { orderBy: { sortOrder: 'asc' } },
            user: { select: { id: true, phoneNumber: true, profile: { select: { name: true } } } },
            reports: { select: { id: true, reason: true } },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          ads,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAdDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id : '';
      if (!id) throw new AppError(400, 'AD_ID_REQUIRED', 'Listing ID is required');
      const ad = await prisma.ad.findFirst({
        where: { id, deletedAt: null },
        include: {
          category: { include: { attributes: true } },
          location: true,
          images: { orderBy: { sortOrder: 'asc' } },
          attributeValues: { include: { attribute: true } },
          user: {
            select: {
              id: true, phoneNumber: true, email: true, role: true, status: true,
              createdAt: true, lastLoginAt: true,
              profile: { include: { location: true } },
            },
          },
          reports: {
            orderBy: { createdAt: 'desc' },
            include: { reporter: { select: { id: true, phoneNumber: true, profile: { select: { name: true } } } } },
          },
        },
      });
      if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Ad listing not found');

      const history = await prisma.auditLog.findMany({
        where: { entityType: 'AD', entityId: ad.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { user: { select: { id: true, role: true, profile: { select: { name: true } } } } },
      });

      res.json({ success: true, data: { ad, history } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/ads/:id/status
   * Admin status update (ACTIVE, PENDING_REVIEW, SOLD, REJECTED, ARCHIVED)
   */
  static async updateAdStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, rejectionReason } = req.body;

      if (!status || !Object.values(AdStatus).includes(status)) {
        throw new AppError(400, 'INVALID_STATUS', 'Valid ad status is required');
      }

      const ad = await prisma.ad.findUnique({ where: { id } });
      if (!ad) {
        throw new AppError(404, 'AD_NOT_FOUND', 'Ad listing not found');
      }

      if (ad.status === status) {
        throw new AppError(409, 'DUPLICATE_ACTION', 'Listing is already in this status');
      }
      const allowedTransitions: Record<AdStatus, AdStatus[]> = {
        DRAFT: [AdStatus.PENDING_REVIEW, AdStatus.ARCHIVED],
        PENDING_REVIEW: [AdStatus.ACTIVE, AdStatus.REJECTED, AdStatus.ARCHIVED],
        ACTIVE: [AdStatus.SOLD, AdStatus.PENDING_REVIEW, AdStatus.ARCHIVED, AdStatus.EXPIRED],
        REJECTED: [AdStatus.PENDING_REVIEW, AdStatus.ARCHIVED],
        EXPIRED: [AdStatus.ACTIVE, AdStatus.ARCHIVED],
        SOLD: [AdStatus.ARCHIVED],
        ARCHIVED: [AdStatus.PENDING_REVIEW],
      };
      if (!allowedTransitions[ad.status].includes(status as AdStatus)) {
        throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Cannot change listing from ${ad.status} to ${status}`);
      }
      if (status === AdStatus.REJECTED && !String(rejectionReason || '').trim()) {
        throw new AppError(400, 'REASON_REQUIRED', 'Rejection reason is required');
      }

      const updated = await prisma.ad.updateMany({
        where: { id, status: ad.status, deletedAt: null },
        data: {
          status,
          rejectionReason: status === AdStatus.REJECTED ? String(rejectionReason).trim() : null,
        },
      });
      if (updated.count !== 1) throw new AppError(409, 'DUPLICATE_ACTION', 'Listing was changed by another moderator');
      const updatedAd = await prisma.ad.findUniqueOrThrow({ where: { id } });

      await writeAuditLog({
        userId: req.user?.id,
        action: 'ADMIN_UPDATE_AD_STATUS',
        entityType: 'AD',
        entityId: id,
        oldData: { status: ad.status },
        newData: { status: updatedAd.status, rejectionReason: updatedAd.rejectionReason },
        request: req,
      });
      await prisma.notification.create({
        data: {
          userId: ad.userId,
          type: status === AdStatus.REJECTED ? 'AD_REJECTED' : 'AD_APPROVED',
          title: status === AdStatus.REJECTED ? 'Listing rejected' : 'Listing approved',
          body: status === AdStatus.REJECTED
            ? `Your listing "${ad.title}" was rejected: ${String(rejectionReason).trim()}`
            : `Your listing "${ad.title}" is now live.`,
          data: { adId: ad.id, status: updatedAd.status },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedAd,
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkUpdateAdStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { ids, status, rejectionReason } = req.body as { ids?: unknown; status?: string; rejectionReason?: string };
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 || ids.some((id) => typeof id !== 'string')) {
        throw new AppError(400, 'INVALID_IDS', 'Select between 1 and 50 valid listing IDs');
      }
      if (!status || !Object.values(AdStatus).includes(status as AdStatus)) {
        throw new AppError(400, 'INVALID_STATUS', 'Valid listing status is required');
      }
      if (status === AdStatus.REJECTED && !String(rejectionReason || '').trim()) {
        throw new AppError(400, 'REASON_REQUIRED', 'Rejection reason is required');
      }
      const ads = await prisma.ad.findMany({ where: { id: { in: ids as string[] }, deletedAt: null } });
      if (ads.length !== ids.length) throw new AppError(404, 'AD_NOT_FOUND', 'One or more listings were not found');
      const allowed: Record<AdStatus, AdStatus[]> = {
        DRAFT: [AdStatus.PENDING_REVIEW, AdStatus.ARCHIVED], PENDING_REVIEW: [AdStatus.ACTIVE, AdStatus.REJECTED, AdStatus.ARCHIVED],
        ACTIVE: [AdStatus.SOLD, AdStatus.PENDING_REVIEW, AdStatus.ARCHIVED, AdStatus.EXPIRED], REJECTED: [AdStatus.PENDING_REVIEW, AdStatus.ARCHIVED],
        EXPIRED: [AdStatus.ACTIVE, AdStatus.ARCHIVED], SOLD: [AdStatus.ARCHIVED], ARCHIVED: [AdStatus.PENDING_REVIEW],
      };
      if (ads.some((ad) => ad.status === status || !allowed[ad.status].includes(status as AdStatus))) {
        throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'At least one selected listing cannot make this transition');
      }
      const data = { status: status as AdStatus, rejectionReason: status === AdStatus.REJECTED ? String(rejectionReason).trim() : null };
      await prisma.$transaction(ads.map((ad) => prisma.ad.update({ where: { id: ad.id }, data })));
      await Promise.all(ads.map((ad) => writeAuditLog({
        userId: req.user?.id, action: 'ADMIN_BULK_UPDATE_AD_STATUS', entityType: 'AD', entityId: ad.id,
        oldData: { status: ad.status }, newData: data, request: req,
      })));
      await prisma.notification.createMany({
        data: ads.map((ad) => ({
          userId: ad.userId,
          type: status === AdStatus.REJECTED ? 'AD_REJECTED' as const : 'AD_APPROVED' as const,
          title: status === AdStatus.REJECTED ? 'Listing rejected' : 'Listing approved',
          body: status === AdStatus.REJECTED ? `Your listing was rejected: ${String(rejectionReason).trim()}` : 'Your listing is now live.',
          data: { adId: ad.id, status },
        })),
      });
      res.json({ success: true, data: { updated: ads.length } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/admin/ads/:id
   * Admin permanently delete ad listing
   */
  static async deleteAd(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      const ad = await prisma.ad.findUnique({ where: { id } });
      if (!ad) {
        throw new AppError(404, 'AD_NOT_FOUND', 'Ad listing not found');
      }

      // Delete associated images, favorites, reports, conversation references
      await prisma.adImage.deleteMany({ where: { adId: id } });
      await prisma.favourite.deleteMany({ where: { adId: id } });
      await prisma.report.deleteMany({ where: { adId: id } });
      await prisma.ad.delete({ where: { id } });

      await writeAuditLog({
        userId: req.user?.id,
        action: 'ADMIN_DELETE_AD',
        entityType: 'AD',
        entityId: id,
        oldData: { title: ad.title, status: ad.status },
        request: req,
      });

      res.status(200).json({
        success: true,
        message: 'Ad listing permanently deleted',
      });
    } catch (err) {
      next(err);
    }
  }

  /** Report operations include assignment, investigation state and an immutable audit trail. */
  static async getReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      const where: Prisma.ReportWhereInput = {};
      if (status && Object.values(ReportStatus).includes(status as ReportStatus)) where.status = status as ReportStatus;
      const reports = await prisma.report.findMany({
        where, orderBy: { updatedAt: 'desc' }, take: 100,
        include: {
          reporter: { select: { id: true, profile: { select: { name: true } } } },
          reported: { select: { id: true, profile: { select: { name: true } } } },
          assignedTo: { select: { id: true, profile: { select: { name: true } } } },
          ad: { select: { id: true, title: true, status: true } },
          conversation: { select: { id: true, isBlocked: true, buyerUnreadCount: true, sellerUnreadCount: true } },
          message: { select: { id: true, conversationId: true, status: true, createdAt: true } },
        },
      });
      res.json({ success: true, data: { reports } });
    } catch (err) { next(err); }
  }

  static async updateReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, assignedToId, internalNote, resolutionReason } = req.body as Record<string, unknown>;
      const report = await prisma.report.findUnique({ where: { id } });
      if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found');
      if (status && !Object.values(ReportStatus).includes(status as ReportStatus)) throw new AppError(400, 'INVALID_STATUS', 'Invalid report status');
      if (assignedToId !== undefined && assignedToId !== null) {
        const assignee = await prisma.user.findUnique({ where: { id: String(assignedToId) }, select: { role: true } });
        if (!assignee || (assignee.role !== UserRole.ADMIN && assignee.role !== UserRole.MODERATOR)) throw new AppError(400, 'INVALID_ASSIGNEE', 'Assignee must be an active moderator or admin');
      }
      const nextStatus = (status || report.status) as ReportStatus;
      if ((nextStatus === ReportStatus.RESOLVED || nextStatus === ReportStatus.DISMISSED) && !String(resolutionReason || report.resolutionReason || '').trim()) {
        throw new AppError(400, 'RESOLUTION_REQUIRED', 'A resolution reason is required when closing a report');
      }
      const updated = await prisma.report.update({ where: { id }, data: {
        status: nextStatus,
        assignedToId: assignedToId === undefined ? undefined : assignedToId ? String(assignedToId) : null,
        adminNote: internalNote === undefined ? undefined : String(internalNote),
        resolutionReason: resolutionReason === undefined ? undefined : String(resolutionReason),
        resolvedAt: (nextStatus === ReportStatus.RESOLVED || nextStatus === ReportStatus.DISMISSED) ? new Date() : null,
      }});
      await writeAuditLog({ userId: req.user?.id, action: 'ADMIN_UPDATE_REPORT', entityType: 'REPORT', entityId: id,
        oldData: { status: report.status, assignedToId: report.assignedToId }, newData: { status: updated.status, assignedToId: updated.assignedToId, internalNote, resolutionReason }, request: req });
      if ((nextStatus === ReportStatus.RESOLVED || nextStatus === ReportStatus.DISMISSED) && report.reporterId) {
        await sendConfiguredNotification({ userId: report.reporterId, type: 'SYSTEM_ALERT', templateKey: 'REPORT_RESOLVED', data: { reportId: id, status: nextStatus } });
      }
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  }

  static async getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const conversations = await prisma.conversation.findMany({ orderBy: { lastMessageAt: 'desc' }, take: 100, include: {
        ad: { select: { id: true, title: true, status: true } },
        buyer: { select: { id: true, profile: { select: { name: true } } } },
        seller: { select: { id: true, profile: { select: { name: true } } } },
        _count: { select: { messages: true, reports: true } },
      }});
      res.json({ success: true, data: { conversations } });
    } catch (err) { next(err); }
  }

  /** Content is deliberately unavailable from the conversation list. It is released only for its linked report and logged. */
  static async getConversationMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.id as string;
      const reportId = String(req.query.reportId || '');
      const accessReason = String(req.query.accessReason || '').trim();
      if (!reportId || accessReason.length < 10) throw new AppError(400, 'CASE_AUTHORIZATION_REQUIRED', 'A linked report ID and a specific access reason are required');
      const report = await prisma.report.findUnique({ where: { id: reportId }, include: { message: { select: { conversationId: true } } } });
      if (!report || (report.conversationId !== conversationId && report.message?.conversationId !== conversationId)) throw new AppError(403, 'CASE_SCOPE_MISMATCH', 'This report does not authorize access to this conversation');
      if (req.user!.role === UserRole.MODERATOR && report.assignedToId !== req.user!.id) throw new AppError(403, 'CASE_NOT_ASSIGNED', 'Only the assigned moderator may access report evidence');
      const messages = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' }, select: { id: true, senderId: true, type: true, content: true, attachmentUrl: true, status: true, createdAt: true } });
      await writeAuditLog({ userId: req.user?.id, action: 'ADMIN_VIEW_RESTRICTED_CHAT_CONTENT', entityType: 'CONVERSATION', entityId: conversationId, newData: { reportId, accessReason }, request: req });
      res.json({ success: true, data: { messages } });
    } catch (err) { next(err); }
  }

  static async getTickets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tickets = await prisma.supportTicket.findMany({ orderBy: { updatedAt: 'desc' }, take: 100, include: {
        requester: { select: { id: true, profile: { select: { name: true } } } }, assignedTo: { select: { id: true, profile: { select: { name: true } } } },
        entries: { orderBy: { createdAt: 'asc' }, include: { author: { select: { profile: { select: { name: true } } } } } },
      }});
      res.json({ success: true, data: { tickets } });
    } catch (err) { next(err); }
  }

  static async updateTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, priority, assignedToId, slaTargetAt, entry, isInternal = true } = req.body as Record<string, unknown>;
      const ticket = await prisma.supportTicket.findUnique({ where: { id } });
      if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
      if (status && !Object.values(TicketStatus).includes(status as TicketStatus)) throw new AppError(400, 'INVALID_STATUS', 'Invalid ticket status');
      if (priority && !Object.values(TicketPriority).includes(priority as TicketPriority)) throw new AppError(400, 'INVALID_PRIORITY', 'Invalid ticket priority');
      const nextStatus = (status || ticket.status) as TicketStatus;
      const updated = await prisma.supportTicket.update({ where: { id }, data: {
        status: nextStatus, priority: priority ? priority as TicketPriority : undefined,
        assignedToId: assignedToId === undefined ? undefined : assignedToId ? String(assignedToId) : null,
        slaTargetAt: slaTargetAt === undefined ? undefined : slaTargetAt ? new Date(String(slaTargetAt)) : null,
        resolvedAt: (nextStatus === TicketStatus.RESOLVED || nextStatus === TicketStatus.CLOSED) ? new Date() : null,
        entries: entry ? { create: { authorId: req.user!.id, body: String(entry), isInternal: Boolean(isInternal) } } : undefined,
      }, include: { entries: { orderBy: { createdAt: 'asc' } } }});
      await writeAuditLog({ userId: req.user?.id, action: 'ADMIN_UPDATE_SUPPORT_TICKET', entityType: 'SUPPORT_TICKET', entityId: id, oldData: { status: ticket.status, priority: ticket.priority }, newData: { status: updated.status, priority: updated.priority, assignedToId, entry, isInternal }, request: req });
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { profile: true },
      });
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, email, phoneNumber, bio, avatarUrl } = req.body;
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { profile: true },
      });
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

      const updatedUser = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          email: email !== undefined ? String(email).trim() || null : undefined,
          phoneNumber: phoneNumber !== undefined ? String(phoneNumber).trim() || null : undefined,
          profile: {
            upsert: {
              create: {
                name: name ? String(name).trim() : 'Administrator',
                bio: bio !== undefined ? String(bio).trim() : undefined,
                avatarUrl: avatarUrl !== undefined ? String(avatarUrl).trim() || null : undefined,
              },
              update: {
                name: name ? String(name).trim() : undefined,
                bio: bio !== undefined ? String(bio).trim() : undefined,
                avatarUrl: avatarUrl !== undefined ? String(avatarUrl).trim() || null : undefined,
              },
            },
          },
        },
        include: { profile: true },
      });

      await writeAuditLog({
        userId: req.user!.id,
        action: 'ADMIN_UPDATE_PROFILE',
        entityType: 'USER',
        entityId: req.user!.id,
        newData: { name, email, phoneNumber, bio },
        request: req,
      });

      res.json({ success: true, data: updatedUser });
    } catch (err) { next(err); }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || String(newPassword).length < 6) {
        throw new AppError(400, 'INVALID_PASSWORD', 'New password must be at least 6 characters');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

      // Verify current password
      let isValidCurrent = false;
      if (user.passwordHash) {
        isValidCurrent = await bcrypt.compare(String(currentPassword), user.passwordHash);
      }
      if (!isValidCurrent && env.ADMIN_PASSWORD_HASH) {
        isValidCurrent = await bcrypt.compare(String(currentPassword), env.ADMIN_PASSWORD_HASH);
      }
      if (!isValidCurrent && env.ADMIN_PASSWORD) {
        isValidCurrent = String(currentPassword) === env.ADMIN_PASSWORD;
      }

      if (!isValidCurrent) {
        throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
      }

      const newHash = await bcrypt.hash(String(newPassword).trim(), 10);
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { passwordHash: newHash },
      });

      await writeAuditLog({
        userId: req.user!.id,
        action: 'ADMIN_CHANGE_PASSWORD',
        entityType: 'USER',
        entityId: req.user!.id,
        request: req,
      });

      res.json({ success: true, data: { message: 'Password updated successfully' } });
    } catch (err) { next(err); }
  }
}
