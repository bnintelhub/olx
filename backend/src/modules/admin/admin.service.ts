import { prisma } from '../../config/prisma';
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

  static async updateUserAction(id: string, action: string, role?: UserRole) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User account not found');

    let updateData: Prisma.UserUpdateInput = {};
    if (action === 'SUSPEND') updateData.status = 'SUSPENDED';
    else if (action === 'BAN') updateData.status = 'BANNED';
    else if (action === 'ACTIVATE') updateData.status = 'ACTIVE';
    else if (action === 'CHANGE_ROLE' && role) updateData.role = role;

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
}
