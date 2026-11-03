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
  refreshTokenSchema,
  adminLoginSchema,
} from './auth.schema';
import { writeAuditLog } from '../../shared/utils/audit.util';

export class AuthController {
  // ==========================================
  // EMAIL AUTH
  // ==========================================

  static async register(request: FastifyRequest, reply: FastifyReply) {
    const body = registerSchema.parse(request.body);
    const result = await AuthService.register(body);

    return reply.status(201).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  static async login(request: FastifyRequest, reply: FastifyReply) {
    const body = loginSchema.parse(request.body);
    const result = await AuthService.login(body);

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

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  static async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const body = forgotPasswordSchema.parse(request.body);
    const result = await AuthService.forgotPassword(body);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  static async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const body = resetPasswordSchema.parse(request.body);
    const result = await AuthService.resetPassword(body);

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

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  static async refreshTokens(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = refreshTokenSchema.parse(request.body);
    const tokens = await AuthService.refreshTokens(refreshToken);

    return reply.status(200).send({
      success: true,
      data: tokens,
    });
  }

  static async adminLogin(request: FastifyRequest, reply: FastifyReply) {
    const { username, password } = adminLoginSchema.parse(request.body);
    try {
      const result = await AuthService.adminLogin(username, password);
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
        entityId: username.slice(0, 100),
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
