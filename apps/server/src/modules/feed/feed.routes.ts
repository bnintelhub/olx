import { FastifyInstance } from 'fastify';
import { FeedController } from './feed.controller';

export async function feedRoutes(fastify: FastifyInstance) {
  const rateCfg = {
    rateLimit: {
      max: 90,
      timeWindow: '1 minute',
    },
  };

  fastify.get(
    '/home',
    { preHandler: [fastify.optionalAuthenticate], config: rateCfg },
    FeedController.home
  );

  fastify.get('/trending', { config: rateCfg }, FeedController.trending);

  fastify.get('/similar/:listing_id', { config: rateCfg }, FeedController.similar);
}
