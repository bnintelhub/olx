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
  acceptInvitationSchema,
} from './auth.schema';
import { writeAuditLog } from '../../shared/utils/audit.util';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { AuthTokens } from './auth.types';

// Sets secure HTTP-only cookies on reply to keep the user logged in across page reloads.
// Configures short-lived access token and 30-day refresh token with CSRF-safe SameSite.
function setAuthCookies(reply: FastifyReply, tokens: AuthTokens) {
  reply.setCookie('access_token', tokens.accessToken, {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60,
  });

  reply.setCookie('refresh_token', tokens.refreshToken, {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
  });
}

// Clears authentication cookies from the client browser on user logout.
// Ensures expired or terminated sessions cannot be replayed from the browser.
function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('access_token', { path: '/' });
  reply.clearCookie('refresh_token', { path: '/' });
}

export class AuthController {
  // Registers a new user account with email and password, hashing credentials securely.
  // Records an immutable registration event in the audit trail for compliance.
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

  // Authenticates email/password credentials and issues fresh access and refresh tokens.
  // Sets secure HTTP-only cookies and logs the login attempt in the audit log.
  static async login(request: FastifyRequest, reply: FastifyReply) {
    const body = loginSchema.parse(request.body);
    const result = await AuthService.login(body);

    setAuthCookies(reply, result.tokens);

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

  // Validates a 6-digit email verification code sent during signup or password recovery.
  // Activates the session upon successful verification and sets session cookies.
  static async verifyEmailOtp(request: FastifyRequest, reply: FastifyReply) {
    const body = verifyEmailOtpSchema.parse(request.body);
    const result = await AuthService.verifyEmailOtp(body);

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

  // Initiates password recovery by generating and emailing a time-limited OTP code.
  // Enforces cooldown periods to protect against email enumeration and abuse.
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

  // Confirms the password reset OTP code and updates the user's password in the database.
  // Invalidates existing active sessions to prevent continued access with old credentials.
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

  // Issues a fresh OTP code when a prior verification code has expired or failed delivery.
  // Applies strict rate-limiting cooldowns in production environments.
  static async resendOtp(request: FastifyRequest, reply: FastifyReply) {
    const body = resendOtpSchema.parse(request.body);
    const result = await AuthService.resendOtp(body);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  // Generates and sends a 6-digit SMS verification code to the provided mobile number.
  // Creates an ephemeral OTP session in Redis with a 5-minute time-to-live.
  static async sendOtp(request: FastifyRequest, reply: FastifyReply) {
    const { phoneNumber } = sendOtpSchema.parse(request.body);
    const result = await AuthService.sendOtp(phoneNumber);

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  // Verifies the submitted mobile OTP code against the active Redis session.
  // Automatically provisions a new user record if the phone number is not registered.
  static async verifyOtp(request: FastifyRequest, reply: FastifyReply) {
    const { phoneNumber, sessionId, otp } = verifyOtpSchema.parse(request.body);
    const result = await AuthService.verifyOtp(sessionId, phoneNumber, otp);

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

  // Exchanges a valid long-lived refresh token for a newly minted access token pair.
  // Reads refresh token from request body with fallback to HTTP-only cookie.
  static async refreshTokens(request: FastifyRequest, reply: FastifyReply) {
    const bodyToken = (request.body as { refreshToken?: string })?.refreshToken;
    const refreshToken = bodyToken || request.cookies?.refresh_token;

    if (!refreshToken) {
      throw new AppError(400, 'REFRESH_TOKEN_REQUIRED', 'Refresh token is required in request body or cookie');
    }

    const tokens = await AuthService.refreshTokens(refreshToken);
    setAuthCookies(reply, tokens);

    return reply.status(200).send({
      success: true,
      data: tokens,
    });
  }

  // Authenticates administrative staff and verifies their assigned access privileges.
  // Sets secure HTTP-only session cookies and logs failure attempts to audit.
  static async adminLogin(request: FastifyRequest, reply: FastifyReply) {
    const { username, password, role } = adminLoginSchema.parse(request.body);
    try {
      const result = await AuthService.adminLogin(username, password, role);

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

  // Fetches current authenticated user details, permissions, and listing counts.
  // Reads session identity directly from the verified JWT payload.
  static async getMe(request: FastifyRequest, reply: FastifyReply) {
    const user = await AuthService.getMe(request.user!.id);
    return reply.status(200).send({
      success: true,
      data: user,
    });
  }

  // Terminates the authenticated user session by clearing refresh token hashes in Postgres.
  // Clears HTTP-only browser cookies and records an audit log entry.
  static async logout(request: FastifyRequest, reply: FastifyReply) {
    await AuthService.logout(request.user!.id);
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

  // Validates a staff invitation token and returns associated metadata.
  // Used by the public onboarding page to confirm role and email before submission.
  static async getInvitation(request: FastifyRequest, reply: FastifyReply) {
    const { token } = request.params as { token: string };
    const details = await AuthService.getInvitationByToken(token);
    return reply.status(200).send({ success: true, data: details });
  }

  // Completes staff onboarding by validating token, setting user password, and granting role.
  // Automatically signs the user in by setting secure HTTP-only cookies on response.
  static async acceptInvitation(request: FastifyRequest, reply: FastifyReply) {
    const body = acceptInvitationSchema.parse(request.body);
    const result = await AuthService.acceptStaffInvitation(body);

    setAuthCookies(reply, result.tokens);

    await writeAuditLog({
      userId: result.user.id,
      action: 'STAFF_INVITATION_ACCEPTED',
      entityType: 'USER',
      entityId: result.user.id,
      newData: {
        email: result.user.email,
        role: result.user.role,
      },
      request,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      message: 'Invitation accepted successfully. Account activated.',
    });
  }
}
