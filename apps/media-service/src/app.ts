import Fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { mediaRoutes } from './routes/media.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
    bodyLimit: 50 * 1024 * 1024, // 50MB
  });

  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  await app.register(fastifyHelmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(fastifyRateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max per file
      files: 10,
    },
  });

  // Mount media routes under /api/v1/media and root /
  await app.register(mediaRoutes, { prefix: '/api/v1/media' });
  await app.register(mediaRoutes);

  return app;
}

