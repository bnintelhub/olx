import { FastifyReply, FastifyRequest } from 'fastify';
import { FeedService } from './feed.service';

export class FeedController {
  static async home(request: FastifyRequest, reply: FastifyReply) {
    const q = (request.query || {}) as Record<string, string | undefined>;
    const userId = request.user?.id || null;
    const sessionId = q.sessionId || (request.headers['x-session-id'] as string) || null;

    const result = await FeedService.getHomeFeed(
      {
        userId,
        sessionId,
        citySlug: q.citySlug || q.city,
        locationId: q.locationId,
        latitude: q.latitude ? Number(q.latitude) : undefined,
        longitude: q.longitude ? Number(q.longitude) : undefined,
        cursor: q.cursor,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      request
    );

    return reply.status(200).send(result);
  }

  static async trending(request: FastifyRequest, reply: FastifyReply) {
    const q = (request.query || {}) as Record<string, string | undefined>;
    const result = await FeedService.getTrendingFeed({
      citySlug: q.citySlug || q.city,
      categorySlug: q.categorySlug || q.category,
      cursor: q.cursor,
      limit: q.limit ? Number(q.limit) : undefined,
    });

    return reply.status(200).send(result);
  }

  static async similar(request: FastifyRequest, reply: FastifyReply) {
    const { listing_id } = request.params as { listing_id: string };
    const q = (request.query || {}) as { limit?: string };
    const result = await FeedService.getSimilarFeed(
      listing_id,
      q.limit ? Number(q.limit) : undefined
    );

    return reply.status(200).send(result);
  }
}
