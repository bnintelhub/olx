import crypto from 'crypto';
import path from 'path';
import { buildMediaPath, buildMediaDirectory, MediaResource } from '@olx/shared';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { defaultStorage } from '../../integrations/storage/storage.adapter';
import { validateImageMagicBytes, getImageDimensions } from '../../shared/utils/image-validator.util';
import { queueMediaProcessingJob } from '../../jobs/media.job';

export class MediaService {
  // Generates a strict, collision-free, server-controlled Media ID
  private static generateMediaId(): string {
    const timestamp = Date.now().toString(36);
    const randomHex = crypto.randomBytes(6).toString('hex');
    return `med_${timestamp}${randomHex}`;
  }

  // Prepares file, saves stream, creates DB record, and queues BullMQ job immediately (non-blocking)
  static async prepareAndQueueImage(
    userId: string,
    part: any,
    baseUrl?: string,
    context?: {
      resource?: MediaResource;
      resourceId?: string;
      mediaType?: string;
    }
  ) {
    if (!part || !part.file) {
      throw new AppError(400, 'NO_FILE_PROVIDED', 'An image file is required');
    }

    const rawMime = part.mimetype || '';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'].includes(rawMime)) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, WebP, and HEIC images are permitted');
    }

    const mediaId = this.generateMediaId();
    const tempFileName = `temp_${mediaId}.tmp`;

    // Save temporary stream while capturing the first bytes for content validation
    const { tempPath, size, initialBuffer } = await defaultStorage.saveTemporaryFile(
      part.file,
      tempFileName
    );

    // Max 10MB limit per image
    if (size > 10 * 1024 * 1024) {
      await defaultStorage.deleteFile(tempPath);
      throw new AppError(
        400,
        'FILE_TOO_LARGE',
        `Image "${part.filename || 'file'}" exceeds the maximum allowed size of 10MB`
      );
    }

    // Inspect actual magic bytes to reject spoofed files
    const validated = validateImageMagicBytes(initialBuffer);
    if (!validated) {
      await defaultStorage.deleteFile(tempPath);
      throw new AppError(400, 'INVALID_FILE_CONTENT', 'File content is not a valid JPEG, PNG, WebP, or HEIC image');
    }

    // Inspect image dimensions: reject resolutions exceeding 5000x5000px with HTTP 400
    const dimensions = await getImageDimensions(initialBuffer, tempPath);
    if (dimensions) {
      const { width, height } = dimensions;
      if (width > 5000 || height > 5000) {
        await defaultStorage.deleteFile(tempPath);
        throw new AppError(
          400,
          'IMAGE_DIMENSIONS_EXCEEDED',
          `Image "${part.filename || 'file'}" resolution (${width}x${height}) exceeds the maximum allowable limit of 5000x5000px.`
        );
      }
    }

    // Human-readable, domain-driven storage paths (e.g. ads/{adId}/images/{mediaId}/large.webp)
    const resource: MediaResource = context?.resource || 'ads';
    const resourceId = context?.resourceId || 'drafts';
    const mediaType = context?.mediaType || 'images';

    const largePath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'large', format: 'webp' });
    const mediumPath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'medium', format: 'webp' });
    const thumbnailPath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'thumbnail', format: 'webp' });
    const cardPath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'card', format: 'webp' });

    const host = baseUrl || process.env.MEDIA_CDN_URL || 'http://localhost:5000';
    const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;

    const variants = {
      thumbnail: defaultStorage.buildPublicUrl(thumbnailPath, cleanHost),
      card: defaultStorage.buildPublicUrl(cardPath, cleanHost),
      medium: defaultStorage.buildPublicUrl(mediumPath, cleanHost),
      large: defaultStorage.buildPublicUrl(largePath, cleanHost),
    };
    const diskPath = buildMediaDirectory({ resource, resourceId, mediaType, mediaId });

    // Create database record with initial PROCESSING status
    await prisma.media.create({
      data: {
        id: mediaId,
        userId,
        type: 'IMAGE',
        status: 'PROCESSING',
        scope: 'UNATTACHED',
        originalName: path.basename(part.filename || 'image.jpg'),
        mimeType: validated.mimeType,
        fileSize: size,
        diskPath,
        variants,
      },
    });

    // Add job to BullMQ queue without blocking
    const job = await queueMediaProcessingJob({
      mediaId,
      tempPath,
      userId,
      originalName: path.basename(part.filename || 'image.jpg'),
      mimeType: validated.mimeType,
      fileSize: size,
      baseUrl: cleanHost,
      resource,
      resourceId,
      mediaType,
    });

    return {
      mediaId,
      job,
      originalName: path.basename(part.filename || 'image.jpg'),
      mimeType: validated.mimeType,
      fileSize: size,
      variants,
    };
  }

  // Uploads single image, persists temporary file, and queues job asynchronously (non-blocking)
  static async uploadImage(
    userId: string,
    part: any,
    baseUrl?: string,
    context?: {
      resource?: MediaResource;
      resourceId?: string;
      mediaType?: string;
    }
  ) {
    const staged = await this.prepareAndQueueImage(userId, part, baseUrl, context);

    return {
      mediaId: staged.mediaId,
      status: 'processing',
      originalName: staged.originalName,
      mimeType: staged.mimeType,
      fileSize: staged.fileSize,
      width: null,
      height: null,
      focalPoint: { x: 0.5, y: 0.5 },
      variants: staged.variants,
      url: staged.variants.large,
      thumbnailUrl: staged.variants.thumbnail,
      displayUrl: staged.variants.card,
    };
  }

  // Retrieves media metadata by ID
  static async getMedia(mediaId: string) {
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new AppError(404, 'MEDIA_NOT_FOUND', 'Media file not found');
    }

    return {
      mediaId: media.id,
      userId: media.userId,
      status: media.status.toLowerCase(),
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      width: media.width,
      height: media.height,
      focalPoint: media.focalPoint,
      variants: media.variants,
      isAttached: media.isAttached,
      attachedToId: media.attachedToId,
      createdAt: media.createdAt,
    };
  }

  // Deletes an unattached image and removes its variants from disk
  static async deleteUnattachedMedia(mediaId: string, userId: string, isSuperAdmin: boolean = false) {
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new AppError(404, 'MEDIA_NOT_FOUND', 'Media file not found');
    }

    if (media.userId !== userId && !isSuperAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this media');
    }

    if (media.isAttached) {
      throw new AppError(
        400,
        'MEDIA_ATTACHED',
        'Cannot delete media currently attached to a listing. Remove it from the listing first.'
      );
    }

    // Delete variants folder on disk
    await defaultStorage.deleteMediaFiles(mediaId);

    // Delete record from database
    await prisma.media.delete({
      where: { id: mediaId },
    });

    return { success: true };
  }

  // Background routine: deletes unattached orphan media files older than grace period
  static async cleanupOrphans(gracePeriodHours = 24) {
    const cutoffDate = new Date(Date.now() - gracePeriodHours * 3600 * 1000);

    const orphans = await prisma.media.findMany({
      where: {
        isAttached: false,
        categories: { none: {} },
        adImages: { none: {} },
        createdAt: { lt: cutoffDate },
      },
      take: 100,
    });

    for (const orphan of orphans) {
      const { deletePhysicalMedia } = await import('../admin/admin.media.service');
      await deletePhysicalMedia(orphan);
      await prisma.media.delete({ where: { id: orphan.id } }).catch(() => {});
    }

    return orphans.length;
  }
}

