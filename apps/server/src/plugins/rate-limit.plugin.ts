import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { redis } from '../config/redis';
import { env } from '../config/env';

export const rateLimitPlugin = fp(async (fastify: FastifyInstance) => {
  // If rate limiting is disabled (default in local development), bypass registration
  if (!env.ENABLE_RATE_LIMIT) {
    fastify.log.info(
      '⚠️ [RateLimit] Rate limiting is DISABLED for development. (Set ENABLE_RATE_LIMIT=true in .env to enable)'
    );
    return;
  }

  await fastify.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    redis: (redis as any).status === 'ready' ? redis : undefined,
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please try again shortly.',
      },
    }),
  });
});
