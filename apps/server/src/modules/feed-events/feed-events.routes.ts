import { FastifyInstance } from 'fastify';
import { FeedEventsController } from './feed-events.controller';

export async function feedEventRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      preHandler: [fastify.optionalAuthenticate],
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
    },
    FeedEventsController.ingest
  );
}
