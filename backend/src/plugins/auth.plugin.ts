import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { AppError } from '../shared/errors/app-error';
import { AuthUser } from '../shared/types/common.types';
import { getCache, setCache } from '../config/redis';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication token is required');
    }

    try {
      const decoded = await request.jwtVerify<{ userId: string; role: UserRole; phoneNumber?: string }>();
      const cacheKey = `user:${decoded.userId}`;

      let cached = await getCache<AuthUser>(cacheKey);
      if (!cached) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, role: true, status: true, phoneNumber: true, email: true },
        });

        if (!user || user.status !== 'ACTIVE') {
          throw new AppError(401, 'USER_INACTIVE', 'User account is inactive or suspended');
        }

        cached = {
          id: user.id,
          role: user.role,
          phoneNumber: user.phoneNumber || undefined,
          email: user.email || undefined,
        };

        await setCache(cacheKey, cached, 60);
      }

      request.user = cached;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (err.name === 'FastifyJWTError' || err.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
        throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token');
      }
      throw new AppError(401, 'UNAUTHORIZED', err.message || 'Authentication failed');
    }
  });
});

export function authorizeRoles(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !roles.includes(request.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource');
    }
  };
}
