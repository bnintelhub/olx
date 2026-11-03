import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  adminLoginSchema,
} from './auth.schema';
import { writeAuditLog } from '../../shared/utils/audit.util';

export class AuthController {
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
