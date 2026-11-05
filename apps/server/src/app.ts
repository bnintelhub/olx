import fastify, { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { corsPlugin } from './plugins/cors.plugin';
import { rateLimitPlugin } from './plugins/rate-limit.plugin';
import { swaggerPlugin } from './plugins/swagger.plugin';
import { errorHandlerPlugin } from './plugins/error-handler.plugin';
import { authPlugin } from './plugins/auth.plugin';
import { env } from './config/env';
import { checkDatabaseConnection } from './config/prisma';
import { isRedisHealthy } from './config/redis';

// Modular Route Imports
import { authRoutes } from './modules/auth/auth.routes';
import { categoryRoutes } from './modules/categories/categories.routes';
import { locationRoutes } from './modules/locations/locations.routes';
import { listingRoutes } from './modules/listings/listings.routes';
import { userRoutes } from './modules/users/users.routes';
import { chatRoutes } from './modules/chat/chat.routes';
import { reportRoutes } from './modules/reports/reports.routes';
import { paymentRoutes } from './modules/payments/payments.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { uploadRoutes } from './modules/uploads/uploads.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { notificationRoutes } from './modules/notifications/notifications.routes';
import { ListingsController } from './modules/listings/listings.controller';
import { defaultStorage } from './integrations/storage/storage.adapter';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: env.NODE_ENV === 'development' ? { level: 'info' } : { level: 'warn' },
    trustProxy: true,
  });

  // Security headers
  await app.register(fastifyHelmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  });

  // Parse HTTP cookies for cookie-based authentication
  await app.register(fastifyCookie, {
    secret: env.JWT_ACCESS_SECRET,
    hook: 'onRequest',
  });

  // Plugins
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);

  // File Uploads & Static files
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max per file
      files: 10, // max 10 images per upload
    },
  });

  const sharedUploadDir = defaultStorage.getUploadDir();
  const uploadRoots = [
    sharedUploadDir,
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(sharedUploadDir, 'apps/workers/uploads'),
    path.resolve(process.cwd(), '../workers/uploads'),
  ].filter((p, i, a) => fs.existsSync(p) && a.indexOf(p) === i);

  await app.register(fastifyStatic, {
    root: uploadRoots.length > 1 ? uploadRoots : sharedUploadDir,
    prefix: '/uploads/',
    decorateReply: false,
    setHeaders: (res, pathName) => {
      // Long-lived immutable caching for pre-processed image variants
      if (pathName.endsWith('.webp') || pathName.endsWith('.avif') || pathName.includes('variants')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  });

  // Authentication & Errors
  await app.register(authPlugin);
  await app.register(errorHandlerPlugin);

  // API v1 Modular Routes
  await app.register(async (api) => {
    // Health Check
    api.get('/health', async (request, reply) => {
      const [dbHealthy, redisHealthy] = await Promise.all([
        checkDatabaseConnection(),
        isRedisHealthy(),
      ]);

      const isHealthy = dbHealthy;
      return reply.status(isHealthy ? 200 : 503).send({
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        service: 'olx-fastify-backend',
        database: {
          type: 'PostgreSQL 16 (Docker)',
          status: dbHealthy ? 'connected' : 'disconnected',
        },
        redis: {
          type: 'Redis 7 (Docker)',
          status: redisHealthy ? 'connected' : 'disconnected',
        },
      });
    });

    // User my-ads dashboard endpoint
    api.get(
      '/user/my-ads',
      { preHandler: [app.authenticate] },
      ListingsController.getMyAds
    );

    // Register modules
    await api.register(authRoutes, { prefix: '/auth' });
    await api.register(categoryRoutes, { prefix: '/categories' });
    await api.register(locationRoutes, { prefix: '/locations' });
    await api.register(listingRoutes, { prefix: '/ads' });
    await api.register(listingRoutes, { prefix: '/listings' });
    await api.register(userRoutes, { prefix: '/user' });
    await api.register(chatRoutes, { prefix: '/chat' });
    await api.register(reportRoutes, { prefix: '/moderation' });
    await api.register(paymentRoutes, { prefix: '/payments' });
    await api.register(adminRoutes, { prefix: '/admin' });
    await api.register(uploadRoutes, { prefix: '/uploads' });
    await api.register(mediaRoutes, { prefix: '/media' });
    await api.register(notificationRoutes, { prefix: '/notifications' });
  }, { prefix: '/api/v1' });

  return app;
}
