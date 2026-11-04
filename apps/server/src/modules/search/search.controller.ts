import { FastifyReply, FastifyRequest } from 'fastify';
import { SearchService } from './search.service';
import { searchSchema } from './search.schema';

export class SearchController {
  static async search(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as Record<string, any>;
    const parsed = searchSchema.parse(query);

    const attributes: Record<string, any> = {};
    for (const key of Object.keys(query || {})) {
      if (key.startsWith('attr_')) {
        attributes[key.replace('attr_', '')] = query[key];
      }
    }

    const result = await SearchService.search({
      ...parsed,
      attributes,
    });

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  static async getSuggestions(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { q?: string; citySlug?: string; limit?: string };
    const q = query?.q || '';
    const citySlug = query?.citySlug;
    const limit = Math.min(20, Math.max(1, Number(query?.limit) || 8));

    const suggestions = await SearchService.getSuggestions(q, citySlug, limit);
    return reply.status(200).send({
      success: true,
      data: suggestions,
    });
  }

  static async getSimilar(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const similar = await SearchService.getSimilar(id);
    return reply.status(200).send({
      success: true,
      data: similar,
    });
  }
}
