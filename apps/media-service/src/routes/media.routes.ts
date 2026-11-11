import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MediaStorageService } from '../services/storage.service';

export async function mediaRoutes(fastify: FastifyInstance) {
  // Liveness check
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'olx-media-service',
    timestamp: new Date().toISOString(),
  }));

  // Storage Overview & Metrics for Admin Dashboard
  fastify.get('/metrics', async (_req, reply) => {
    const metrics = await MediaStorageService.getMetrics();
    return reply.status(200).send({ success: true, data: metrics });
  });

  // Upload single or multiple media files
  const uploadHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.isMultipart()) {
      return reply.status(400).send({
        code: 'MEDIA_INVALID_REQUEST',
        message: 'Request content-type must be multipart/form-data',
      });
    }

    // Extract user from JWT header or query or fallback to authenticated system user
    const user = (request as any).user;
    const ownerId = user?.id || (request.headers['x-user-id'] as string) || 'system-user';

    const query = (request.query as any) || {};
    const entityType = query.entityType || (query.resource === 'chats' ? 'CHAT' : 'LISTING');
    const entityId = query.entityId || query.resourceId;

    const parts = request.files();
    const uploadedAssets: any[] = [];
    let fileCount = 0;

    for await (const part of parts) {
      fileCount++;
      if (fileCount > 10) {
        return reply.status(400).send({
          code: 'MEDIA_MAX_FILES_EXCEEDED',
          message: 'You can upload a maximum of 10 media files per request',
        });
      }

      try {
        const asset = await MediaStorageService.handleUpload(
          ownerId,
          part.file,
          part.filename,
          { entityType, entityId }
        );
        uploadedAssets.push(asset);
      } catch (err: any) {
        return reply.status(400).send({
          code: err.message?.startsWith('MEDIA_') ? err.message.split(':')[0] : 'MEDIA_UPLOAD_FAILED',
          message: err.message || 'Unable to process the uploaded file.',
        });
      }
    }

    if (uploadedAssets.length === 0) {
      return reply.status(400).send({
        code: 'MEDIA_NO_FILES',
        message: 'No files uploaded',
      });
    }

    return reply.status(202).send({
      success: true,
      data: uploadedAssets,
      message: 'Media uploaded and queued for processing',
    });
  };

  fastify.post('/upload', uploadHandler);
  fastify.post('/images', uploadHandler);

  // Get Asset details & status
  fastify.get('/:assetId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { assetId } = request.params as { assetId: string };
    const asset = await MediaStorageService.getAsset(assetId);
    if (!asset) {
      return reply.status(404).send({
        code: 'MEDIA_NOT_FOUND',
        message: `Media asset "${assetId}" was not found`,
      });
    }
    return reply.status(200).send({ success: true, data: asset });
  });

  // Soft Delete
  fastify.delete('/:assetId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { assetId } = request.params as { assetId: string };
    const user = (request as any).user;
    const ownerId = user?.id || (request.headers['x-user-id'] as string);

    try {
      const deleted = await MediaStorageService.softDeleteAsset(assetId, ownerId);
      if (!deleted) {
        return reply.status(404).send({
          code: 'MEDIA_NOT_FOUND',
          message: 'Media asset not found',
        });
      }
      return reply.status(200).send({ success: true, message: 'Media moved to trash' });
    } catch (err: any) {
      return reply.status(403).send({
        code: 'MEDIA_ACCESS_DENIED',
        message: err.message || 'Access denied',
      });
    }
  });

  // Restore
  fastify.post('/:assetId/restore', async (request: FastifyRequest, reply: FastifyReply) => {
    const { assetId } = request.params as { assetId: string };
    const user = (request as any).user;
    const ownerId = user?.id || (request.headers['x-user-id'] as string);

    try {
      const restored = await MediaStorageService.restoreAsset(assetId, ownerId);
      if (!restored) {
        return reply.status(404).send({
          code: 'MEDIA_NOT_FOUND',
          message: 'Media asset not found',
        });
      }
      return reply.status(200).send({ success: true, message: 'Media restored successfully' });
    } catch (err: any) {
      return reply.status(403).send({
        code: 'MEDIA_ACCESS_DENIED',
        message: err.message || 'Access denied',
      });
    }
  });
}

