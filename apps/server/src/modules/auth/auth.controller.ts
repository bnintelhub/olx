import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  verifyEmailOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendOtpSchema,
  sendOtpSchema,
  verifyOtpSchema,
  adminLoginSchema,
} from './auth.schema';
import { writeAuditLog } from '../../shared/utils/audit.util';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { AuthTokens } from './auth.types';

// Sets secure HTTP-only cookies on reply to keep the user logged in across page reloads
function setAuthCookies(reply: FastifyReply, tokens: AuthTokens) {
  // Access token cookie (short-lived, 15 minutes)
  reply.setCookie('access_token', tokens.accessToken, {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60,
  });

  // Refresh token cookie (long-lived, 30 days)
  reply.setCookie('refresh_token', tokens.refreshToken, {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
  });
}

// Clears authentication cookies on user logout
function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('access_token', { path: '/' });
  reply.clearCookie('refresh_token', { path: '/' });
}

export class AuthController {
  // ==========================================
  // EMAIL AUTH
  // ==========================================

  static async register(request: FastifyRequest, reply: FastifyReply) {
    const body = registerSchema.parse(request.body);
    const result = await AuthService.register(body);

    await writeAuditLog({
      action: 'USER_REGISTER',
      entityType: 'USER',
      entityId: body.email.slice(0, 50),
      request,
    });

    return reply.status(201).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  static async login(request: FastifyRequest, reply: FastifyReply) {
    const body = loginSchema.parse(request.body);
    const result = await AuthService.login(body);

    // Keep user logged in by setting secure HTTP-only cookies
    setAuthCookies(reply, result.tokens);

    // Record login in audit trail
    await writeAuditLog({
      userId: result.user.id,
      action: 'USER_EMAIL_LOGIN',
      entityType: 'USER',
      entityId: result.user.id,
      request,
    });

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  static async verifyEmailOtp(request: FastifyRequest, reply: FastifyReply) {
    const body = verifyEmailOtpSchema.parse(request.body);
    const result = await AuthService.verifyEmailOtp(body);

    // Keep user logged in by setting secure HTTP-only cookies
    setAuthCookies(reply, result.tokens);

    await writeAuditLog({
      userId: result.user.id,
      action: 'USER_EMAIL_VERIFY_LOGIN',
      entityType: 'USER',
      entityId: result.user.id,
      request,
    });

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  static async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const body = forgotPasswordSchema.parse(request.body);
    const result = await AuthService.forgotPassword(body);

    await writeAuditLog({
      action: 'USER_FORGOT_PASSWORD',
      entityType: 'USER',
      entityId: body.email.slice(0, 50),
      request,
    });

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  static async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const body = resetPasswordSchema.parse(request.body);
    const result = await AuthService.resetPassword(body);

    await writeAuditLog({
      action: 'USER_PASSWORD_RESET',
      entityType: 'USER',
      entityId: body.email.slice(0, 50),
      request,
    });

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  static async resendOtp(request: FastifyRequest, reply: FastifyReply) {
    const body = resendOtpSchema.parse(request.body);
    const result = await AuthService.resendOtp(body);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  // ==========================================
  // MOBILE OTP & ADMIN
  // ==========================================

  static async sendOtp(request: FastifyRequest, reply: FastifyReply) {
    const { phoneNumber } = sendOtpSchema.parse(request.body);
    const result = await AuthService.sendOtp(phoneNumber);

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  static async verifyOtp(request: FastifyRequest, reply: FastifyReply) {
    const { phoneNumber, sessionId, otp } = verifyOtpSchema.parse(request.body);
    const result = await AuthService.verifyOtp(sessionId, phoneNumber, otp);

    // Keep user logged in by setting secure HTTP-only cookies
    setAuthCookies(reply, result.tokens);

    await writeAuditLog({
      userId: result.user.id,
      action: 'USER_PHONE_LOGIN',
      entityType: 'USER',
      entityId: result.user.id,
      request,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  static async refreshTokens(request: FastifyRequest, reply: FastifyReply) {
    // Read refresh token from request body or fall back to HTTP-only cookie
    const bodyToken = (request.body as { refreshToken?: string })?.refreshToken;
    const refreshToken = bodyToken || request.cookies?.refresh_token;

    if (!refreshToken) {
      throw new AppError(400, 'REFRESH_TOKEN_REQUIRED', 'Refresh token is required in request body or cookie');
    }

    const tokens = await AuthService.refreshTokens(refreshToken);

    // Keep session active by setting updated cookies
    setAuthCookies(reply, tokens);

    return reply.status(200).send({
      success: true,
      data: tokens,
    });
  }

  static async adminLogin(request: FastifyRequest, reply: FastifyReply) {
    const { username, password } = adminLoginSchema.parse(request.body);
    try {
      const result = await AuthService.adminLogin(username, password);

      // Keep admin logged in with secure cookies
      setAuthCookies(reply, result.tokens);

      await writeAuditLog({
        userId: result.user.id,
        action: 'ADMIN_LOGIN',
        entityType: 'USER',
        entityId: result.user.id,
        request,
      });

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      await writeAuditLog({
        action: 'ADMIN_LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: username.slice(0, 50),
        request,
        newData: { reason: err.message },
      });
      throw err;
    }
  }

  static async getMe(request: FastifyRequest, reply: FastifyReply) {
    const user = await AuthService.getMe(request.user!.id);
    return reply.status(200).send({
      success: true,
      data: user,
    });
  }

  static async logout(request: FastifyRequest, reply: FastifyReply) {
    await AuthService.logout(request.user!.id);

    // Clear auth cookies on logout
    clearAuthCookies(reply);

    await writeAuditLog({
      userId: request.user!.id,
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: request.user!.id,
      request,
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  }
}
