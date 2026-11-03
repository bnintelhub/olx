import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { HashUtil } from '../../shared/utils/hash.util';
import { SmsService } from '../../integrations/sms/sms.service';
import { AuthRepository } from './auth.repository';
import { TokenPayload, AuthTokens, SendOtpResult } from './auth.types';
import { OtpPurpose, UserRole } from '@prisma/client';
import { getCache, setCache, delCache } from '../../config/redis';

export class AuthService {
  static sanitizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    } else if (cleaned.length === 13 && cleaned.startsWith('091')) {
      return `+${cleaned.substring(1)}`;
    }
    throw new AppError(400, 'INVALID_PHONE_NUMBER', 'Please enter a valid 10-digit Indian mobile number');
  }

  static generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    });
    const refreshToken = HashUtil.randomBytes(40);
    return {
      accessToken,
      refreshToken,
      expiresInSeconds: 900,
    };
  }

  static async sendOtp(rawPhone: string, purpose = OtpPurpose.LOGIN): Promise<SendOtpResult> {
    const phoneNumber = this.sanitizePhoneNumber(rawPhone);

    const isDevOrTest = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

    // 1. Check Redis cooldown first, fallback to DB
    const cooldownKey = `otp_cooldown:${phoneNumber}`;
    const inCooldown = await getCache<boolean>(cooldownKey);
    if (inCooldown && !isDevOrTest) {
      throw new AppError(
        429,
        'OTP_RATE_LIMITED',
        `Please wait ${env.OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new OTP.`
      );
    }

    const cooldownDate = new Date(Date.now() - env.OTP_RESEND_COOLDOWN_SECONDS * 1000);
    const recentDbSession = await AuthRepository.findRecentOtpSession(phoneNumber, cooldownDate);
    if (recentDbSession && !isDevOrTest) {
      throw new AppError(
        429,
        'OTP_RATE_LIMITED',
        `Please wait ${env.OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new OTP.`
      );
    }

    // 2. Generate OTP
    const otpCode =
      isDevOrTest && env.SMS_PROVIDER === 'MOCK'
        ? env.MOCK_OTP_CODE
        : Math.floor(100000 + Math.random() * 900000).toString();

    const otpHash = HashUtil.sha256(otpCode);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);

    // 3. Save OTP Session
    const session = await AuthRepository.createOtpSession({
      phoneNumber,
      otpHash,
      purpose,
      expiresAt,
    });

    // 4. Cache cooldown in Redis
    await setCache(cooldownKey, true, env.OTP_RESEND_COOLDOWN_SECONDS);

    // 5. Send SMS
    await SmsService.sendOtp(phoneNumber, otpCode);

    return {
      sessionId: session.id,
      expiresInSeconds: env.OTP_EXPIRY_SECONDS,
      resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      mockOtp: isDevOrTest ? otpCode : undefined,
    };
  }

  static async verifyOtp(sessionId: string, rawPhone: string, submittedOtp: string) {
    const phoneNumber = this.sanitizePhoneNumber(rawPhone);
    const session = await AuthRepository.findOtpSession(sessionId);

    if (!session || session.phoneNumber !== phoneNumber) {
      throw new AppError(400, 'INVALID_SESSION', 'Invalid or expired OTP session. Please request a new OTP.');
    }

    if (session.isUsed) {
      throw new AppError(400, 'OTP_ALREADY_USED', 'This OTP has already been verified.');
    }

    if (new Date() > session.expiresAt) {
      throw new AppError(400, 'OTP_EXPIRED', 'OTP has expired. Please request a new OTP.');
    }

    if (session.attempts >= 3) {
      throw new AppError(429, 'MAX_ATTEMPTS_EXCEEDED', 'Too many invalid attempts. Session locked.');
    }

    const submittedHash = HashUtil.sha256(submittedOtp);
    if (submittedHash !== session.otpHash) {
      await AuthRepository.incrementOtpAttempts(sessionId);
      throw new AppError(400, 'INCORRECT_OTP', 'Incorrect OTP entered. Please try again.');
    }

    await AuthRepository.markOtpSessionUsed(sessionId);

    let isNewUser = false;
    let user = await AuthRepository.findUserByPhone(phoneNumber);

    if (!user) {
      isNewUser = true;
      user = await AuthRepository.createUserWithPhone(phoneNumber);
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      role: user.role,
      phoneNumber: user.phoneNumber || undefined,
    };
    const tokens = this.generateTokens(tokenPayload);
    const tokenHash = HashUtil.sha256(tokens.refreshToken);

    await AuthRepository.updateUserTokens(user.id, tokenHash);

    return {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isNewUser,
        profile: user.profile,
      },
      tokens,
    };
  }

  static async refreshTokens(refreshToken: string) {
    const tokenHash = HashUtil.sha256(refreshToken);
    const user = await AuthRepository.findUserByRefreshTokenHash(tokenHash);

    if (!user) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Session expired. Please log in again.');
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      role: user.role,
      phoneNumber: user.phoneNumber || undefined,
    };
    const tokens = this.generateTokens(tokenPayload);
    const newHash = HashUtil.sha256(tokens.refreshToken);

    await AuthRepository.updateUserTokens(user.id, newHash);
    return tokens;
  }

  static async adminLogin(username: string, password: string) {
    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    let adminUser = await AuthRepository.findUserByEmailOrPhone(cleanUsername);

    const usernameMatches =
      cleanUsername.toLowerCase() === env.ADMIN_USERNAME.toLowerCase() ||
      (adminUser?.email && cleanUsername.toLowerCase() === adminUser.email.toLowerCase());

    let passwordMatches = false;
    if (adminUser?.passwordHash) {
      passwordMatches = await HashUtil.comparePassword(cleanPassword, adminUser.passwordHash);
    }
    if (!passwordMatches) {
      passwordMatches = env.ADMIN_PASSWORD_HASH
        ? await HashUtil.comparePassword(cleanPassword, env.ADMIN_PASSWORD_HASH)
        : env.NODE_ENV !== 'production' && Boolean(env.ADMIN_PASSWORD) && cleanPassword === env.ADMIN_PASSWORD;
    }

    if (!usernameMatches || !passwordMatches) {
      throw new AppError(401, 'INVALID_ADMIN_CREDENTIALS', 'Invalid Admin username or password');
    }

    if (!adminUser) {
      const hashed = await HashUtil.hashPassword(cleanPassword);
      adminUser = await AuthRepository.createDefaultAdmin(hashed);
    }

    const tokenPayload: TokenPayload = {
      userId: adminUser.id,
      role: adminUser.role,
      phoneNumber: adminUser.phoneNumber || undefined,
      email: adminUser.email || undefined,
    };

    const tokens = this.generateTokens(tokenPayload);
    const tokenHash = HashUtil.sha256(tokens.refreshToken);

    await AuthRepository.updateUserTokens(adminUser.id, tokenHash);

    return {
      user: {
        id: adminUser.id,
        email: adminUser.email,
        phoneNumber: adminUser.phoneNumber,
        role: adminUser.role,
        profile: adminUser.profile,
      },
      tokens,
    };
  }

  static async logout(userId: string) {
    await AuthRepository.updateUserTokens(userId, null);
    await delCache(`user:${userId}`);
  }

  static async getMe(userId: string) {
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User profile not found');
    }
    return {
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
    };
  }
}
