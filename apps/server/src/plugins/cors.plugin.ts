import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../config/env';

export const corsPlugin = fp(async (fastify: FastifyInstance) => {
  // Parse configured CORS origins from env (comma-separated or single URL)
  const configuredOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        (env.NODE_ENV !== 'production' &&
          (origin.includes('localhost') || origin.includes('127.0.0.1'))) ||
        origin.includes('github.dev') ||
        origin.includes('app.github.dev')
      ) {
        return cb(null, true);
      }

      // Check configured production origins (e.g. https://olx.bnorbit.tech)
      if (configuredOrigins.includes(origin)) {
        return cb(null, true);
      }

      const allowed = [
        env.CLIENT_URL,
        env.ADMIN_URL,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://localhost:3000',
        'http://localhost:80',
      ].filter(Boolean) as string[];

      if (allowed.includes(origin)) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id', 'x-app-context'],
  });
});
