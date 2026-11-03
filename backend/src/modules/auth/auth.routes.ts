import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/otp/send', AuthController.sendOtp);
  fastify.post('/otp/verify', AuthController.verifyOtp);
  fastify.post('/admin-login', AuthController.adminLogin);
  fastify.post('/refresh', AuthController.refreshTokens);

  fastify.get('/me', { preHandler: [fastify.authenticate] }, AuthController.getMe);
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, AuthController.logout);
}
