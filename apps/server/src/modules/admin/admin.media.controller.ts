import { FastifyReply, FastifyRequest } from 'fastify';
import { AdminMediaService } from './admin.media.service';
import { adminMediaQuerySchema, updateMediaMetadataSchema } from './admin.media.schema';

export class AdminMediaController {
  // Returns storage metrics, file counts, S3 sync status, and WebP optimization analytics
  static async getOverview(_request: FastifyRequest, reply: FastifyReply) {
    const overview = await AdminMediaService.getOverview();
    return reply.status(200).send({
      success: true,
      data: overview,
    });
  }

  // Lists all media records with filtering by status, scope, search, pagination, and sorting
  static async getAllMedia(request: FastifyRequest, reply: FastifyReply) {
    const query = adminMediaQuerySchema.parse(request.query);
    const result = await AdminMediaService.getAllMedia(query);
    return reply.status(200).send({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  }

  // Retrieves detailed metadata for a single media item by ID
  static async getMediaById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const media = await AdminMediaService.getMediaById(id);
    return reply.status(200).send({
      success: true,
      data: media,
    });
  }

  // Updates media metadata or replaces image file with immediate old-file purge
  static async updateMedia(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const actorUserId = request.user?.id;

    // Check if request is multipart/form-data for file replacement
    if (request.isMultipart()) {
      const part = await request.file();
      const baseUrl = `${request.protocol}://${request.hostname}`;
      const result = await AdminMediaService.replaceMediaFile(id, part, baseUrl, actorUserId);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    }

    // JSON metadata update
    const input = updateMediaMetadataSchema.parse(request.body);
    const updated = await AdminMediaService.updateMediaMetadata(id, input, actorUserId);
    return reply.status(200).send({
      success: true,
      data: updated,
    });
  }

  // Permanently deletes media record and removes all physical files & variants from storage
  static async deleteMedia(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const actorUserId = request.user?.id;

    const result = await AdminMediaService.deleteMedia(id, actorUserId);
    return reply.status(200).send({
      ...result,
      data: result,
    });
  }

  // Purges unattached orphan files to reclaim disk/S3 space (gracePeriodHours = 0 means purge all unattached)
  static async cleanupOrphanedMedia(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { hours?: string };
    const parsedHours = query?.hours !== undefined ? Number(query.hours) : 0;
    const gracePeriodHours = isNaN(parsedHours) ? 0 : Math.max(0, parsedHours);
    const actorUserId = request.user?.id;

    const result = await AdminMediaService.cleanupOrphanedMedia(gracePeriodHours, actorUserId);
    return reply.status(200).send({
      ...result,
      data: result,
    });
  }
}
