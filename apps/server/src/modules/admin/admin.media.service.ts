import path from 'path';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import fs from 'fs';
import { defaultStorage, resolveUploadDir } from '../../integrations/storage/storage.adapter';
import { validateImageMagicBytes, getImageDimensions } from '../../shared/utils/image-validator.util';
import { queueMediaProcessingJob } from '../../jobs/media.job';
import { buildMediaPath, buildMediaDirectory, MediaResource } from '@olx/shared';
import {
  toPublicMediaVariants,
  toPublicMediaUrl,
  normalizeMediaVariants,
} from '../../shared/utils/media-url.util';
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
  diskPath?: string;
  storageKey?: string;
  variants?: any;
}): Promise<void> {
  const rawPath = media.diskPath || media.storageKey || '';
  const normalizedPath = rawPath
    ? rawPath.replace(/^s3:\/\/[^/]+\//, '').replace(/^[/\\]+/, '')
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
      prisma.mediaAsset.count(),
      prisma.mediaAsset.aggregate({
        _sum: { sizeBytes: true },
        _avg: { sizeBytes: true },
      }),
      prisma.mediaAsset.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.mediaAsset.groupBy({
        by: ['entityType'],
        _count: { id: true },
        _sum: { sizeBytes: true },
      }),
      prisma.mediaAsset.groupBy({
        by: ['mimeType'],
        _count: { id: true },
      }),
      // Count genuine unattached orphans (not attached to any category, ad listing, banner, or chat message)
      prisma.mediaAsset.count({
        where: {
          categories: { none: {} },
          adImages: { none: {} },
          banners: { none: {} },
          messages: { none: {} },
          NOT: {
            entityType: 'CHAT',
            entityId: { not: null },
          },
        },
      }),
      prisma.mediaAsset.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          status: true,
          entityType: true,
          createdAt: true,
          variants: true,
        },
      }),
    ]);

    const storageConsumedBytes = Number(sizeAgg._sum.sizeBytes || 0);
    const averageFileSizeBytes = Math.round(Number(sizeAgg._avg.sizeBytes || 0));

    // Scope-level disk consumption breakdown for storage graphs
    const scopeLabels: Record<string, { label: string; color: string }> = {
      LISTING: { label: 'Ad Listings', color: '#3b82f6' },
      USER: { label: 'User Avatars', color: '#10b981' },
      CATEGORY: { label: 'Categories', color: '#f59e0b' },
      BANNER: { label: 'Banners', color: '#8b5cf6' },
      CHAT: { label: 'Chat Attachments', color: '#ec4899' },
      UNATTACHED: { label: 'Unattached / Temp', color: '#64748b' },
    };

    const diskBreakdown = scopeCounts.map((item) => {
      const bytes = Number(item._sum.sizeBytes || 0);
      const count = item._count.id;
      const meta = scopeLabels[item.entityType] || { label: item.entityType, color: '#6b7280' };
      return {
        scope: item.entityType,
        name: meta.label,
        count,
        bytes,
        formatted: formatBytes(bytes),
        color: meta.color,
        percentage: storageConsumedBytes > 0 ? Math.round((bytes / storageConsumedBytes) * 100) : 0,
      };
    });

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
        driver: 'LOCAL_DISK',
        isLocalDisk: true,
        storageRoot: process.env.MEDIA_ROOT || '/data/olx-media',
        volumeName: 'media_data',
        mountPath: '/data/olx-media',
        syncStatusText: 'Local Persistent Volume (/data/olx-media)',
        isHealthy: true,
        publicUrl: process.env.MEDIA_PUBLIC_BASE_URL || 'http://localhost/media',
      },
      diskBreakdown,
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
        acc[curr.entityType] = curr._count.id;
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
          fileSize: Number(m.sizeBytes),
          fileSizeFormatted: formatBytes(Number(m.sizeBytes)),
          status: m.status,
          scope: m.entityType,
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
      if ((scope as string) === 'UNATTACHED') {
        where.entityId = null;
      } else {
        where.entityType = scope;
      }
    }
    if (mimeType) {
      where.mimeType = mimeType;
    }
    if (userId) {
      where.ownerId = userId;
    }
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { originalName: { contains: s, mode: 'insensitive' } },
        { id: { contains: s, mode: 'insensitive' } },
        { ownerId: { contains: s, mode: 'insensitive' } },
        { entityId: { contains: s, mode: 'insensitive' } },
      ];
    }

    const sortField = (sortBy as string) === 'fileSize' ? 'sizeBytes' : sortBy;

    const [totalItems, items] = await Promise.all([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortOrder },
        include: {
          owner: {
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
      const publicVariants = toPublicMediaVariants(m.variants);

      return {
        id: m.id,
        originalName: m.originalName,
        mimeType: m.mimeType,
        fileSize: Number(m.sizeBytes),
        fileSizeFormatted: formatBytes(Number(m.sizeBytes)),
        width: m.width,
        height: m.height,
        status: m.status,
        scope: m.entityType,
        isAttached: Boolean(m.entityId),
        attachedToId: m.entityId,
        diskPath: m.storageKey,
        storageLocation: 'Local Disk',
        variants: publicVariants,
        thumbnailUrl: publicVariants.thumbnail || publicVariants.card || publicVariants.large || null,
        displayUrl: publicVariants.card || publicVariants.large || null,
        largeUrl: publicVariants.large || null,
        uploader: {
          id: m.owner.id,
          email: m.owner.email,
          name: m.owner.profile?.name || null,
          phoneNumber: m.owner.phoneNumber,
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
    const media = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        owner: {
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

    const publicVariants = toPublicMediaVariants(media.variants);

    return {
      id: media.id,
      originalName: media.originalName,
      mimeType: media.mimeType,
      fileSize: Number(media.sizeBytes),
      fileSizeFormatted: formatBytes(Number(media.sizeBytes)),
      width: media.width,
      height: media.height,
      status: media.status,
      scope: media.entityType,
      isAttached: Boolean(media.entityId),
      attachedToId: media.entityId,
      diskPath: media.storageKey,
      storageLocation: 'Local Disk',
      focalPoint: (media.metadata as any)?.focalPoint || { x: 0.5, y: 0.5 },
      blurhash: null,
      errorMessage: media.failureReason,
      variants: publicVariants,
      thumbnailUrl: publicVariants.thumbnail || publicVariants.card || publicVariants.large || null,
      displayUrl: publicVariants.card || publicVariants.large || null,
      largeUrl: publicVariants.large || null,
      uploader: {
        id: media.owner.id,
        email: media.owner.email,
        name: media.owner.profile?.name || null,
        phoneNumber: media.owner.phoneNumber,
      },
      attachedAd: media.adImages[0]?.ad || null,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }

  // Updates metadata fields like originalName, scope, attachment state
  static async updateMediaMetadata(id: string, input: UpdateMediaMetadataInput, actorUserId?: string) {
    const existing = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'MEDIA_NOT_FOUND', `Media record "${id}" was not found`);
    }

    const updated = await prisma.mediaAsset.update({
      where: { id },
      data: {
        originalName: input.originalName !== undefined ? input.originalName : existing.originalName,
        entityType: input.scope !== undefined ? input.scope : existing.entityType,
        entityId: input.attachedToId !== undefined ? input.attachedToId : existing.entityId,
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
          scope: existing.entityType,
          attachedToId: existing.entityId,
        },
        newData: {
          originalName: updated.originalName,
          scope: updated.entityType,
          attachedToId: updated.entityId,
        },
      });
    }

    return updated;
  }

  // Replaces the physical image file with a newly uploaded file
  // Purges old files from disk/S3 immediately so disk space is not unnecessarily used
  static async replaceMediaFile(id: string, part: any, baseUrl?: string, actorUserId?: string) {
    const existing = await prisma.mediaAsset.findUnique({ where: { id } });
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
    let resourceId = existing.entityId || 'drafts';

    if (existing.entityType === 'CATEGORY') {
      resource = 'categories';
      mediaType = 'icon';
      resourceId = existing.entityId || id;
    } else if (existing.entityType === 'USER') {
      resource = 'users';
      mediaType = 'avatar';
      resourceId = existing.entityId || existing.ownerId;
    } else if (existing.entityType === 'BANNER') {
      resource = 'system';
      mediaType = 'banner';
      resourceId = existing.entityId || id;
    } else if (existing.entityType === 'CHAT') {
      resource = 'chats';
      mediaType = 'attachments';
      resourceId = existing.entityId || 'drafts';
    }

    const largePath = buildMediaPath({ resource, resourceId, mediaType, mediaId: id, variant: 'large', format: 'webp' });
    const mediumPath = buildMediaPath({ resource, resourceId, mediaType, mediaId: id, variant: 'medium', format: 'webp' });
    const thumbPath = buildMediaPath({ resource, resourceId, mediaType, mediaId: id, variant: 'thumbnail', format: 'webp' });
    const cardPath = buildMediaPath({ resource, resourceId, mediaType, mediaId: id, variant: 'card', format: 'webp' });

    const relativeVariants = {
      thumbnail: thumbPath,
      card: cardPath,
      medium: mediumPath,
      large: largePath,
    };
    const relativeDir = buildMediaDirectory({ resource, resourceId, mediaType, mediaId: id });
    const newDiskPath = relativeDir;

    const host = baseUrl || process.env.MEDIA_CDN_URL || 'http://localhost:5000';
    const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;

    // 4. Update database record with clean relative paths and status PROCESSING
    const updated = await prisma.mediaAsset.update({
      where: { id },
      data: {
        originalName: path.basename(part.filename || existing.originalName),
        mimeType: validated.mimeType,
        sizeBytes: BigInt(size),
        status: 'PROCESSING',
        storageKey: relativeVariants.large || `images/${id}/original.webp`,
        variants: relativeVariants,
        width: dimensions?.width || null,
        height: dimensions?.height || null,
      },
    });

    // 5. Enqueue background processing job
    await queueMediaProcessingJob({
      mediaId: id,
      tempPath,
      userId: existing.ownerId,
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
          fileSize: Number(existing.sizeBytes),
          originalName: existing.originalName,
        },
        newData: {
          fileSize: size,
          originalName: updated.originalName,
        },
      });
    }

    const publicVariants = toPublicMediaVariants(relativeVariants, cleanHost);

    return {
      id: updated.id,
      status: 'PROCESSING',
      originalName: updated.originalName,
      fileSize: Number(updated.sizeBytes),
      fileSizeFormatted: formatBytes(Number(updated.sizeBytes)),
      variants: publicVariants,
      message: 'Old files purged and new image uploaded for background optimization',
    };
  }

  // Deletes media record and removes all physical files & variants from disk / S3
  static async deleteMedia(id: string, actorUserId?: string) {
    const media = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!media) {
      throw new AppError(404, 'MEDIA_NOT_FOUND', `Media record "${id}" was not found`);
    }

    // 1. Physically delete file & all variants from storage
    await deletePhysicalMedia(media);

    // 2. Unlink any AdImage relationships
    await prisma.adImage.deleteMany({
      where: { mediaAssetId: id },
    }).catch(() => {});

    // 3. Delete from database
    await prisma.mediaAsset.delete({
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
          fileSize: Number(media.sizeBytes),
          storageKey: media.storageKey,
          entityType: media.entityType,
        },
      });
    }

    return {
      success: true,
      message: `Media "${media.originalName}" and physical files deleted successfully`,
      freedBytes: Number(media.sizeBytes),
      freedFormatted: formatBytes(Number(media.sizeBytes)),
    };
  }

  // Purges unattached orphaned media from DB and physical storage (S3 & Disk)
  static async cleanupOrphanedMedia(gracePeriodHours = 0, actorUserId?: string) {
    const where: any = {
      categories: { none: {} },
      adImages: { none: {} },
      banners: { none: {} },
      messages: { none: {} },
      NOT: {
        entityType: 'CHAT',
        entityId: { not: null },
      },
    };

    if (gracePeriodHours > 0) {
      const cutoffDate = new Date(Date.now() - gracePeriodHours * 3600 * 1000);
      where.createdAt = { lt: cutoffDate };
    }

    const orphans = await prisma.mediaAsset.findMany({
      where,
      take: 500,
    });

    let freedBytes = 0;
    let deletedCount = 0;

    for (const orphan of orphans) {
      // Thoroughly remove all physical files from storage
      await deletePhysicalMedia(orphan);
      freedBytes += Number(orphan.sizeBytes);

      // Delete from database
      await prisma.mediaAsset.delete({ where: { id: orphan.id } }).catch(() => {});
      deletedCount++;
    }

    if (actorUserId && deletedCount > 0) {
      await writeAuditLog({
        userId: actorUserId,
        action: 'ADMIN_ACTION_CLEANUP_ORPHANED_MEDIA',
        entityType: 'MEDIA',
        entityId: 'BATCH_CLEANUP',
        status: 'SUCCESS',
        newData: {
          deletedCount,
          freedBytes,
          freedFormatted: formatBytes(freedBytes),
          gracePeriodHours,
        },
      });
    }

    return {
      success: true,
      deletedCount,
      healedCount: 0,
      freedBytes,
      freedFormatted: formatBytes(freedBytes),
      message: `Cleaned up ${deletedCount} orphaned files and reclaimed ${formatBytes(freedBytes)} of storage`,
    };
  }
}
