import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { AppError } from '../shared/errors/app-error';
import { AuthUser } from '../shared/types/common.types';
import { getCache, setCache } from '../config/redis';
import {
  Permission,
  AccountCapability,
  getRolePermissions,
  hasPermission,
  resolveUserCapabilities,
} from '../shared/auth/rbac';

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
    const appContext = (request.headers['x-app-context'] as string)?.toLowerCase();
    const url = request.url || '';
    const isAdminRoute = url.includes('/admin');

    // 1. Isolate HTTP-only cookies strictly by application context.
    // Admin console sessions use 'admin_access_token', while public client sessions use 'access_token'.
    let token: string | undefined;

    if (appContext === 'admin' || isAdminRoute) {
      token = request.cookies?.admin_access_token;
    } else {
      token = request.cookies?.access_token || request.cookies?.token;
    }

    // 2. If cookie is absent, fallback to Authorization Bearer header (for mobile apps and APIs)
    if (!token && request.headers.authorization) {
      const authHeader = request.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    // 3. Reject if neither cookie nor authorization header is provided
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication token is required');
    }

    try {
      // 4. Verify token signature and expiration
      const decoded = fastify.jwt.verify<{ userId: string; role: UserRole; phoneNumber?: string }>(token);
      const cacheKey = `user:${decoded.userId}`;

      let cached = await getCache<AuthUser>(cacheKey);
      if (!cached) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            role: true,
            status: true,
            phoneNumber: true,
            email: true,
            capabilities: true,
            profile: {
              select: {
                accountType: true,
              },
            },
          },
        });

        if (!user || user.status !== 'ACTIVE') {
          throw new AppError(401, 'USER_INACTIVE', 'User account is inactive or suspended');
        }

        // Prevent regular non-staff user tokens from accessing admin console
        if ((appContext === 'admin' || isAdminRoute) && user.role === 'USER') {
          throw new AppError(403, 'FORBIDDEN', 'Access denied to admin console');
        }

        cached = {
          id: user.id,
          role: user.role,
          phoneNumber: user.phoneNumber || undefined,
          email: user.email || undefined,
          permissions: getRolePermissions(user.role),
          capabilities: resolveUserCapabilities(user),
        };

        // Cache authenticated user identity in Redis for 60 seconds
        await setCache(cacheKey, cached, 60);
      }

      request.user = cached;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (
        err.name === 'FastifyJWTError' ||
        err.name === 'JsonWebTokenError' ||
        err.name === 'TokenExpiredError' ||
        err.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER'
      ) {
        throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token');
      }
      throw new AppError(401, 'UNAUTHORIZED', err.message || 'Authentication failed');
    }
  });
});

/**
 * Coarse-grained Role authorization guard (Supports backward compatibility)
 */
export function authorizeRoles(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !roles.includes(request.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource');
    }
  };
}

/**
 * Fine-grained Permission authorization guard
 * Requires user to have at least one of the specified permissions.
 * Super Admin has automatic wildcard access ('*').
 */
export function requirePermission(...requiredPermissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const authorized = requiredPermissions.some((perm) =>
      hasPermission(request.user.role, perm, request.user.permissions)
    );

    if (!authorized) {
      throw new AppError(
        403,
        'FORBIDDEN_PERMISSION',
        `Forbidden. This operation requires permission: ${requiredPermissions.join(' or ')}`
      );
    }
  };
}

/**
 * Marketplace Account Capability guard
 * Checks if user holds required marketplace capability (e.g. can_sell, can_buy, is_dealer).
 * Ensures buyer/seller are handled via account capabilities rather than rigid mutually exclusive roles.
 */
export function requireCapability(...requiredCapabilities: AccountCapability[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Admins and Super Admins automatically bypass seller capability restrictions
    if (request.user.role === UserRole.SUPER_ADMIN || request.user.role === UserRole.ADMIN) {
      return;
    }

    const userCaps = request.user.capabilities || [];
    const missing = requiredCapabilities.filter((cap) => !userCaps.includes(cap));

    if (missing.length > 0) {
      throw new AppError(
        403,
        'FORBIDDEN_CAPABILITY',
        `Your account does not have permission to perform this action. Missing capability: ${missing.join(', ')}`
      );
    }
  };
}
