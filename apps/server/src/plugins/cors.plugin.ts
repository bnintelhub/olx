import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../config/env';

export const corsPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        env.NODE_ENV !== 'production' &&
        (origin.includes('localhost') || origin.includes('127.0.0.1'))
      ) {
        return cb(null, true);
      }
      const allowed = [
        env.CLIENT_URL,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://localhost:3000',
        'http://localhost:80',
      ];
      if (allowed.includes(origin)) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id'],
  });
});
