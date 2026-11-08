import { FastifyReply, FastifyRequest } from 'fastify';
import { MediaService } from './media.service';
import { mediaIdParamSchema } from './media.schema';
import { AppError } from '../../shared/errors/app-error';

export class MediaController {
  // POST /v1/media/images - Uploads up to 10 images, generates WebP variants via worker, and records metadata
  static async uploadImages(request: FastifyRequest, reply: FastifyReply) {
    if (!request.isMultipart()) {
      throw new AppError(400, 'INVALID_MULTIPART', 'Request content type must be multipart/form-data');
    }

    const userId = request.user?.id;
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required to upload media');
    }

    const host = request.headers.host || 'localhost:5000';
    const protocol = request.protocol === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const query = (request.query as any) || {};
    const defaultResource =
      request.url.includes('/ads') || request.url.includes('/listings') ? 'ads' : undefined;
    const resource = query.resource || defaultResource;

    if (!resource) {
      throw new AppError(
        400,
        'RESOURCE_REQUIRED',
        'The "resource" query parameter is required (e.g. ?resource=ads, users, categories, brands, chats, verification, system)'
      );
    }

    const validResources = ['ads', 'users', 'categories', 'brands', 'chats', 'verification', 'system'];
    if (!validResources.includes(resource)) {
      throw new AppError(
        400,
        'INVALID_RESOURCE',
        `Invalid resource "${resource}". Allowed: ${validResources.join(', ')}`
      );
    }

    const resourceId = query.resourceId || (resource === 'users' ? userId : (query.adId || 'drafts'));
    const defaultMediaType = resource === 'users' ? 'avatar' : resource === 'categories' ? 'icon' : resource === 'brands' ? 'logo' : resource === 'chats' ? 'attachments' : 'images';
    const mediaType = query.mediaType || defaultMediaType;

    const parts = request.files();
    const stagedUploads: any[] = [];
    let fileCount = 0;

    // Phase 1: Fast multipart ingestion without blocking the incoming network stream
    for await (const part of parts) {
      fileCount++;
      if (fileCount > 8) {
        throw new AppError(400, 'MAX_FILES_EXCEEDED', 'You can upload a maximum of 8 images per request');
      }

      const staged = await MediaService.prepareAndQueueImage(userId, part, baseUrl, {
        resource,
        resourceId,
        mediaType,
      });
      stagedUploads.push(staged);
    }

    if (stagedUploads.length === 0) {
      throw new AppError(400, 'NO_FILES_UPLOADED', 'Please select at least one image file to upload');
    }

    // Pure asynchronous response: worker processes variants concurrently in the background
    const results = stagedUploads.map((item) => ({
      mediaId: item.mediaId,
      status: 'processing',
      originalName: item.originalName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      width: null,
      height: null,
      focalPoint: { x: 0.5, y: 0.5 },
      variants: item.variants,
      url: item.variants.large,
      thumbnailUrl: item.variants.thumbnail,
      displayUrl: resource === 'chats' ? item.variants.large : item.variants.card,
    }));

    return reply.status(201).send({
      success: true,
      data: results,
      count: results.length,
    });
  }

  // Backward-compatible alias
  static readonly uploadImage = MediaController.uploadImages;

  // GET /v1/media/:mediaId - Retrieves media metadata, status, and published variant URLs
  static async getMedia(request: FastifyRequest, reply: FastifyReply) {
    const { mediaId } = mediaIdParamSchema.parse(request.params);
    const data = await MediaService.getMedia(mediaId);

    return reply.status(200).send({
      success: true,
      data,
    });
  }

  // DELETE /v1/media/:mediaId - Deletes an unattached image and removes its files from disk
  static async deleteMedia(request: FastifyRequest, reply: FastifyReply) {
    const { mediaId } = mediaIdParamSchema.parse(request.params);
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
    }

    const isSuperAdmin = request.user?.role === 'SUPER_ADMIN';
    await MediaService.deleteUnattachedMedia(mediaId, userId, isSuperAdmin);

    return reply.status(200).send({
      success: true,
      message: 'Media deleted successfully',
    });
  }
}

