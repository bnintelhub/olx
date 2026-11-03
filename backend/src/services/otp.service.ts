import crypto from 'crypto';
import { prisma } from '../prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { OtpPurpose } from '@prisma/client';

export class OtpService {
  /**
   * Sanitizes Indian mobile numbers into standard E.164 format (+91XXXXXXXXXX)
   */
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

  /**
   * Send OTP to user phone number
   */
  static async sendOtp(rawPhone: string, purpose: OtpPurpose = OtpPurpose.LOGIN) {
    const phoneNumber = this.sanitizePhoneNumber(rawPhone);

    // 1. Check cooldown window (45 seconds)
    const recentSession = await prisma.otpSession.findFirst({
      where: {
        phoneNumber,
        createdAt: { gte: new Date(Date.now() - env.OTP_RESEND_COOLDOWN_SECONDS * 1000) },
      },
    });

    if (recentSession) {
      throw new AppError(
        429,
        'OTP_RATE_LIMITED',
        `Please wait ${env.OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new OTP.`
      );
    }

    // 2. Generate 6-digit OTP
    const otpCode = env.NODE_ENV === 'development' && env.SMS_PROVIDER === 'MOCK'
      ? env.MOCK_OTP_CODE
      : Math.floor(100000 + Math.random() * 900000).toString();

    const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);

    // 3. Save OTP Session in DB
    const session = await prisma.otpSession.create({
      data: {
        phoneNumber,
        otpHash,
        purpose,
        expiresAt,
      },
    });

    // 4. Dispatch SMS
    if (env.SMS_PROVIDER === 'MOCK') {
      console.log(`\n======================================================`);
      console.log(`📱 [MOCK SMS GATEWAY]`);
      console.log(`To: ${phoneNumber}`);
      console.log(`Your OLX ORBIT (OLX) verification OTP is: ${otpCode}`);
      console.log(`Valid for 5 minutes.`);
      console.log(`======================================================\n`);
    } else {
      // In production: MSG91 or Twilio API call
      console.log(`[SMS Service] Dispatched OTP to ${phoneNumber}`);
    }

    return {
      sessionId: session.id,
      expiresInSeconds: env.OTP_EXPIRY_SECONDS,
      resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      mockOtp: env.NODE_ENV === 'development' ? otpCode : undefined,
    };
  }

  /**
   * Verify submitted OTP code
   */
  static async verifyOtp(sessionId: string, rawPhone: string, submittedOtp: string) {
    const phoneNumber = this.sanitizePhoneNumber(rawPhone);

    const session = await prisma.otpSession.findUnique({
      where: { id: sessionId },
    });

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

    const submittedHash = crypto.createHash('sha256').update(submittedOtp).digest('hex');

    if (submittedHash !== session.otpHash) {
      await prisma.otpSession.update({
        where: { id: sessionId },
        data: { attempts: { increment: 1 } },
      });
      throw new AppError(400, 'INCORRECT_OTP', 'Incorrect OTP entered. Please try again.');
    }

    // Mark session as used
    await prisma.otpSession.update({
      where: { id: sessionId },
      data: { isUsed: true },
    });

    return { phoneNumber };
  }
}
