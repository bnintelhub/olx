import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { AdStatus, Prisma, UserRole } from '@prisma/client';
import { HashUtil } from '../../shared/utils/hash.util';
import { delCache } from '../../config/redis';
import { ListingsDeleteService } from '../listings/listings.delete.service';
import { formatAdImages } from '../listings/listings.service';

export class AdminService {
  // Aggregates high-level marketplace metrics tailored dynamically to the caller's role.
  // Uses optimized database aggregations to compute overview KPIs with zero duplicate queries.
  static async getStats(role?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Grouped queries to reduce round-trips from 14+ queries to essential aggregations
    const [
      adStatusGroups,
      userStatusGroups,
      openReports,
      totalBoosts,
      activeBoosts,
      topCategoriesGroup,
      topLocationsGroup,
      recentLogs,
      paymentCounts,
      avgPriceResult,
      spamCount,
      policyViolationCount,
    ] = await Promise.all([
      prisma.ad.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.user.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.featuredAd.count(),
      prisma.featuredAd.count({ where: { status: 'ACTIVE' } }),
      prisma.ad.groupBy({
        by: ['categoryId'],
        where: { deletedAt: null },
        _count: { _all: true },
        orderBy: { _count: { categoryId: 'desc' } },
        take: 6,
      }),
      prisma.ad.groupBy({
        by: ['locationId'],
        where: { deletedAt: null },
        _count: { _all: true },
        orderBy: { _count: { locationId: 'desc' } },
        take: 5,
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentOrder.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.ad.aggregate({
        _avg: { price: true },
        where: { deletedAt: null, status: AdStatus.ACTIVE },
      }),
      prisma.report.count({ where: { status: 'PENDING', reason: 'SPAM_OR_FRAUD' } }),
      prisma.report.count({ where: { status: 'PENDING', reason: 'PROHIBITED_ITEM' } }),
    ]);

    // Map ad counts by status
    const adStatusMap: Record<string, number> = {};
    for (const item of adStatusGroups) {
      adStatusMap[item.status] = item._count._all;
    }

    const activeAds = adStatusMap[AdStatus.ACTIVE] || 0;
    const pendingAds = adStatusMap[AdStatus.PENDING_REVIEW] || 0;
    const soldAds = adStatusMap[AdStatus.SOLD] || 0;
    const rejectedAds = adStatusMap[AdStatus.REJECTED] || 0;
    const expiredAds = adStatusMap[AdStatus.EXPIRED] || 0;
    const draftAds = adStatusMap[AdStatus.DRAFT] || 0;
    const archivedAds = adStatusMap[AdStatus.ARCHIVED] || 0;
    const totalAds = Object.values(adStatusMap).reduce((a, b) => a + b, 0);

    // Map user counts by status
    const userStatusMap: Record<string, number> = {};
    for (const item of userStatusGroups) {
      userStatusMap[item.status] = item._count._all;
    }

    const totalUsers = Object.values(userStatusMap).reduce((a, b) => a + b, 0) - (userStatusMap['DELETED'] || 0);
    const suspendedUsers = userStatusMap['SUSPENDED'] || 0;
    const verifiedUsers = userStatusMap['ACTIVE'] || 0;
    const grossRevenueInr = totalBoosts * 199;

    // Categories & Locations name resolution
    const [categories, locations] = await Promise.all([
      topCategoriesGroup.length > 0
        ? prisma.category.findMany({
            where: { id: { in: topCategoriesGroup.map((c) => c.categoryId) } },
            select: { id: true, name: true },
          })
        : [],
      topLocationsGroup.length > 0
        ? prisma.location.findMany({
            where: { id: { in: topLocationsGroup.map((l) => l.locationId) } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
    const locationNameMap = new Map(locations.map((l) => [l.id, l.name]));

    const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#94a3b8'];
    const categoryDistribution = topCategoriesGroup.map((cg, idx) => ({
      name: categoryNameMap.get(cg.categoryId) || 'Category',
      value: cg._count._all,
      color: palette[idx % palette.length],
    }));

    const topLocations = topLocationsGroup.map((lg) => ({
      name: locationNameMap.get(lg.locationId) || 'City',
      count: lg._count._all,
    }));

    // Payment stats
    const paymentStatusMap: Record<string, number> = {};
    for (const p of paymentCounts) {
      paymentStatusMap[p.status] = p._count._all;
    }
    const successfulPayments = paymentStatusMap['PAID'] || totalBoosts || 0;
    const failedPayments = paymentStatusMap['FAILED'] || 0;
    const refunds = paymentStatusMap['REFUNDED'] || 0;

    const statusDistribution = [
      { name: 'Active', value: activeAds, color: '#10b981' },
      { name: 'Pending Review', value: pendingAds, color: '#f59e0b' },
      { name: 'Sold', value: soldAds, color: '#3b82f6' },
      { name: 'Expired', value: expiredAds, color: '#94a3b8' },
      { name: 'Rejected', value: rejectedAds, color: '#ef4444' },
      ...(draftAds > 0 ? [{ name: 'Draft', value: draftAds, color: '#64748b' }] : []),
      ...(archivedAds > 0 ? [{ name: 'Archived', value: archivedAds, color: '#8b5cf6' }] : []),
    ];

    // Real recent activity from audit logs
    const recentActivity = recentLogs.map((log) => {
      let type: 'LISTINGS' | 'PAYMENTS' | 'USERS' | 'REPORTS' = 'LISTINGS';
      let title = log.action.replace(/_/g, ' ');
      if (log.action.includes('AD')) type = 'LISTINGS';
      else if (log.action.includes('PAY') || log.action.includes('ORDER')) type = 'PAYMENTS';
      else if (log.action.includes('USER') || log.action.includes('AUTH')) type = 'USERS';
      else if (log.action.includes('REPORT')) type = 'REPORTS';

      return {
        id: log.id,
        time: log.createdAt,
        type,
        title,
        details: log.entityType ? `${log.entityType} ${log.entityId.slice(0, 8)}` : 'System action',
      };
    });

    const baseMetrics = {
      role: role || 'SUPER_ADMIN',
      totalUsers,
      totalAds,
      activeAds,
      pendingAds,
      soldAds,
      rejectedAds,
      expiredAds,
      openReports,
      totalBoosts,
      activeBoosts,
      suspendedUsers,
      verifiedUsers,
      grossRevenueInr,
      totalOrders: totalBoosts || successfulPayments,
      statusDistribution,
      categoryDistribution,
      topLocations,
      successfulPayments,
      failedPayments,
      refunds,
      avgListingPrice: Math.round(Number(avgPriceResult._avg.price) || 0),
      spamReportsCount: spamCount,
      policyViolationCount,
      recentActivity,
      revenueSummary: {
        totalEarned: grossRevenueInr,
        today: 0,
        thisWeek: 0,
        thisMonth: grossRevenueInr,
      },
      revenueTrend: [] as Array<{ date: string; amount: number }>,
      operationalStatus: 'OPERATIONAL',
    };

    switch (role) {
      case 'MODERATOR': {
        const [reviewedToday, highRiskItems] = await Promise.all([
          prisma.auditLog.count({
            where: {
              action: { in: ['ADMIN_APPROVE_AD', 'ADMIN_REJECT_AD', 'ADMIN_DELETE_AD', 'REPORT_RESOLVED'] },
              createdAt: { gte: todayStart },
            },
          }),
          prisma.report.count({
            where: { status: 'PENDING', reason: 'SPAM_OR_FRAUD' },
          }),
        ]);

        return {
          ...baseMetrics,
          role: 'MODERATOR',
          pendingReviews: pendingAds,
          highRiskItems,
          reviewedToday,
        };
      }

      case 'CUSTOMER_SUPPORT': {
        const [urgentTickets, resolvedToday] = await Promise.all([
          prisma.report.count({
            where: { status: 'PENDING', reason: { in: ['SPAM_OR_FRAUD', 'PROHIBITED_ITEM'] } },
          }),
          prisma.report.count({
            where: {
              status: 'RESOLVED',
              resolvedAt: { gte: todayStart },
            },
          }),
        ]);

        return {
          ...baseMetrics,
          role: 'CUSTOMER_SUPPORT',
          openTickets: openReports,
          urgentTickets,
          resolvedToday,
        };
      }

      case 'FINANCE_ADMIN': {
        return {
          ...baseMetrics,
          role: 'FINANCE_ADMIN',
          totalTransactions: totalBoosts,
          activePromotions: activeBoosts,
          currency: 'INR',
        };
      }

      case 'CONTENT_MANAGER': {
        const [activeBanners, totalCategories] = await Promise.all([
          prisma.banner.count({ where: { isActive: true } }),
          prisma.category.count(),
        ]);

        return {
          ...baseMetrics,
          role: 'CONTENT_MANAGER',
          activeBanners,
          totalCategories,
          activePromotions: activeBoosts,
        };
      }

      case 'ANALYST': {
        return {
          ...baseMetrics,
          role: 'ANALYST',
          totalReports: openReports,
          conversionRate: totalAds > 0 ? Number(((soldAds / totalAds) * 100).toFixed(1)) : 0,
        };
      }

      case 'ADMIN':
      case 'SUPER_ADMIN':
      default:
        return baseMetrics;
    }
  }

  // Retrieves paginated user records formatted for admin user management.
  // Formats identity, role/tier, location, KYC trust, and marketplace activity.
  static async getUsers(params: {
    page: number;
    limit: number;
    q?: string;
    status?: string;
    role?: string;
  }) {
    const skip = (params.page - 1) * params.limit;
    const where: Prisma.UserWhereInput = {};

    if (params.status && params.status !== 'ALL') {
      where.status = params.status as any;
    }

    if (params.role && params.role !== 'ALL') {
      if (params.role === 'BUSINESS_SELLER') {
        where.profile = { accountType: 'BUSINESS' };
      } else if (params.role === 'PRO_DEALER') {
        where.profile = { accountType: 'DEALER' };
      } else if (params.role === 'VERIFIED_USER') {
        where.profile = { isIdentityVerified: true };
      } else if (params.role === 'BUYER') {
        where.role = 'USER';
        where.profile = { accountType: 'INDIVIDUAL' };
      } else if (Object.values(UserRole).includes(params.role as UserRole)) {
        where.role = params.role as UserRole;
      }
    }

    if (params.q) {
      where.OR = [
        { phoneNumber: { contains: params.q } },
        { email: { contains: params.q, mode: 'insensitive' } },
        { profile: { name: { contains: params.q, mode: 'insensitive' } } },
        { profile: { businessName: { contains: params.q, mode: 'insensitive' } } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          profile: {
            include: {
              location: {
                include: {
                  parent: true,
                },
              },
            },
          },
          ads: {
            select: {
              status: true,
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map((u) => {
      let role = 'BUYER';
      if (u.role === 'SUPER_ADMIN') {
        role = 'SUPER_ADMIN';
      } else if (u.role === 'ADMIN') {
        role = 'ADMIN';
      } else if (u.profile?.accountType === 'BUSINESS') {
        role = 'BUSINESS_SELLER';
      } else if (u.profile?.accountType === 'DEALER') {
        role = 'PRO_DEALER';
      } else if (u.profile?.isIdentityVerified) {
        role = 'VERIFIED_USER';
      }

      const city = u.profile?.location?.name || 'New Delhi';
      const state = u.profile?.location?.parent?.name || u.profile?.location?.name || 'Delhi NCR';
      const kycVerified = Boolean(u.profile?.isIdentityVerified || (u.isPhoneVerified && u.isEmailVerified));
      const activeAds = u.ads?.filter((a) => a.status === 'ACTIVE').length || 0;
      const totalDeals = u.ads?.filter((a) => a.status === 'SOLD').length || 0;

      const joinedDate = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }).format(u.createdAt);

      const lastActiveTime = u.lastLoginAt || u.updatedAt;
      const diffSec = Math.max(0, Math.floor((Date.now() - new Date(lastActiveTime).getTime()) / 1000));
      let lastActive = 'Just now';
      if (diffSec >= 60 && diffSec < 3600) {
        lastActive = `${Math.floor(diffSec / 60)}m ago`;
      } else if (diffSec >= 3600 && diffSec < 86400) {
        lastActive = `${Math.floor(diffSec / 3600)}h ago`;
      } else if (diffSec >= 86400 && diffSec < 2592000) {
        lastActive = `${Math.floor(diffSec / 86400)}d ago`;
      } else if (diffSec >= 2592000) {
        lastActive = `${Math.floor(diffSec / 2592000)}mo ago`;
      }

      return {
        id: u.id,
        name: u.profile?.name || u.profile?.businessName || (u.email ? u.email.split('@')[0] : 'User'),
        email: u.email || '',
        phone: u.phoneNumber || '',
        role,
        city,
        state,
        kycVerified,
        activeAds,
        totalDeals,
        status: u.status,
        joinedDate,
        lastActive,
      };
    });

    return {
      users: formattedUsers,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  // Directly sets user status: ACTIVE, SUSPENDED, BANNED, or DELETED
  static async updateUserStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED',
    reason?: string
  ) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User account not found');

    const updateData: Prisma.UserUpdateInput = { status };
    if (status !== 'ACTIVE') {
      updateData.refreshTokenHash = null;
    }
    if (status === 'DELETED') {
      updateData.deletedAt = new Date();
    } else if (user.deletedAt && status === 'ACTIVE') {
      updateData.deletedAt = null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await delCache(`user:${id}`);

    return {
      updated,
      previous: {
        role: user.role,
        status: user.status,
        capabilities: user.capabilities,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  // Fetches full user details including location, up to 50 active ads, and received abuse reports.
  // Throws a 404 AppError if the target user account does not exist.
  static async getUserDetail(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: { include: { location: true } },
        ads: {
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' },
          take: 50,
          include: { category: { select: { name: true } }, location: { select: { name: true } } },
        },
        reportsReceived: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User account not found');
    return user;
  }

  // Executes administrative lifecycle updates on an account such as suspension, role promotion, or bans.
  // Wipes refreshTokenHash and evicts Redis cache to trigger immediate session revocation.
  static async updateUserAction(id: string, action: string, role?: UserRole, capabilities?: string[]) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User account not found');

    let updateData: Prisma.UserUpdateInput = {};
    if (action === 'SUSPEND') {
      updateData.status = 'SUSPENDED';
      updateData.refreshTokenHash = null;
    } else if (action === 'BAN') {
      updateData.status = 'BANNED';
      updateData.refreshTokenHash = null;
    } else if (action === 'ACTIVATE') {
      updateData.status = 'ACTIVE';
    } else if (action === 'DELETE') {
      updateData.status = 'DELETED';
      updateData.deletedAt = new Date();
      updateData.refreshTokenHash = null;
    } else if (action === 'CHANGE_ROLE' && role) {
      updateData.role = role;
      updateData.refreshTokenHash = null; // Invalidate refresh token to force fresh session issuance
    } else if (action === 'UPDATE_CAPABILITIES' && capabilities) {
      updateData.capabilities = capabilities;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await delCache(`user:${id}`);
    return {
      updated,
      previous: {
        role: user.role,
        status: user.status,
        capabilities: user.capabilities,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  // Retrieves paginated classified ads for content moderation and review.
  // Supports filtering by publication status, category name/slug, and keyword matching.
  static async getAds(params: {
    page: number;
    limit: number;
    status?: AdStatus;
    category?: string;
    q?: string;
  }) {
    const skip = (params.page - 1) * params.limit;
    const where: Prisma.AdWhereInput = { deletedAt: null };

    if (params.status && (params.status as any) !== 'ALL') {
      where.status = params.status;
    }
    if (params.category && params.category !== 'ALL') {
      where.category = {
        OR: [
          { name: { equals: params.category, mode: 'insensitive' } },
          { slug: { equals: params.category, mode: 'insensitive' } },
        ],
      };
    }
    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
        { user: { profile: { name: { contains: params.q, mode: 'insensitive' } } } },
        { location: { name: { contains: params.q, mode: 'insensitive' } } },
      ];
    }

    const [total, ads] = await Promise.all([
      prisma.ad.count({ where }),
      prisma.ad.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } },
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              role: true,
              profile: { select: { name: true, isIdentityVerified: true, avatarUrl: true } },
            },
          },
          images: {
            include: { mediaAsset: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
    ]);

    const formattedAds = ads.map((ad) => ({
      ...ad,
      images: formatAdImages(ad.images),
    }));

    return {
      ads: formattedAds,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  // Updates an ad's moderation status (ACTIVE, REJECTED, etc.) and audit state.
  static async updateAdStatus(id: string, status: AdStatus, rejectionReason?: string) {
    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');

    return prisma.ad.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === AdStatus.REJECTED ? rejectionReason || 'Violates community guidelines' : null,
        renewedAt: status === AdStatus.ACTIVE ? new Date() : undefined,
        expiresAt: status === AdStatus.ACTIVE ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
      },
      include: {
        category: { select: { name: true } },
        location: { select: { name: true } },
        user: { select: { id: true, phoneNumber: true, profile: { select: { name: true } } } },
      },
    });
  }

  // Deletes an ad and physically removes all associated media files from S3 and local storage.
  static async deleteAd(id: string) {
    return ListingsDeleteService.deleteListing(id);
  }

  // Updates an administrator's account information such as contact email and profile bio.
  // Evicts cached session data so changes take effect across all microservices immediately.
  static async updateProfile(adminId: string, data: any) {
    if (data.email) {
      await prisma.user.update({
        where: { id: adminId },
        data: { email: data.email },
      });
    }

    await prisma.profile.upsert({
      where: { userId: adminId },
      create: { userId: adminId, name: data.name || 'Admin', bio: data.bio, avatarUrl: data.avatarUrl },
      update: { name: data.name, bio: data.bio, avatarUrl: data.avatarUrl },
    });

    await delCache(`user:${adminId}`);
    return prisma.user.findUnique({ where: { id: adminId }, include: { profile: true } });
  }

  // Verifies the administrator's existing password before hashing and saving the replacement password.
  // Guards against unauthorized password resets if an active session is left unattended.
  static async changePassword(adminId: string, currentPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: adminId } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

    if (user.passwordHash) {
      const match = await HashUtil.comparePassword(currentPass, user.passwordHash);
      if (!match) throw new AppError(400, 'INCORRECT_PASSWORD', 'Current password is incorrect');
    }

    const hashed = await HashUtil.hashPassword(newPass);
    await prisma.user.update({
      where: { id: adminId },
      data: { passwordHash: hashed },
    });
    return { message: 'Password changed successfully' };
  }

  // Creates a cryptographically secure, single-use invitation link for staff onboarding.
  // Supports presets (2 days, 3 days, 7 days, no expiry) or manual date configuration.
  static async createStaffInvitation(
    invitedById: string,
    email: string,
    role: UserRole,
    expiryOptions?: { expiryType?: string; customExpiresAt?: string | null }
  ) {
    const cleanEmail = email.trim().toLowerCase();

    const staffRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.MODERATOR,
      UserRole.CUSTOMER_SUPPORT,
      UserRole.FINANCE_ADMIN,
      UserRole.CONTENT_MANAGER,
      UserRole.ANALYST,
    ];

    if (!staffRoles.includes(role)) {
      throw new AppError(400, 'INVALID_ROLE', 'Only administrative staff roles can be invited');
    }

    // Check if user already exists as active staff
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser && staffRoles.includes(existingUser.role)) {
      throw new AppError(409, 'STAFF_ALREADY_EXISTS', `An active staff account with email ${cleanEmail} already exists`);
    }

    // Invalidate any prior pending invite for this email
    await (prisma as any).staffInvitation.updateMany({
      where: { email: cleanEmail, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });

    // Determine expiration timestamp based on selected expiry options
    let expiresAt: Date;
    const type = expiryOptions?.expiryType || '2_DAYS';

    if (type === 'NO_EXPIRY') {
      expiresAt = new Date('2099-12-31T23:59:59.999Z');
    } else if (type === '3_DAYS') {
      expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    } else if (type === '7_DAYS') {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (type === 'CUSTOM' && expiryOptions?.customExpiresAt) {
      const parsedDate = new Date(expiryOptions.customExpiresAt);
      if (isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
        throw new AppError(400, 'INVALID_EXPIRY_DATE', 'Custom expiry date must be in the future');
      }
      expiresAt = parsedDate;
    } else {
      // Default: 2 days
      expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    }

    // Generate single-use secure crypto token
    const token = crypto.randomBytes(32).toString('hex');

    const invitation = await (prisma as any).staffInvitation.create({
      data: {
        email: cleanEmail,
        role,
        token,
        invitedById,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        invitedBy: {
          select: { id: true, email: true, profile: { select: { name: true } } },
        },
      },
    });

    const adminOrigin =
      env.ADMIN_URL || (env.CLIENT_URL ? `${env.CLIENT_URL.replace(/\/$/, '')}/admin` : 'http://localhost:5174');
    const inviteLink = `${adminOrigin}/accept-invite?token=${token}`;

    return {
      invitation,
      inviteLink,
    };
  }

  // Returns all historical and active staff invitations with persistent share links.
  // Computes active validity status so invitations can be re-copied anytime before expiry.
  static async getStaffInvitations() {
    const list = await (prisma as any).staffInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: { id: true, email: true, profile: { select: { name: true } } },
        },
      },
    });

    const adminOrigin =
      env.ADMIN_URL || (env.CLIENT_URL ? `${env.CLIENT_URL.replace(/\/$/, '')}/admin` : 'http://localhost:5174');

    return list.map((inv: any) => {
      const isLifetime = inv.expiresAt ? new Date(inv.expiresAt).getFullYear() >= 2099 : true;
      const isExpired = inv.expiresAt && !isLifetime ? new Date() > new Date(inv.expiresAt) : false;

      return {
        ...inv,
        inviteLink: `${adminOrigin}/accept-invite?token=${inv.token}`,
        isLifetime,
        isExpired,
      };
    });
  }

  // Revokes a pending staff invitation so that the token can no longer be used for onboarding.
  // Rejects requests to revoke invitations that have already been accepted or expired.
  static async revokeStaffInvitation(id: string) {
    const invitation = await (prisma as any).staffInvitation.findUnique({ where: { id } });
    if (!invitation) throw new AppError(404, 'INVITATION_NOT_FOUND', 'Staff invitation not found');

    if (invitation.status !== 'PENDING') {
      throw new AppError(400, 'CANNOT_REVOKE', `Invitation cannot be revoked because status is ${invitation.status}`);
    }

    return (prisma as any).staffInvitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }

  // Retrieves paginated forensic audit records ordered from newest to oldest.
  // Supports filtering by action, resource type, target identifier, and text search.
  static async getAuditLogs(params: {
    page: number;
    limit: number;
    action?: string;
    entityType?: string;
    entityId?: string;
    search?: string;
  }) {
    const skip = (params.page - 1) * params.limit;
    const where: Prisma.AuditLogWhereInput = {};

    if (params.action) {
      where.action = params.action;
    }
    if (params.entityType) {
      where.entityType = params.entityType;
    }
    if (params.entityId) {
      where.entityId = params.entityId;
    }
    if (params.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { entityType: { contains: params.search, mode: 'insensitive' } },
        { entityId: { contains: params.search, mode: 'insensitive' } },
        { user: { email: { contains: params.search, mode: 'insensitive' } } },
        { user: { profile: { name: { contains: params.search, mode: 'insensitive' } } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              profile: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }
}
