// Polyfill BigInt serialization for Fastify / JSON.stringify
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

import fastify, { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
import querystring from 'querystring';
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
import { resolveUploadDir } from './integrations/storage/storage.adapter';

// Modular Route Imports
import { authRoutes } from './modules/auth/auth.routes';
import { categoryRoutes } from './modules/categories/categories.routes';
import { locationRoutes, adminLocationRoutes } from './modules/locations/locations.routes';
import { listingRoutes } from './modules/listings/listings.routes';
import { userRoutes } from './modules/users/users.routes';
import { chatRoutes } from './modules/chat/chat.routes';
import { chatAdminRoutes } from './modules/chat/chat.admin.routes';
import { reportRoutes } from './modules/reports/reports.routes';
import { paymentRoutes } from './modules/payments/payments.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { uploadRoutes } from './modules/uploads/uploads.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { notificationRoutes } from './modules/notifications/notifications.routes';
import { revenueRoutes } from './modules/revenue/revenue.routes';
import { bannerRoutes } from './modules/banners/banners.routes';
import { ListingsController } from './modules/listings/listings.controller';
import { defaultStorage } from './integrations/storage/storage.adapter';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: env.NODE_ENV === 'development' ? { level: 'info' } : { level: 'warn' },
    trustProxy: true,
    ignoreTrailingSlash: true,
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

  // Support application/x-www-form-urlencoded payloads for payment provider callbacks & webhooks
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (req, body, defaultDone) => {
    try {
      const parsed = querystring.parse(typeof body === 'string' ? body : body.toString('utf-8'));
      defaultDone(null, parsed);
    } catch (err: any) {
      defaultDone(err, undefined);
    }
  });

  // Plugins
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);

  // File Uploads & Static files
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max per file (supports 50MB promotional videos)
      files: 10, // max 10 files per batch
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

  // Support direct /olx-media/ URLs from local storage mirror
  await app.register(fastifyStatic, {
    root: uploadRoots.length > 1 ? uploadRoots : sharedUploadDir,
    prefix: '/olx-media/',
    decorateReply: false,
    setHeaders: (res, pathName) => {
      if (pathName.endsWith('.webp') || pathName.endsWith('.avif') || pathName.includes('variants')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  });

  // Support direct /media/ URLs from persistent local filesystem root (MEDIA_ROOT)
  const mediaRoot = resolveUploadDir();
  if (!fs.existsSync(mediaRoot)) {
    try { fs.mkdirSync(mediaRoot, { recursive: true }); } catch {}
  }
  await app.register(fastifyStatic, {
    root: mediaRoot,
    prefix: '/media/',
    decorateReply: false,
    setHeaders: (res, pathName) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      // Protect internal directories from direct Fastify serving if attempted
      if (pathName.startsWith('/temp') || pathName.startsWith('/quarantine') || pathName.startsWith('/trash') || pathName.startsWith('/failed')) {
        res.statusCode = 403;
      }
      if (pathName.endsWith('.webp') || pathName.endsWith('.avif')) {
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      }
    },
  });

  // Single Source of Truth Image Fallback: Ensure 100% availability from local disk
  app.addHook('onRequest', async (req, reply) => {
    if (req.url.startsWith('/media/')) {
      const cleanPath = req.url.replace(/^\/media\//, '').split('?')[0];
      const targetPath = path.join(mediaRoot, cleanPath);
      if (!fs.existsSync(targetPath)) {
        const dir = path.dirname(targetPath);
        if (fs.existsSync(dir)) {
          const singleTruth = path.join(dir, 'image.webp');
          if (fs.existsSync(singleTruth)) {
            return reply.sendFile(path.relative(mediaRoot, singleTruth), mediaRoot);
          }
          const altVariant = ['large.webp', 'card.webp', 'medium.webp', 'thumbnail.webp', 'original.webp'].find((v) =>
            fs.existsSync(path.join(dir, v))
          );
          if (altVariant) {
            return reply.sendFile(path.relative(mediaRoot, path.join(dir, altVariant)), mediaRoot);
          }
        }
      }
    }
  });

  // Authentication & Errors
  await app.register(authPlugin);
  await app.register(errorHandlerPlugin);

  // Load Balancer Liveness Probe: Fast zero-overhead check for load balancers (AWS ALB, NGINX, Traefik)
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'olx-fastify-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  // Load Balancer Readiness Probe: Validates database and cache readiness before routing traffic
  app.get('/ready', async (_request, reply) => {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseConnection(),
      isRedisHealthy(),
    ]);

    const isReady = dbHealthy;
    return reply.status(isReady ? 200 : 503).send({
      status: isReady ? 'ready' : 'unhealthy',
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected',
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

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
    await api.register(chatRoutes); // Direct /conversations alias
    await api.register(reportRoutes, { prefix: '/moderation' });
    await api.register(paymentRoutes, { prefix: '/payments' });
    await api.register(adminRoutes, { prefix: '/admin' });
    await api.register(adminLocationRoutes, { prefix: '/admin/locations' });
    await api.register(chatAdminRoutes, { prefix: '/admin/chat' });
    await api.register(uploadRoutes, { prefix: '/uploads' });
    await api.register(mediaRoutes, { prefix: '/media' });
    await api.register(notificationRoutes, { prefix: '/notifications' });
    await api.register(revenueRoutes, { prefix: '/revenue' });
    await api.register(bannerRoutes, { prefix: '/banners' });
  }, { prefix: '/api/v1' });

  return app;
}
