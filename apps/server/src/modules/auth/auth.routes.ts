import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';

export async function authRoutes(fastify: FastifyInstance) {
  // Email-based Auth & Password Recovery
  fastify.post('/register', AuthController.register);
  fastify.post('/login', AuthController.login);
  fastify.post('/verify-email-otp', AuthController.verifyEmailOtp);
  fastify.post('/forgot-password', AuthController.forgotPassword);
  fastify.post('/reset-password', AuthController.resetPassword);
  fastify.post('/resend-otp', AuthController.resendOtp);

  // Mobile OTP & Admin Portal
  fastify.post('/otp/send', AuthController.sendOtp);
  fastify.post('/otp/verify', AuthController.verifyOtp);
  fastify.post('/admin-login', AuthController.adminLogin);
  fastify.post('/refresh', AuthController.refreshTokens);

  // Staff Invitation Acceptance (Public)
  fastify.get('/invitation/:token', AuthController.getInvitation);
  fastify.post('/accept-invitation', AuthController.acceptInvitation);

  // Authenticated endpoints
  fastify.get('/me', { preHandler: [fastify.authenticate] }, AuthController.getMe);
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, AuthController.logout);
}
