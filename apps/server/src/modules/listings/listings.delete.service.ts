import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { defaultStorage, resolveUploadDir } from '../../integrations/storage/storage.adapter';
import { deletePhysicalMedia } from '../admin/admin.media.service';
import { delCache } from '../../config/redis';

interface AuthenticatedUser {
  id: string;
  role: string;
}

export class ListingsDeleteService {
  /**
   * Deletes an ad and physically removes all associated media files from S3/MinIO and local storage.
   */
  static async deleteListing(adId: string, currentUser?: AuthenticatedUser) {
    // 1. Fetch listing along with all image relationships and media records
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: {
        images: {
          include: {
            media: true,
          },
        },
      },
    });

    if (!ad) {
      throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');
    }

    // 2. Permission check: Owner or Staff (Admin / Moderator)
    if (currentUser) {
      const isOwner = ad.userId === currentUser.id;
      const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(currentUser.role);
      if (!isOwner && !isStaff) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this listing');
      }
    }

    const uploadDir = resolveUploadDir();

    // 3. Purge physical files and S3 directories for all associated images
    for (const adImg of ad.images) {
      // Clean up linked Media table record and physical files
      if (adImg.media) {
        await deletePhysicalMedia(adImg.media).catch((err) => {
          console.warn(`[ListingsDelete] Warning deleting media record ${adImg.media?.id}:`, err);
        });
        await prisma.media.delete({ where: { id: adImg.media.id } }).catch(() => {});
      }

      // Purge any URLs matching S3 bucket keys (e.g. ads/drafts/images/med_xxx or ads/{adId}/)
      const urlsToClean = [adImg.originalUrl, adImg.displayUrl, adImg.thumbnailUrl].filter(Boolean);
      for (const url of urlsToClean) {
        if (typeof url === 'string') {
          // Extract S3 key from URL: http://.../olx-media/ads/xxx
          if (url.includes('/olx-media/')) {
            const s3Key = url.split('/olx-media/')[1];
            if (s3Key) {
              const s3Dir = s3Key.includes('/') ? s3Key.substring(0, s3Key.lastIndexOf('/')) : s3Key;
              await defaultStorage.deleteMediaDirectory(s3Dir).catch(() => {});
            }
          }

          // If local file path, delete file
          if (url.includes('/uploads/')) {
            const relPath = url.split('/uploads/')[1];
            if (relPath) {
              const fullLocalPath = path.join(uploadDir, ...relPath.split('/'));
              if (fs.existsSync(fullLocalPath)) {
                await fs.promises.unlink(fullLocalPath).catch(() => {});
              }
            }
          }
        }
      }
    }

    // 4. Purge entire S3 folder allocated for this ad
    await defaultStorage.deleteMediaDirectory(`ads/${ad.id}`).catch(() => {});

    // 5. Purge local directory for this ad if exists
    const localAdDir = path.join(uploadDir, 'ads', ad.id);
    if (fs.existsSync(localAdDir)) {
      await fs.promises.rm(localAdDir, { recursive: true, force: true }).catch(() => {});
    }

    // 6. Delete Ad record (cascades to AdImage, AdAttributeValue, UserFavourite, etc.)
    await prisma.ad.delete({
      where: { id: ad.id },
    });

    // 7. Evict Redis caches
    await delCache(
      `ad:details:${ad.id}`,
      `ad:details:${ad.slug}`,
      `ad:${ad.id}:contact`
    );

    return {
      id: ad.id,
      title: ad.title,
      imagesDeleted: ad.images.length,
      deletedAt: new Date().toISOString(),
    };
  }
}
