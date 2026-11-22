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
  cleanStorageKey,
  isExternalUrl,
} from '../../shared/utils/media-url.util';
import { writeAuditLog } from '../../shared/utils/audit.util';
import { AdminMediaQueryInput, UpdateMediaMetadataInput } from './admin.media.schema';

function getMimeTypeFromExt(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function getFilesRecursively(dir: string, baseDir: string = dir): Array<{ fullPath: string; relativePath: string; sizeBytes: number; modifiedAt: Date; folder: string }> {
  const results: Array<{ fullPath: string; relativePath: string; sizeBytes: number; modifiedAt: Date; folder: string }> = [];
  if (!fs.existsSync(dir)) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getFilesRecursively(fullPath, baseDir));
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
          const folder = relativePath.includes('/') ? relativePath.split('/')[0] : 'root';
          results.push({
            fullPath,
            relativePath,
            sizeBytes: stat.size,
            modifiedAt: stat.mtime,
            folder,
          });
        } catch {
          // Ignore transient stat errors
        }
      }
    }
  } catch {
    // Ignore directory readdir errors
  }
  return results;
}

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
  private static isSyncingBanners = false;

  // Aggregates platform storage usage, WebP tier statistics, and sync status for admin dashboard
  static async getOverview() {
    const [
      totalFiles,
      sizeAgg,
      statusCounts,
      scopeCounts,
      mimeTypeCounts,
      unattachedOrphanCount,
      zeroByteCount,
      failedCount,
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
      // Count 0-byte corrupt assets (not true image files)
      prisma.mediaAsset.count({
        where: {
          sizeBytes: { lte: 0 },
        },
      }),
      // Count permanently failed assets from worker errors
      prisma.mediaAsset.count({
        where: {
          status: 'FAILED',
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
      USER: { label: 'User Profiles', color: '#10b981' },
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

    // Automatically synchronize banner assets from persistent disk
    await this.syncBannerMediaAssets().catch(() => {});

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
        tier: 'Single Source of Truth (100% Quality WebP)',
        variantsPerImage: 1,
        variantSpecs: ['1x WebP Master (Quality 100)'],
        compressionAlgorithm: 'Sharp Libvips (WebP 100Q)',
        estimatedStorageSaved: 'Zero Multi-Tier Overhead',
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
        count: unattachedOrphanCount + zeroByteCount + failedCount,
        unattachedCount: unattachedOrphanCount,
        zeroByteCount,
        failedCount,
        cleanupRecommended: unattachedOrphanCount + zeroByteCount + failedCount > 0,
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
          scope: m.entityType === 'USER' ? 'PROFILE' : m.entityType,
          thumbnailUrl: variants.thumbnail || variants.card || variants.large || null,
          createdAt: m.createdAt,
        };
      }),
    };
  }

  // Lists all media records with filtering, search, pagination, and uploader associations
  static async getAllMedia(query: AdminMediaQueryInput) {
    const { page, limit, status, scope, mimeType, search, userId, sortBy, sortOrder } = query;

    // Automatically synchronize banner assets from persistent disk if querying banners or all
    if (scope === 'BANNER' || scope === 'ALL' || !scope) {
      await this.syncBannerMediaAssets().catch(() => {});
    }

    // Auto-heal any media asset that is actively used as a user profile avatar
    try {
      const activeAvatars = await prisma.profile.findMany({
        where: { avatarUrl: { not: null } },
        select: { userId: true, avatarUrl: true },
      });
      for (const p of activeAvatars) {
        if (!p.avatarUrl) continue;
        const match = p.avatarUrl.match(/med_[a-zA-Z0-9]+/);
        if (match) {
          await prisma.mediaAsset.updateMany({
            where: {
              OR: [
                { id: match[0] },
                { storageKey: { contains: match[0] } },
              ],
              entityType: 'LISTING',
            },
            data: {
              entityType: 'USER',
              entityId: p.userId,
            },
          });
        }
      }
    } catch {}

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (scope && scope !== 'ALL') {
      if ((scope as string) === 'UNATTACHED') {
        where.entityId = null;
      } else {
        const targetScope = (scope as string) === 'PROFILE' ? 'USER' : scope;
        where.entityType = targetScope;
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
      const isZeroByte = Number(m.sizeBytes) <= 0;
      const effectiveStatus = isZeroByte && m.status === 'READY' ? 'FAILED' : m.status;
      const effectiveFailureReason = isZeroByte
        ? 'File is 0 bytes (corrupt or empty image)'
        : m.failureReason;

      const singleUrl = publicVariants.url || publicVariants.image || (m.storageKey ? toPublicMediaUrl(m.storageKey) : null);
      return {
        id: m.id,
        originalName: m.originalName,
        mimeType: m.mimeType,
        fileSize: Number(m.sizeBytes),
        fileSizeFormatted: formatBytes(Number(m.sizeBytes)),
        width: m.width,
        height: m.height,
        status: effectiveStatus,
        isZeroByte,
        failureReason: effectiveFailureReason,
        scope: m.entityType === 'USER' ? 'PROFILE' : m.entityType,
        isAttached: Boolean(m.entityId),
        attachedToId: m.entityId,
        diskPath: m.storageKey,
        storageLocation: 'Local Disk',
        url: singleUrl,
        variants: { url: singleUrl },
        thumbnailUrl: singleUrl,
        displayUrl: singleUrl,
        largeUrl: singleUrl,
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

    const singleUrl = publicVariants.url || publicVariants.image || (media.storageKey ? toPublicMediaUrl(media.storageKey) : null);

    return {
      id: media.id,
      originalName: media.originalName,
      mimeType: media.mimeType,
      fileSize: Number(media.sizeBytes),
      fileSizeFormatted: formatBytes(Number(media.sizeBytes)),
      width: media.width,
      height: media.height,
      status: media.status,
      scope: media.entityType === 'USER' ? 'PROFILE' : media.entityType,
      isAttached: Boolean(media.entityId),
      attachedToId: media.entityId,
      diskPath: media.storageKey,
      storageLocation: 'Local Disk',
      focalPoint: (media.metadata as any)?.focalPoint || { x: 0.5, y: 0.5 },
      blurhash: null,
      errorMessage: media.failureReason,
      url: singleUrl,
      variants: { url: singleUrl },
      thumbnailUrl: singleUrl,
      displayUrl: singleUrl,
      largeUrl: singleUrl,
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

    const targetEntityType = (input.scope as string) === 'PROFILE' ? 'USER' : input.scope;
    const updated = await prisma.mediaAsset.update({
      where: { id },
      data: {
        originalName: input.originalName !== undefined ? input.originalName : existing.originalName,
        entityType: targetEntityType !== undefined ? targetEntityType : existing.entityType,
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

    // Reject 0-byte or empty files immediately (0-byte files are not true image files)
    if (size <= 0 || !initialBuffer || initialBuffer.length === 0) {
      await defaultStorage.deleteFile(tempPath);
      throw new AppError(400, 'EMPTY_FILE', 'Replacement file is empty (0 bytes). True image files must contain valid data.');
    }

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

    const imagePath = buildMediaPath({ resource, resourceId, mediaType, mediaId: id, variant: 'image', format: 'webp' });

    const relativeVariants = {
      url: imagePath,
      image: imagePath,
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
        storageKey: imagePath,
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

  // Comprehensive Orphan & Corrupt Media Eviction:
  // - Evicts 0-byte or empty fake image assets (unlinks relations and removes DB entries)
  // - Evicts failed worker assets (images where worker processing errored or exceeded max retries)
  // - Reconciles and evicts abandoned in-flight processing assets older than 15 minutes
  // - Purges unattached orphaned media from DB and physical storage (S3 & Disk)
  static async cleanupOrphanedMedia(gracePeriodHours = 0, actorUserId?: string) {
    const uploadDir = resolveUploadDir();
    let freedBytes = 0;
    let deletedCount = 0;
    let zeroByteCount = 0;
    let failedCount = 0;
    let unattachedCount = 0;

    // 1. Evict 0-byte corrupt assets (not true image files)
    const zeroByteAssets = await prisma.mediaAsset.findMany({
      where: {
        sizeBytes: { lte: 0 },
      },
      take: 500,
    });

    for (const item of zeroByteAssets) {
      await prisma.adImage.deleteMany({ where: { mediaAssetId: item.id } }).catch(() => {});
      await deletePhysicalMedia(item);
      await prisma.mediaAsset.delete({ where: { id: item.id } }).catch(() => {});
      deletedCount++;
      zeroByteCount++;
    }

    // 2. Scan for READY assets that have missing or 0-byte files on local disk
    const readyAssets = await prisma.mediaAsset.findMany({
      where: { status: 'READY' },
      take: 300,
      orderBy: { createdAt: 'desc' },
    });

    for (const item of readyAssets) {
      if (!item.storageKey || item.storageKey.startsWith('http://') || item.storageKey.startsWith('https://')) {
        continue;
      }
      const rawPath = item.storageKey.replace(/^[/\\]+/, '');
      const localPath = path.isAbsolute(rawPath) ? rawPath : path.join(uploadDir, ...rawPath.split('/'));
      let isGhost = false;

      if (!fs.existsSync(localPath)) {
        isGhost = true;
      } else {
        try {
          const stat = fs.statSync(localPath);
          if (stat.size === 0) isGhost = true;
        } catch {
          isGhost = true;
        }
      }

      if (isGhost) {
        await prisma.adImage.deleteMany({ where: { mediaAssetId: item.id } }).catch(() => {});
        if (fs.existsSync(localPath)) {
          await fs.promises.unlink(localPath).catch(() => {});
        }
        await prisma.mediaAsset.delete({ where: { id: item.id } }).catch(() => {});
        deletedCount++;
        zeroByteCount++;
      }
    }

    // 3. Evict permanently failed worker assets
    const failedWhere: any = { status: 'FAILED' };
    if (gracePeriodHours > 0) {
      failedWhere.updatedAt = { lt: new Date(Date.now() - gracePeriodHours * 3600 * 1000) };
    }
    const failedAssets = await prisma.mediaAsset.findMany({
      where: failedWhere,
      take: 300,
    });

    for (const item of failedAssets) {
      await prisma.adImage.deleteMany({ where: { mediaAssetId: item.id } }).catch(() => {});
      await deletePhysicalMedia(item);
      freedBytes += Number(item.sizeBytes || 0);
      await prisma.mediaAsset.delete({ where: { id: item.id } }).catch(() => {});
      deletedCount++;
      failedCount++;
    }

    // 4. Reconcile & evict stuck processing assets older than 15 minutes (stalled/crashed workers)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const stuckAssets = await prisma.mediaAsset.findMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: fifteenMinsAgo },
      },
      take: 100,
    });

    for (const item of stuckAssets) {
      await prisma.adImage.deleteMany({ where: { mediaAssetId: item.id } }).catch(() => {});
      await deletePhysicalMedia(item);
      await prisma.mediaAsset.delete({ where: { id: item.id } }).catch(() => {});
      deletedCount++;
      failedCount++;
    }

    // 5. Purge unattached orphaned media (older than gracePeriodHours)
    const unattachedWhere: any = {
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
      unattachedWhere.createdAt = { lt: cutoffDate };
    }

    const orphans = await prisma.mediaAsset.findMany({
      where: unattachedWhere,
      take: 500,
    });

    for (const orphan of orphans) {
      await deletePhysicalMedia(orphan);
      freedBytes += Number(orphan.sizeBytes || 0);
      await prisma.mediaAsset.delete({ where: { id: orphan.id } }).catch(() => {});
      deletedCount++;
      unattachedCount++;
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
          zeroByteCount,
          failedCount,
          unattachedCount,
          freedBytes,
          freedFormatted: formatBytes(freedBytes),
          gracePeriodHours,
        },
      });
    }

    return {
      success: true,
      deletedCount,
      zeroByteCount,
      failedCount,
      unattachedCount,
      healedCount: 0,
      freedBytes,
      freedFormatted: formatBytes(freedBytes),
      message: `Cleaned up ${deletedCount} files (${zeroByteCount} 0-byte/corrupt, ${failedCount} worker failures, ${unattachedCount} unattached) and reclaimed ${formatBytes(freedBytes)} of storage`,
    };
  }

  // Scans persistent disk and banner table to register unindexed banner media files into the catalog
  static async syncBannerMediaAssets(): Promise<{ syncedCount: number; message: string }> {
    if (this.isSyncingBanners) {
      return { syncedCount: 0, message: 'Banner media synchronization already in progress' };
    }

    this.isSyncingBanners = true;
    try {
      const uploadDir = resolveUploadDir();
      const bannersDir = path.join(uploadDir, 'banners');
      let syncedCount = 0;

      const adminUser = await prisma.user.findFirst({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
        select: { id: true },
      });
      if (!adminUser) {
        return { syncedCount: 0, message: 'No admin user found to attribute banner media assets' };
      }

      const banners = await prisma.banner.findMany({
        select: {
          id: true,
          title: true,
          desktopMediaUrl: true,
          mobileMediaUrl: true,
          imageMediaAssetId: true,
        },
      });

      const bannerMap = new Map<string, (typeof banners)[0]>();
      for (const b of banners) {
        if (b.desktopMediaUrl) {
          bannerMap.set(cleanStorageKey(b.desktopMediaUrl).toLowerCase(), b);
          bannerMap.set(path.basename(cleanStorageKey(b.desktopMediaUrl)).toLowerCase(), b);
        }
        if (b.mobileMediaUrl) {
          bannerMap.set(cleanStorageKey(b.mobileMediaUrl).toLowerCase(), b);
          bannerMap.set(path.basename(cleanStorageKey(b.mobileMediaUrl)).toLowerCase(), b);
        }
      }

      if (fs.existsSync(bannersDir)) {
        const files = fs.readdirSync(bannersDir);
        for (const fileName of files) {
          const fullPath = path.join(bannersDir, fileName);
          try {
            const stat = fs.statSync(fullPath);
            if (!stat.isFile() || stat.size === 0) continue;

            const storageKey = `banners/${fileName}`;
            const matchedBanner = bannerMap.get(storageKey.toLowerCase()) || bannerMap.get(fileName.toLowerCase());
            const ext = path.extname(fileName).toLowerCase().replace(/^\./, '') || 'webp';
            const mime = getMimeTypeFromExt(ext);

            const asset = await prisma.mediaAsset
              .upsert({
                where: { storageKey },
                create: {
                  ownerId: adminUser.id,
                  entityType: 'BANNER',
                  entityId: matchedBanner?.id || null,
                  storageKey,
                  originalName: fileName,
                  mimeType: mime,
                  extension: ext,
                  sizeBytes: BigInt(stat.size),
                  status: 'READY',
                  variants: { url: `/media/${storageKey}` },
                },
                update: {
                  ...(matchedBanner?.id ? { entityId: matchedBanner.id } : {}),
                },
              })
              .catch(() => null);

            if (asset) {
              syncedCount++;

              if (matchedBanner && !matchedBanner.imageMediaAssetId) {
                await prisma.banner
                  .update({
                    where: { id: matchedBanner.id },
                    data: { imageMediaAssetId: asset.id },
                  })
                  .catch(() => {});
              }
            }
          } catch {
            // Ignore individual file error
          }
        }
      }

      return {
        syncedCount,
        message: `Indexed & synced ${syncedCount} banner media assets from disk into catalog.`,
      };
    } finally {
      this.isSyncingBanners = false;
    }
  }

  // Audits physical storage on disk and cross-references against database to identify orphans and junk
  static async getDiskAudit() {
    const uploadDir = resolveUploadDir();
    const diskFiles = getFilesRecursively(uploadDir);

    const totalFilesOnDisk = diskFiles.length;
    const totalDiskSizeBytes = diskFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

    const [allAssets, allBanners, allCategories, allUserProfiles] = await Promise.all([
      prisma.mediaAsset.findMany({
        select: {
          id: true,
          storageKey: true,
          variants: true,
          entityType: true,
          originalName: true,
          sizeBytes: true,
        },
      }),
      prisma.banner.findMany({
        select: { id: true, desktopMediaUrl: true, mobileMediaUrl: true },
      }),
      prisma.category.findMany({
        select: { id: true, iconUrl: true, imageMediaAssetId: true },
      }),
      prisma.profile.findMany({
        where: { avatarUrl: { not: null } },
        select: { id: true, avatarUrl: true },
      }),
    ]);

    const knownKeys = new Set<string>();

    for (const a of allAssets) {
      if (a.storageKey) {
        const clean = cleanStorageKey(a.storageKey).toLowerCase();
        knownKeys.add(clean);
        knownKeys.add(path.basename(clean));
      }
      if (a.variants && typeof a.variants === 'object') {
        for (const v of Object.values(a.variants)) {
          if (typeof v === 'string') {
            const clean = cleanStorageKey(v).toLowerCase();
            knownKeys.add(clean);
            knownKeys.add(path.basename(clean));
          }
        }
      }
    }

    for (const b of allBanners) {
      if (b.desktopMediaUrl) {
        const clean = cleanStorageKey(b.desktopMediaUrl).toLowerCase();
        knownKeys.add(clean);
        knownKeys.add(path.basename(clean));
      }
      if (b.mobileMediaUrl) {
        const clean = cleanStorageKey(b.mobileMediaUrl).toLowerCase();
        knownKeys.add(clean);
        knownKeys.add(path.basename(clean));
      }
    }

    for (const c of allCategories) {
      if (c.iconUrl) {
        const clean = cleanStorageKey(c.iconUrl).toLowerCase();
        knownKeys.add(clean);
        knownKeys.add(path.basename(clean));
      }
    }

    for (const u of allUserProfiles) {
      if (u.avatarUrl) {
        const clean = cleanStorageKey(u.avatarUrl).toLowerCase();
        knownKeys.add(clean);
        knownKeys.add(path.basename(clean));
      }
    }

    const activeFiles: any[] = [];
    const orphansList: Array<{
      name: string;
      path: string;
      folder: string;
      sizeBytes: number;
      sizeFormatted: string;
      modifiedAt: Date;
      reason: string;
    }> = [];

    for (const file of diskFiles) {
      const cleanRel = file.relativePath.toLowerCase();
      const baseName = path.basename(file.relativePath).toLowerCase();

      const isKnown = knownKeys.has(cleanRel) || knownKeys.has(baseName);

      if (isKnown) {
        activeFiles.push(file);
      } else {
        let reason = 'Unreferenced file on persistent disk';
        if (file.folder === 'temp') reason = 'Abandoned temporary upload file';
        else if (file.folder === 'banners') reason = 'Unindexed or deleted banner file';
        else if (file.folder === 'ads') reason = 'Orphaned ad listing image';
        else if (file.folder === 'chats') reason = 'Orphaned chat attachment';
        else if (file.folder === 'trash' || file.folder === 'failed') reason = 'Dead/failed worker artifact';

        orphansList.push({
          name: path.basename(file.relativePath),
          path: file.relativePath,
          folder: file.folder,
          sizeBytes: file.sizeBytes,
          sizeFormatted: formatBytes(file.sizeBytes),
          modifiedAt: file.modifiedAt,
          reason,
        });
      }
    }

    const ghostsList: Array<{
      id: string;
      storageKey: string;
      entityType: string;
      originalName: string;
    }> = [];

    for (const a of allAssets) {
      if (!a.storageKey || isExternalUrl(a.storageKey)) continue;
      const clean = cleanStorageKey(a.storageKey);
      const localPath = path.isAbsolute(clean) ? clean : path.join(uploadDir, ...clean.split('/'));
      if (!fs.existsSync(localPath)) {
        ghostsList.push({
          id: a.id,
          storageKey: a.storageKey,
          entityType: a.entityType,
          originalName: a.originalName,
        });
      }
    }

    const folderMap = new Map<string, { count: number; bytes: number }>();
    for (const f of diskFiles) {
      const cur = folderMap.get(f.folder) || { count: 0, bytes: 0 };
      cur.count++;
      cur.bytes += f.sizeBytes;
      folderMap.set(f.folder, cur);
    }

    const folderBreakdown = Array.from(folderMap.entries()).map(([folder, val]) => ({
      folder,
      count: val.count,
      sizeBytes: val.bytes,
      sizeFormatted: formatBytes(val.bytes),
    }));

    const orphanDiskSizeBytes = orphansList.reduce((acc, o) => acc + o.sizeBytes, 0);
    const activeDiskSizeBytes = activeFiles.reduce((acc, a) => acc + a.sizeBytes, 0);

    return {
      diskRoot: uploadDir,
      totalFilesOnDisk,
      totalDiskSizeBytes,
      totalDiskSizeFormatted: formatBytes(totalDiskSizeBytes),
      databaseAssetsCount: allAssets.length,
      activeFilesCount: activeFiles.length,
      activeDiskSizeBytes,
      activeDiskSizeFormatted: formatBytes(activeDiskSizeBytes),
      orphanFilesCount: orphansList.length,
      orphanDiskSizeBytes,
      orphanDiskSizeFormatted: formatBytes(orphanDiskSizeBytes),
      ghostRecordsCount: ghostsList.length,
      folderBreakdown,
      orphansList,
      ghostsList,
    };
  }

  // Purges unreferenced junk and orphan files directly from physical disk
  static async cleanupDiskOrphans(actorUserId?: string) {
    const audit = await this.getDiskAudit();
    const uploadDir = resolveUploadDir();
    let freedBytes = 0;
    let deletedCount = 0;
    const deletedFiles: string[] = [];

    // Safety rule: protect files modified in last 15 minutes (in-flight uploads)
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;

    for (const orphan of audit.orphansList) {
      if (new Date(orphan.modifiedAt).getTime() > fifteenMinsAgo) {
        continue;
      }

      const fullPath = path.join(uploadDir, ...orphan.path.split('/'));
      try {
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
          freedBytes += orphan.sizeBytes;
          deletedCount++;
          deletedFiles.push(orphan.path);

          // Prune empty parent directories recursively up to uploadDir
          let currentDir = path.dirname(fullPath);
          while (currentDir !== uploadDir && currentDir.startsWith(uploadDir)) {
            try {
              const entries = await fs.promises.readdir(currentDir);
              if (entries.length === 0) {
                await fs.promises.rmdir(currentDir);
                currentDir = path.dirname(currentDir);
              } else {
                break;
              }
            } catch {
              break;
            }
          }
        }
      } catch (err) {
        console.warn(`[DiskCleanup] Failed to unlink ${orphan.path}:`, err);
      }
    }

    if (actorUserId && deletedCount > 0) {
      await writeAuditLog({
        userId: actorUserId,
        action: 'ADMIN_ACTION_CLEANUP_DISK_ORPHANS',
        entityType: 'MEDIA',
        entityId: 'DISK_CLEANUP',
        status: 'SUCCESS',
        newData: {
          deletedCount,
          freedBytes,
          freedFormatted: formatBytes(freedBytes),
          deletedFiles,
        },
      });
    }

    return {
      success: true,
      deletedCount,
      freedBytes,
      freedFormatted: formatBytes(freedBytes),
      deletedFiles,
      message: `Cleaned up ${deletedCount} orphan files from disk, reclaiming ${formatBytes(freedBytes)} of storage.`,
    };
  }
}
