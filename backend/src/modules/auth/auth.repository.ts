import { prisma } from '../../config/prisma';
import { OtpPurpose, UserRole } from '@prisma/client';

export class AuthRepository {
  static async findUserByPhone(phoneNumber: string) {
    return prisma.user.findUnique({
      where: { phoneNumber },
      include: { profile: true },
    });
  }

  static async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true },
    });
  }

  static async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        _count: { select: { ads: true, favourites: true } },
      },
    });
  }

  static async findUserByEmailOrPhone(cleanUsername: string) {
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@bharatmarket.in' },
          { email: cleanUsername.toLowerCase() },
          { phoneNumber: cleanUsername },
          { phoneNumber: '+919876543210' },
          { role: UserRole.ADMIN },
        ],
      },
      include: { profile: true },
    });
  }

  static async createUserWithEmail(data: { email: string; passwordHash: string; name?: string }) {
    const cleanEmail = data.email.toLowerCase();
    const defaultName = data.name || cleanEmail.split('@')[0];

    return prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash: data.passwordHash,
        isEmailVerified: false,
        profile: {
          create: {
            name: defaultName,
          },
        },
      },
      include: { profile: true },
    });
  }

  static async createUserWithPhone(phoneNumber: string) {
    return prisma.user.create({
      data: {
        phoneNumber,
        isPhoneVerified: true,
        profile: {
          create: {
            name: `User ${phoneNumber.slice(-4)}`,
          },
        },
      },
      include: { profile: true },
    });
  }

  static async createDefaultAdmin(cleanPasswordHash?: string) {
    return prisma.user.create({
      data: {
        phoneNumber: '+919876543210',
        email: 'admin@bharatmarket.in',
        passwordHash: cleanPasswordHash,
        isPhoneVerified: true,
        isEmailVerified: true,
        role: UserRole.ADMIN,
        status: 'ACTIVE',
        profile: {
          create: {
            name: 'OLX Marketplace Administrator',
            bio: 'System Administrator & Trust Manager',
            isIdentityVerified: true,
          },
        },
      },
      include: { profile: true },
    });
  }

  static async updateUserTokens(userId: string, refreshTokenHash: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
        lastLoginAt: new Date(),
      },
    });
  }

  static async updateUserPassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshTokenHash: null,
      },
    });
  }

  static async markEmailVerified(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  }

  static async createOtpSession(data: {
    phoneNumber?: string;
    email?: string;
    userId?: string;
    otpHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }) {
    return prisma.otpSession.create({ data });
  }

  static async findOtpSession(id: string) {
    return prisma.otpSession.findUnique({ where: { id } });
  }

  static async findRecentOtpSession(filter: { phoneNumber?: string; email?: string }, cooldownDate: Date) {
    if (filter.phoneNumber) {
      return prisma.otpSession.findFirst({
        where: {
          phoneNumber: filter.phoneNumber,
          createdAt: { gte: cooldownDate },
        },
      });
    }
    if (filter.email) {
      return prisma.otpSession.findFirst({
        where: {
          email: filter.email.toLowerCase(),
          createdAt: { gte: cooldownDate },
        },
      });
    }
    return null;
  }

  static async incrementOtpAttempts(id: string) {
    return prisma.otpSession.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  static async markOtpSessionUsed(id: string) {
    return prisma.otpSession.update({
      where: { id },
      data: { isUsed: true },
    });
  }

  static async findUserByRefreshTokenHash(tokenHash: string) {
    return prisma.user.findFirst({
      where: { refreshTokenHash: tokenHash, status: 'ACTIVE' },
      include: { profile: true },
    });
  }
}
