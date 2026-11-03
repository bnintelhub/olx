import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OtpService } from '../services/otp.service';
import { JwtService } from '../services/jwt.service';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { env } from '../config/env';
import { writeAuditLog } from '../utils/audit';
import bcrypt from 'bcrypt';

const sendOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Valid mobile number required'),
});

const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Valid mobile number required'),
  sessionId: z.string().uuid('Valid sessionId required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token required'),
});

export class AuthController {
  /**
   * POST /api/v1/auth/otp/send
   */
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phoneNumber } = sendOtpSchema.parse(req.body);
      const result = await OtpService.sendOtp(phoneNumber);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/otp/verify
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phoneNumber, sessionId, otp } = verifyOtpSchema.parse(req.body);
      const verified = await OtpService.verifyOtp(sessionId, phoneNumber, otp);

      // Upsert User
      let isNewUser = false;
      let user = await prisma.user.findUnique({
        where: { phoneNumber: verified.phoneNumber },
        include: { profile: true },
      });

      if (!user) {
        isNewUser = true;
        user = await prisma.user.create({
          data: {
            phoneNumber: verified.phoneNumber,
            isPhoneVerified: true,
            profile: {
              create: {
                name: `User ${verified.phoneNumber.slice(-4)}`,
              },
            },
          },
          include: { profile: true },
        });
      }

      // Generate Tokens
      const tokenPayload = { userId: user.id, role: user.role, phoneNumber: user.phoneNumber || '' };
      const accessToken = JwtService.generateAccessToken(tokenPayload);
      const { refreshToken, tokenHash } = JwtService.generateRefreshToken(tokenPayload);

      // Save refresh token hash in DB
      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshTokenHash: tokenHash,
          lastLoginAt: new Date(),
        },
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            role: user.role,
            isNewUser,
            profile: user.profile,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresInSeconds: 900,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  static async refreshTokens(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const tokenHash = JwtService.hashToken(refreshToken);

      const user = await prisma.user.findFirst({
        where: { refreshTokenHash: tokenHash, status: 'ACTIVE' },
        include: { profile: true },
      });

      if (!user) {
        throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Session expired. Please log in again.');
      }

      // Rotate Refresh Token
      const tokenPayload = { userId: user.id, role: user.role, phoneNumber: user.phoneNumber || '' };
      const newAccessToken = JwtService.generateAccessToken(tokenPayload);
      const { refreshToken: newRefreshToken, tokenHash: newHash } = JwtService.generateRefreshToken(tokenPayload);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: newHash },
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresInSeconds: 900,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          profile: true,
          _count: {
            select: {
              ads: true,
              favourites: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User profile not found');
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          email: user.email,
          role: user.role,
          status: user.status,
          profile: user.profile,
          stats: {
            adsCount: user._count.ads,
            favouritesCount: user._count.favourites,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/admin-login
   * Dedicated Admin Portal Login (Credentials: admin / admin123 or Admin@2026)
   */
  static async adminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        throw new AppError(400, 'CREDENTIALS_REQUIRED', 'Username/Email and Password are required');
      }

      const cleanUsername = String(username).trim();
      const cleanPassword = String(password).trim();

      // Look up existing admin user
      let adminUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: 'admin@bharatmarket.in' },
            { email: cleanUsername.toLowerCase() },
            { phoneNumber: '+919876543210' },
            { role: 'ADMIN' },
          ],
        },
        include: { profile: true },
      });

      const usernameMatches =
        cleanUsername.toLowerCase() === env.ADMIN_USERNAME.toLowerCase() ||
        (adminUser?.email && cleanUsername.toLowerCase() === adminUser.email.toLowerCase());

      let passwordMatches = false;
      if (adminUser?.passwordHash) {
        passwordMatches = await bcrypt.compare(cleanPassword, adminUser.passwordHash);
      }
      if (!passwordMatches) {
        passwordMatches = env.ADMIN_PASSWORD_HASH
          ? await bcrypt.compare(cleanPassword, env.ADMIN_PASSWORD_HASH)
          : env.NODE_ENV !== 'production' && Boolean(env.ADMIN_PASSWORD) && cleanPassword === env.ADMIN_PASSWORD;
      }

      const isValidAdmin = usernameMatches && passwordMatches;

      if (!isValidAdmin) {
        await writeAuditLog({
          action: 'ADMIN_LOGIN_FAILED',
          entityType: 'AUTH',
          entityId: cleanUsername.slice(0, 100),
          request: req,
          newData: { reason: 'invalid_credentials' },
        });
        throw new AppError(401, 'INVALID_ADMIN_CREDENTIALS', 'Invalid Admin username or password');
      }

      // Upsert the Admin User if missing

      if (!adminUser) {
        adminUser = await prisma.user.create({
          data: {
            phoneNumber: '+919876543210',
            email: 'admin@bharatmarket.in',
            isPhoneVerified: true,
            isEmailVerified: true,
            role: 'ADMIN',
            status: 'ACTIVE',
            profile: {
              create: {
                name: 'OLX ORBIT Administrator',
                bio: 'System Administrator & Trust Manager',
                isIdentityVerified: true,
              },
            },
          },
          include: { profile: true },
        });
      } else if (adminUser.role !== 'ADMIN') {
        adminUser = await prisma.user.update({
          where: { id: adminUser.id },
          data: { role: 'ADMIN' },
          include: { profile: true },
        });
      }

      const tokenPayload = {
        userId: adminUser.id,
        role: adminUser.role,
        phoneNumber: adminUser.phoneNumber || '',
      };

      const accessToken = JwtService.generateAccessToken(tokenPayload);
      const { refreshToken, tokenHash } = JwtService.generateRefreshToken(tokenPayload);

      await prisma.user.update({
        where: { id: adminUser.id },
        data: { refreshTokenHash: tokenHash },
      });

      await writeAuditLog({
        userId: adminUser.id,
        action: 'ADMIN_LOGIN',
        entityType: 'USER',
        entityId: adminUser.id,
        request: req,
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: adminUser.id,
            email: adminUser.email,
            phoneNumber: adminUser.phoneNumber,
            role: adminUser.role,
            profile: adminUser.profile,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresInSeconds: 86400,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { refreshTokenHash: null },
      });

      await writeAuditLog({
        userId: req.user!.id,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: req.user!.id,
        request: req,
      });

      res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (err) {
      next(err);
    }
  }
}
