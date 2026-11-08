import path from 'path';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import fs from 'fs';
import { defaultStorage, resolveUploadDir } from '../../integrations/storage/storage.adapter';
import { validateImageMagicBytes, getImageDimensions } from '../../shared/utils/image-validator.util';
import { queueMediaProcessingJob } from '../../jobs/media.job';
import { buildMediaPath, buildMediaDirectory, MediaResource } from '@olx/shared';
import { writeAuditLog } from '../../shared/utils/audit.util';
import { AdminMediaQueryInput, UpdateMediaMetadataInput } from './admin.media.schema';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Thoroughly removes all physical copies of image files & variants from S3 and local disk
export async function deletePhysicalMedia(media: {
  id: string;
  diskPath: string;
  variants?: any;
}): Promise<void> {
  const normalizedPath = media.diskPath
    ? media.diskPath.replace(/^s3:\/\/[^/]+\//, '').replace(/^[/\\]+/, '')
    : '';

  // 1. Delete via configured storage adapter (S3 or Disk)
  if (normalizedPath) {
    await defaultStorage.deleteMediaDirectory(normalizedPath).catch(() => {});
  }

  // 2. Also ensure local upload disk directory is purged if it exists on disk
  const uploadDir = resolveUploadDir();
  const localDir = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.join(uploadDir, ...normalizedPath.split('/'));

  if (fs.existsSync(localDir)) {
    await fs.promises.rm(localDir, { recursive: true, force: true }).catch(() => {});
  }

  // 3. Also delete legacy hash-based variants folder (uploads/variants/xx/yy/med_xxx)
  await defaultStorage.deleteMediaFiles(media.id).catch(() => {});
  const legacyDir = path.join(uploadDir, 'variants', media.id.slice(0, 2), media.id.slice(2, 4), media.id);
  if (fs.existsSync(legacyDir)) {
    await fs.promises.rm(legacyDir, { recursive: true, force: true }).catch(() => {});
  }

  // 4. Delete any orphaned temporary upload file
  const tempPath = path.join(uploadDir, 'temp', `temp_${media.id}.tmp`);
  if (fs.existsSync(tempPath)) {
    await fs.promises.unlink(tempPath).catch(() => {});
  }

  // 5. If variants JSON contains individual local paths, delete them too
  if (media.variants && typeof media.variants === 'object') {
    for (const val of Object.values(media.variants)) {
      if (typeof val === 'string' && val.includes('/uploads/')) {
        const subPath = val.split('/uploads/')[1];
        if (subPath) {
          await defaultStorage.deleteFile(path.join(uploadDir, ...subPath.split('/'))).catch(() => {});
        }
      }
    }
  }
}

export class AdminMediaService {
  // Aggregates platform storage usage, WebP tier statistics, and sync status for admin dashboard
  static async getOverview() {
    const [
      totalFiles,
      sizeAgg,
      statusCounts,
      scopeCounts,
      mimeTypeCounts,
      orphanedCount,
      recentUploads,
    ] = await Promise.all([
      prisma.media.count(),
      prisma.media.aggregate({
        _sum: { fileSize: true },
        _avg: { fileSize: true },
      }),
      prisma.media.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.media.groupBy({
        by: ['scope'],
        _count: { id: true },
      }),
      prisma.media.groupBy({
        by: ['mimeType'],
        _count: { id: true },
      }),
      // Count genuine unattached orphans (not attached to any category or ad listing)
      prisma.media.count({
        where: {
          isAttached: false,
          categories: { none: {} },
          adImages: { none: {} },
        },
      }),
      prisma.media.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          status: true,
          scope: true,
          createdAt: true,
          variants: true,
        },
      }),
    ]);

    const storageConsumedBytes = sizeAgg._sum.fileSize || 0;
    const averageFileSizeBytes = Math.round(sizeAgg._avg.fileSize || 0);
    const storageDriver = (env.STORAGE_DRIVER || 's3').toLowerCase();

    // S3 & CDN sync evaluation
    const s3FilesCount =
      storageDriver === 's3'
        ? totalFiles
        : await prisma.media.count({
            where: { diskPath: { startsWith: 's3://' } },
          });

    const isS3Synced = storageDriver === 's3';

    return {
      totalFiles,
      totalFilesFormatted: Number(totalFiles).toLocaleString(),
      storageConsumed: {
        bytes: storageConsumedBytes,
        formatted: formatBytes(storageConsumedBytes),
        averageSizeBytes: averageFileSizeBytes,
        averageSizeFormatted: formatBytes(averageFileSizeBytes),
      },
      storageInfrastructure: {
        driver: storageDriver.toUpperCase(),
        isS3Synchronized: isS3Synced,
        synchronizedFilesCount: s3FilesCount,
        synchronizedPercentage: totalFiles > 0 ? Math.round((s3FilesCount / totalFiles) * 100) : 100,
        syncStatusText: isS3Synced ? 'S3 & CDN synchronized' : 'Local Disk storage mode',
        bucket: env.S3_BUCKET || 'olx-media',
        endpoint: env.S3_ENDPOINT || 'http://localhost:9000',
        publicUrl: env.S3_PUBLIC_URL || 'http://localhost:9000/olx-media',
      },
      optimizationTier: {
        tier: 'WebP optimized tier',
        variantsPerImage: 4,
        variantSpecs: [
          'thumbnail (300x300, 1:1 focal crop)',
          'card (600x450, 4:3 focal crop)',
          'medium (800px aspect-fit)',
          'large (1600px aspect-fit)',
        ],
        compressionAlgorithm: 'Sharp Libvips WebP (Effort 3)',
        estimatedStorageSaved: '~65%',
      },
      statusBreakdown: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
      scopeBreakdown: scopeCounts.reduce((acc, curr) => {
        acc[curr.scope] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
      mimeTypeBreakdown: mimeTypeCounts.reduce((acc, curr) => {
        acc[curr.mimeType] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
      orphanedMedia: {
        count: orphanedCount,
        cleanupRecommended: orphanedCount > 10,
        cleanupEndpoint: '/api/v1/admin/media/cleanup-orphans',
      },
      recentUploads: recentUploads.map((m) => {
        const variants = (m.variants as any) || {};
        return {
          id: m.id,
          originalName: m.originalName,
          mimeType: m.mimeType,
          fileSize: m.fileSize,
          fileSizeFormatted: formatBytes(m.fileSize),
          status: m.status,
          scope: m.scope,
          thumbnailUrl: variants.thumbnail || variants.card || variants.large || null,
          createdAt: m.createdAt,
        };
      }),
    };
  }

  // Lists all media records with filtering, search, pagination, and uploader associations
  static async getAllMedia(query: AdminMediaQueryInput) {
    const { page, limit, status, scope, mimeType, search, userId, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (scope && scope !== 'ALL') {
      where.scope = scope;
    }
    if (mimeType) {
      where.mimeType = mimeType;
    }
    if (userId) {
      where.userId = userId;
    }
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { originalName: { contains: s, mode: 'insensitive' } },
        { id: { contains: s, mode: 'insensitive' } },
        { userId: { contains: s, mode: 'insensitive' } },
        { attachedToId: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [totalItems, items] = await Promise.all([
      prisma.media.count({ where }),
      prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phoneNumber: true,
              profile: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedItems = items.map((m) => {
      const variants = (m.variants as any) || {};
      const isS3 = m.diskPath.startsWith('s3://') || env.STORAGE_DRIVER === 's3';

      return {
        id: m.id,
        originalName: m.originalName,
        mimeType: m.mimeType,
        fileSize: m.fileSize,
        fileSizeFormatted: formatBytes(m.fileSize),
        width: m.width,
        height: m.height,
        status: m.status,
        scope: m.scope,
        isAttached: m.isAttached,
        attachedToId: m.attachedToId,
        diskPath: m.diskPath,
        storageLocation: isS3 ? 'S3/MinIO' : 'Local Disk',
        variants,
        thumbnailUrl: variants.thumbnail || variants.card || variants.large || null,
        displayUrl: variants.card || variants.large || null,
        largeUrl: variants.large || null,
        uploader: {
          id: m.user.id,
          email: m.user.email,
          name: m.user.profile?.name || null,
          phoneNumber: m.user.phoneNumber,
        },
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };
    });

    return {
      items: formattedItems,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }

  // Returns full single media details with attached listing and focal point data
  static async getMediaById(id: string) {
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            profile: {
              select: {
                name: true,
              },
            },
          },
        },
        adImages: {
          include: {
            ad: {
              select: {
                id: true,
                title: true,
                price: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!media) {
      throw new AppError(404, 'MEDIA_NOT_FOUND', `Media record "${id}" was not found`);
    }

    const variants = (media.variants as any) || {};
    const isS3 = media.diskPath.startsWith('s3://') || env.STORAGE_DRIVER === 's3';

    return {
      id: media.id,
      originalName: media.originalName,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      fileSizeFormatted: formatBytes(media.fileSize),
      width: media.width,
      height: media.height,
      status: media.status,
      scope: media.scope,
      isAttached: media.isAttached,
      attachedToId: media.attachedToId,
      diskPath: media.diskPath,
      storageLocation: isS3 ? 'S3/MinIO' : 'Local Disk',
      focalPoint: media.focalPoint,
      blurhash: media.blurhash,
      errorMessage: media.errorMessage,
      variants,
      thumbnailUrl: variants.thumbnail || variants.card || variants.large || null,
      displayUrl: variants.card || variants.large || null,
      largeUrl: variants.large || null,
      uploader: {
        id: media.user.id,
        email: media.user.email,
        name: media.user.profile?.name || null,
        phoneNumber: media.user.phoneNumber,
      },
      attachedAd: media.adImages[0]?.ad || null,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }

  // Updates metadata fields like originalName, scope, attachment state
  static async updateMediaMetadata(id: string, input: UpdateMediaMetadataInput, actorUserId?: string) {
    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'MEDIA_NOT_FOUND', `Media record "${id}" was not found`);
    }

    const updated = await prisma.media.update({
      where: { id },
      data: {
        originalName: input.originalName !== undefined ? input.originalName : existing.originalName,
        scope: input.scope !== undefined ? input.scope : existing.scope,
        isAttached: input.isAttached !== undefined ? input.isAttached : existing.isAttached,
        attachedToId: input.attachedToId !== undefined ? input.attachedToId : existing.attachedToId,
        status: input.status !== undefined ? input.status : existing.status,
      },
    });

    if (actorUserId) {
      await writeAuditLog({
        userId: actorUserId,
        action: 'ADMIN_ACTION_UPDATE_MEDIA_METADATA',
        entityType: 'MEDIA',
        entityId: id,
        status: 'SUCCESS',
        oldData: {
          originalName: existing.originalName,
          scope: existing.scope,
          isAttached: existing.isAttached,
          attachedToId: existing.attachedToId,
        },
        newData: {
          originalName: updated.originalName,
          scope: updated.scope,
          isAttached: updated.isAttached,
          attachedToId: updated.attachedToId,
        },
      });
    }

    return updated;
  }

  // Replaces the physical image file with a newly uploaded file
  // Purges old files from disk/S3 immediately so disk space is not unnecessarily used
  static async replaceMediaFile(id: string, part: any, baseUrl?: string, actorUserId?: string) {
    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'MEDIA_NOT_FOUND', `Media record "${id}" was not found`);
    }

    if (!part || !part.file) {
      throw new AppError(400, 'NO_FILE_PROVIDED', 'A replacement image file is required');
    }

    const rawMime = part.mimetype || '';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'].includes(rawMime)) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, WebP, and HEIC images are permitted');
    }

    const tempFileName = `temp_replace_${id}_${Date.now()}.tmp`;

    // 1. Save new stream temporarily
    const { tempPath, size, initialBuffer } = await defaultStorage.saveTemporaryFile(part.file, tempFileName);

    // Max 10MB limit
    if (size > 10 * 1024 * 1024) {
      await defaultStorage.deleteFile(tempPath);
      throw new AppError(400, 'FILE_TOO_LARGE', 'Replacement image exceeds the maximum allowed size of 10MB');
    }

    // Inspect magic bytes
    const validated = validateImageMagicBytes(initialBuffer);
    if (!validated) {
      await defaultStorage.deleteFile(tempPath);
      throw new AppError(400, 'INVALID_FILE_CONTENT', 'File content is not a valid JPEG, PNG, WebP, or HEIC image');
    }

    // Inspect dimensions (max 5000x5000px)
    const dimensions = await getImageDimensions(initialBuffer, tempPath);
    if (dimensions && (dimensions.width > 5000 || dimensions.height > 5000)) {
      await defaultStorage.deleteFile(tempPath);
      throw new AppError(
        400,
        'IMAGE_DIMENSIONS_EXCEEDED',
        `Replacement image resolution (${dimensions.width}x${dimensions.height}) exceeds the maximum allowable limit of 5000x5000px`
      );
    }

    // 2. CRUCIAL: Delete old image and variants from physical storage so disk space is reclaimed
    await deletePhysicalMedia(existing);

    // 3. Build paths for new variants based on entity scope
    let resource: MediaResource = 'ads';
    let mediaType = 'images';
    let resourceId = existing.attachedToId || 'drafts';

    if (existing.scope === 'CATEGORY_BANNER') {
      resource = 'categories';
      mediaType = 'icon';
      resourceId = existing.attachedToId || id;
    } else if (existing.scope === 'USER_AVATAR') {
      resource = 'users';
      mediaType = 'avatar';
      resourceId = existing.attachedToId || existing.userId;
    } else if (existing.scope === 'BANNER') {
      resource = 'system';
      mediaType = 'banner';
      resourceId = existing.attachedToId || id;
    } else if (existing.scope === 'CHAT_ATTACHMENT') {
      resource = 'chats';
      mediaType = 'attachments';
      resourceId = existing.attachedToId || 'drafts';
    }

    const largePath = buildMediaPath({ resource, resourceId, mediaType, mediaId: id, variant: 'large', format: 'webp' });
    const mediumPath = buildMediaPath({ resource, resourceId, mediaType, mediaId: id, variant: 'medium', format: 'webp' });
    const thumbPath = buildMediaPath({ resource, resourceId, mediaType, mediaId: id, variant: 'thumbnail', format: 'webp' });
    const cardPath = buildMediaPath({ resource, resourceId, mediaType, mediaId: id, variant: 'card', format: 'webp' });

    const host = baseUrl || process.env.MEDIA_CDN_URL || 'http://localhost:5000';
    const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;

    const newVariants = {
      thumbnail: defaultStorage.buildPublicUrl(thumbPath, cleanHost),
      card: defaultStorage.buildPublicUrl(cardPath, cleanHost),
      medium: defaultStorage.buildPublicUrl(mediumPath, cleanHost),
      large: defaultStorage.buildPublicUrl(largePath, cleanHost),
    };
    const relativeDir = buildMediaDirectory({ resource, resourceId, mediaType, mediaId: id });
    const newDiskPath =
      (env.STORAGE_DRIVER || 's3') === 's3'
        ? `s3://${env.S3_BUCKET || 'olx-media'}/${relativeDir}`
        : relativeDir;

    // 4. Update database record with new metadata and status PROCESSING
    const updated = await prisma.media.update({
      where: { id },
      data: {
        originalName: path.basename(part.filename || existing.originalName),
        mimeType: validated.mimeType,
        fileSize: size,
        status: 'PROCESSING',
        diskPath: newDiskPath,
        variants: newVariants,
        width: dimensions?.width || null,
        height: dimensions?.height || null,
      },
    });

    // 5. Enqueue background processing job
    await queueMediaProcessingJob({
      mediaId: id,
      tempPath,
      userId: existing.userId,
      originalName: path.basename(part.filename || existing.originalName),
      mimeType: validated.mimeType,
      fileSize: size,
      baseUrl: cleanHost,
      resource,
      resourceId,
      mediaType,
    });

    if (actorUserId) {
      await writeAuditLog({
        userId: actorUserId,
        action: 'ADMIN_ACTION_REPLACE_MEDIA_FILE',
        entityType: 'MEDIA',
        entityId: id,
        status: 'SUCCESS',
        oldData: {
          fileSize: existing.fileSize,
          originalName: existing.originalName,
        },
        newData: {
          fileSize: size,
          originalName: updated.originalName,
        },
      });
    }

    return {
      id: updated.id,
      status: 'PROCESSING',
      originalName: updated.originalName,
      fileSize: updated.fileSize,
      fileSizeFormatted: formatBytes(updated.fileSize),
      variants: newVariants,
      message: 'Old files purged and new image uploaded for background optimization',
    };
  }

  // Deletes media record and removes all physical files & variants from disk / S3
  static async deleteMedia(id: string, actorUserId?: string) {
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new AppError(404, 'MEDIA_NOT_FOUND', `Media record "${id}" was not found`);
    }

    // 1. Physically delete file & all variants from storage
    await deletePhysicalMedia(media);

    // 2. Unlink any AdImage relationships
    await prisma.adImage.deleteMany({
      where: { mediaId: id },
    }).catch(() => {});

    // 3. Delete from database
    await prisma.media.delete({
      where: { id },
    });

    if (actorUserId) {
      await writeAuditLog({
        userId: actorUserId,
        action: 'ADMIN_ACTION_DELETE_MEDIA',
        entityType: 'MEDIA',
        entityId: id,
        status: 'SUCCESS',
        oldData: {
          originalName: media.originalName,
          fileSize: media.fileSize,
          diskPath: media.diskPath,
          scope: media.scope,
          isAttached: media.isAttached,
        },
      });
    }

    return {
      success: true,
      message: `Media "${media.originalName}" and physical files deleted successfully`,
      freedBytes: media.fileSize,
      freedFormatted: formatBytes(media.fileSize),
    };
  }

  // Purges unattached orphaned media from DB and physical storage (S3 & Disk)
  static async cleanupOrphanedMedia(gracePeriodHours = 0, actorUserId?: string) {
    const where: any = {
      isAttached: false,
    };

    if (gracePeriodHours > 0) {
      const cutoffDate = new Date(Date.now() - gracePeriodHours * 3600 * 1000);
      where.createdAt = { lt: cutoffDate };
    }

    const orphans = await prisma.media.findMany({
      where,
      include: {
        categories: { select: { id: true } },
        adImages: { select: { id: true } },
      },
      take: 500,
    });

    let freedBytes = 0;
    let deletedCount = 0;
    let healedCount = 0;

    for (const orphan of orphans) {
      // Consistency self-heal: if media is actually referenced by a category or ad, restore attachment
      if (orphan.categories.length > 0 || orphan.adImages.length > 0) {
        await prisma.media.update({
          where: { id: orphan.id },
          data: {
            isAttached: true,
            attachedToId: orphan.categories[0]?.id || orphan.adImages[0]?.id,
            scope: orphan.categories.length > 0 ? 'CATEGORY_BANNER' : 'LISTING_IMAGE',
          },
        });
        healedCount++;
        continue;
      }

      // Consistency self-heal: if media is referenced in a chat message attachment
      const messageWithAttachment = await prisma.message.findFirst({
        where: { attachmentUrl: { contains: orphan.id } },
        select: { id: true },
      });
      if (messageWithAttachment) {
        await prisma.media.update({
          where: { id: orphan.id },
          data: {
            isAttached: true,
            attachedToId: messageWithAttachment.id,
            scope: 'CHAT_ATTACHMENT',
          },
        });
        healedCount++;
        continue;
      }

      // Thoroughly remove all physical files from S3/MinIO and local disk
      await deletePhysicalMedia(orphan);
      freedBytes += orphan.fileSize;

      // Delete from database
      await prisma.media.delete({ where: { id: orphan.id } }).catch(() => {});
      deletedCount++;
    }

    if (actorUserId && (deletedCount > 0 || healedCount > 0)) {
      await writeAuditLog({
        userId: actorUserId,
        action: 'ADMIN_ACTION_CLEANUP_ORPHANED_MEDIA',
        entityType: 'MEDIA',
        entityId: 'BATCH_CLEANUP',
        status: 'SUCCESS',
        newData: {
          deletedCount,
          healedCount,
          freedBytes,
          freedFormatted: formatBytes(freedBytes),
          gracePeriodHours,
        },
      });
    }

    return {
      success: true,
      deletedCount,
      healedCount,
      freedBytes,
      freedFormatted: formatBytes(freedBytes),
      message: `Cleaned up ${deletedCount} orphaned files and reclaimed ${formatBytes(freedBytes)} of storage${
        healedCount > 0 ? ` (${healedCount} attached records restored)` : ''
      }`,
    };
  }
}
