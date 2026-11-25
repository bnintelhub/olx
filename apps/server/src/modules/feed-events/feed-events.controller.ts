import { FastifyReply, FastifyRequest } from 'fastify';
import { ingestEventsSchema } from './feed-events.schema';
import { FeedEventsService } from './feed-events.service';

export class FeedEventsController {
  static async ingest(request: FastifyRequest, reply: FastifyReply) {
    const parsed = ingestEventsSchema.parse(request.body);
    const items = 'events' in parsed ? parsed.events : [parsed];

    // Never trust user_id from body; derive strictly from verified auth context
    const authUserId = request.user?.id || null;
    const headerSession = (request.headers['x-session-id'] as string) || null;

    const result = await FeedEventsService.ingest(authUserId, headerSession, items);

    return reply.status(202).send({
      success: true,
      data: result,
    });
  }
}
