import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { AdStatus, Prisma, UserRole } from '@prisma/client';
import { HashUtil } from '../../shared/utils/hash.util';
import { delCache } from '../../config/redis';

export class AdminService {
  static async getStats() {
    const [totalUsers, totalAds, pendingAds, activeAds, totalReports] = await Promise.all([
      prisma.user.count({ where: { status: { not: 'DELETED' } } }),
      prisma.ad.count({ where: { deletedAt: null } }),
      prisma.ad.count({ where: { status: AdStatus.PENDING_REVIEW, deletedAt: null } }),
      prisma.ad.count({ where: { status: AdStatus.ACTIVE, deletedAt: null } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalUsers,
      totalAds,
      pendingAds,
      activeAds,
      totalReports,
    };
  }

  static async getUsers(params: {
    page: number;
    limit: number;
    q?: string;
    status?: string;
    role?: string;
  }) {
    const skip = (params.page - 1) * params.limit;
    const where: Prisma.UserWhereInput = { status: { not: 'DELETED' } };

    if (params.status && ['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'].includes(params.status)) {
      where.status = params.status as any;
    }
    if (params.role && Object.values(UserRole).includes(params.role as UserRole)) {
      where.role = params.role as UserRole;
    }
    if (params.q) {
      where.OR = [
        { phoneNumber: { contains: params.q } },
        { email: { contains: params.q, mode: 'insensitive' } },
        { profile: { name: { contains: params.q, mode: 'insensitive' } } },
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
          profile: { select: { name: true, avatarUrl: true, accountType: true, businessName: true } },
          _count: { select: { ads: true, reportsFiled: true, reportsReceived: true } },
        },
      }),
    ]);

    return {
      users,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

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

  static async updateUserAction(id: string, action: string, role?: UserRole, capabilities?: string[]) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User account not found');

    let updateData: Prisma.UserUpdateInput = {};
    if (action === 'SUSPEND') updateData.status = 'SUSPENDED';
    else if (action === 'BAN') updateData.status = 'BANNED';
    else if (action === 'ACTIVATE') updateData.status = 'ACTIVE';
    else if (action === 'CHANGE_ROLE' && role) updateData.role = role;
    else if (action === 'UPDATE_CAPABILITIES' && capabilities) updateData.capabilities = capabilities;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await delCache(`user:${id}`);
    return updated;
  }

  static async getAds(params: { page: number; limit: number; status?: AdStatus; q?: string }) {
    const skip = (params.page - 1) * params.limit;
    const where: Prisma.AdWhereInput = { deletedAt: null };

    if (params.status) where.status = params.status;
    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
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
          category: { select: { name: true } },
          location: { select: { name: true } },
          user: { select: { id: true, phoneNumber: true, profile: { select: { name: true } } } },
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
        },
      }),
    ]);

    return {
      ads,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  static async deleteAd(id: string) {
    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');

    return prisma.ad.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

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

  // ==========================================
  // STAFF INVITATION WORKFLOW
  // ==========================================

  static async createStaffInvitation(invitedById: string, email: string, role: UserRole) {
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

    // Generate single-use secure crypto token expiring in 48 hours
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

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

    const clientOrigin = env.CLIENT_URL || 'http://localhost:5174';
    const inviteLink = `${clientOrigin}/accept-invite?token=${token}`;

    return {
      invitation,
      inviteLink,
    };
  }

  static async getStaffInvitations() {
    return (prisma as any).staffInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: { id: true, email: true, profile: { select: { name: true } } },
        },
      },
    });
  }

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
}
