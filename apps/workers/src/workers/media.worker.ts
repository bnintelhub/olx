import { Worker, Job, Queue } from 'bullmq';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getStorageProvider, buildMediaPath, buildMediaDirectory, MediaResource } from '@olx/shared';
import { prisma } from '@olx/database';
import { getRedisBullConnection } from '../config/env';

// Legacy job payload (for Media table)
export interface MediaProcessJobData {
  mediaId: string;
  tempPath: string;
  userId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  baseUrl?: string;
  resource?: MediaResource;
  resourceId?: string;
  mediaType?: string;
}

// New MediaAsset job payload (for media_assets table)
export interface MediaProcessingJobData {
  assetId: string;
  ownerId: string;
  tempStorageKey: string;
  originalName: string;
  mimeType: string;
  extension: string;
  checksum: string;
  sizeBytes: number;
  entityType?: string;
  entityId?: string;
}

// Focal point detection using edge saliency and contrast centroid
async function detectFocalPoint(
  imagePath: string,
  _width: number,
  _height: number
): Promise<{ x: number; y: number }> {
  try {
    const { data, info } = await sharp(imagePath, { limitInputPixels: 64000000 })
      .rotate()
      .resize(64, 64, { fit: 'fill', fastShrinkOnLoad: true })
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;
    const w = info.width;
    const h = info.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const val = data[y * w + x];
        if (val > 20) {
          const weight = val * val;
          sumX += x * weight;
          sumY += y * weight;
          totalWeight += weight;
        }
      }
    }

    if (totalWeight < 1000) {
      return { x: 0.5, y: 0.5 };
    }

    const focalX = Math.min(Math.max(sumX / totalWeight / w, 0.05), 0.95);
    const focalY = Math.min(Math.max(sumY / totalWeight / h, 0.05), 0.95);

    return {
      x: Math.round(focalX * 1000) / 1000,
      y: Math.round(focalY * 1000) / 1000,
    };
  } catch {
    return { x: 0.5, y: 0.5 };
  }
}

// Calculates crop window anchored to focal point
function calculateCropWindow(
  srcW: number,
  srcH: number,
  targetAspect: number,
  focal: { x: number; y: number }
): { left: number; top: number; width: number; height: number } {
  const srcAspect = srcW / srcH;
  let cropW = srcW;
  let cropH = srcH;
  let left = 0;
  let top = 0;

  if (srcAspect > targetAspect) {
    cropH = srcH;
    cropW = Math.max(1, Math.round(srcH * targetAspect));
    const focalPxX = focal.x * srcW;
    left = Math.round(focalPxX - cropW / 2);
    left = Math.max(0, Math.min(srcW - cropW, left));
  } else if (srcAspect < targetAspect) {
    cropW = srcW;
    cropH = Math.max(1, Math.round(srcW / targetAspect));
    const focalPxY = focal.y * srcH;
    top = Math.round(focalPxY - cropH / 2);
    top = Math.max(0, Math.min(srcH - cropH, top));
  }

  return { left, top, width: cropW, height: cropH };
}

export function startMediaWorker() {
  const connection = getRedisBullConnection();
  const storage = getStorageProvider();
  const concurrency = Math.min(4, Math.max(2, os.cpus().length));

  // Dead Letter Queue instance for poison jobs
  const mediaDeadLetterQueue = new Queue('media-dead-letter', {
    connection,
    skipVersionCheck: true,
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
    },
  });

  mediaDeadLetterQueue.on('error', (err) => {
    console.warn('[Queue - media-dead-letter] Redis connection warning:', err.message);
  });

  // ---------------------------------------------------------------------------
  // Worker 1: New MediaAsset Processor ('media-processing' queue)
  // ---------------------------------------------------------------------------
  const assetWorker = new Worker<MediaProcessingJobData>(
    'media-processing',
    async (job: Job<MediaProcessingJobData>) => {
      const {
        assetId,
        ownerId,
        tempStorageKey,
        originalName,
        mimeType,
        extension,
        checksum,
        sizeBytes,
      } = job.data;

      console.log(`[Worker - media-processing] Processing Asset ${assetId} (${originalName})`);

      const tempFullPath = storage.getPath(tempStorageKey);
      if (!fs.existsSync(tempFullPath)) {
        throw new Error(`Temp file not found at ${tempStorageKey}`);
      }

      // Mark status as PROCESSING
      await prisma.mediaAsset.update({
        where: { id: assetId },
        data: { status: 'PROCESSING' },
      });

      const date = new Date();
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');

      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');

      try {
        if (isImage) {
          const image = sharp(tempFullPath, { failOn: 'error', limitInputPixels: 64000000 });
          const metadata = await image.metadata();

          const isRotated = metadata.orientation && [5, 6, 7, 8].includes(metadata.orientation);
          const width = isRotated ? (metadata.height || 0) : (metadata.width || 0);
          const height = isRotated ? (metadata.width || 0) : (metadata.height || 0);

          if (width > 6000 || height > 6000) {
            throw new Error(`Image dimensions ${width}x${height} exceed the allowable limit of 6000x6000px.`);
          }

          const focalPoint = await detectFocalPoint(tempFullPath, width, height);
          const thumbCrop = calculateCropWindow(width, height, 1.0, focalPoint);
          const cardCrop = calculateCropWindow(width, height, 4 / 3, focalPoint);

          // Single Source of Truth: WebP at 100% Quality
          const webpBuffer = await sharp(tempFullPath, { limitInputPixels: 64000000 })
            .rotate()
            .toColorspace('srgb')
            .webp({ quality: 100, effort: 3 })
            .toBuffer();

          const baseDir = `images/${year}/${month}/${day}/${assetId}`;
          const imageKey = `${baseDir}/image.webp`;

          await storage.save({ destinationKey: imageKey, streamOrBuffer: webpBuffer });

          const variants = {
            url: imageKey,
          };

          await prisma.mediaAsset.update({
            where: { id: assetId },
            data: {
              status: 'READY',
              storageKey: imageKey,
              width,
              height,
              variants,
              metadata: { focalPoint },
            },
          });
        } else if (isVideo) {
          const baseDir = `videos/${year}/${month}/${day}/${assetId}`;
          const destinationKey = `${baseDir}/original.${extension || 'mp4'}`;
          await storage.move(tempStorageKey, destinationKey);

          await prisma.mediaAsset.update({
            where: { id: assetId },
            data: {
              status: 'READY',
              storageKey: destinationKey,
            },
          });
        } else {
          // Documents / other
          const baseDir = `documents/${year}/${month}/${day}/${assetId}`;
          const destinationKey = `${baseDir}/original.${extension || 'pdf'}`;
          await storage.move(tempStorageKey, destinationKey);

          await prisma.mediaAsset.update({
            where: { id: assetId },
            data: {
              status: 'READY',
              storageKey: destinationKey,
            },
          });
        }

        // Clean temp file
        if (await storage.exists(tempStorageKey)) {
          await storage.delete(tempStorageKey).catch(() => {});
        }

        console.log(`[Worker - media-processing] Successfully processed Asset ${assetId}`);
      } catch (err: any) {
        console.error(`[Worker - media-processing] Failed processing Asset ${assetId}:`, err);
        const attemptsMade = job.attemptsMade;
        const maxAttempts = job.opts.attempts || 3;

        if (attemptsMade >= maxAttempts) {
          await prisma.mediaAsset.update({
            where: { id: assetId },
            data: { status: 'FAILED' },
          }).catch(() => {});

          await mediaDeadLetterQueue.add('failed-asset-job', {
            assetId,
            ownerId,
            tempStorageKey,
            originalName,
            error: err.message,
            stack: err.stack,
            failedAt: new Date().toISOString(),
          }).catch(() => {});

          // Clean temp
          if (await storage.exists(tempStorageKey)) {
            await storage.delete(tempStorageKey).catch(() => {});
          }
        }
        throw err;
      }
    },
    { connection, concurrency, skipVersionCheck: true }
  );

  assetWorker.on('error', (err) => {
    console.warn('[Worker - media-processing] Redis connection warning:', err.message);
  });

  // ---------------------------------------------------------------------------
  // Worker 2: Legacy Media Processor ('media-process' queue)
  // ---------------------------------------------------------------------------
  const legacyWorker = new Worker<MediaProcessJobData>(
    'media-process',
    async (job: Job<MediaProcessJobData>) => {
      const {
        mediaId,
        tempPath,
        userId,
        originalName,
        resource = 'ads',
        resourceId = 'drafts',
        mediaType = 'images',
      } = job.data;

      console.log(`[Worker - media-process (legacy)] Processing Media ID: ${mediaId}`);

      if (!fs.existsSync(tempPath)) {
        throw new Error(`Temporary file not found at: ${tempPath}`);
      }

      try {
        const image = sharp(tempPath, { failOn: 'error', limitInputPixels: 64000000 });
        const metadata = await image.metadata();

        const isRotated = metadata.orientation && [5, 6, 7, 8].includes(metadata.orientation);
        const width = isRotated ? (metadata.height || 0) : (metadata.width || 0);
        const height = isRotated ? (metadata.width || 0) : (metadata.height || 0);

        // Single Source of Truth: WebP at 100% Quality
        const webpBuffer = await sharp(tempPath, { limitInputPixels: 64000000 })
          .rotate()
          .toColorspace('srgb')
          .webp({ quality: 100, effort: 3 })
          .toBuffer();

        const imagePath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'image', format: 'webp' });

        await storage.save({ destinationKey: imagePath, streamOrBuffer: webpBuffer });

        const variants = {
          url: imagePath,
        };

        await prisma.mediaAsset.update({
          where: { id: mediaId },
          data: {
            status: 'READY',
            width,
            height,
            storageKey: imagePath,
            variants,
          },
        }).catch(() => {});

        await fs.promises.unlink(tempPath).catch(() => {});
        console.log(`[Worker - media-process (legacy)] Successfully processed Media ID: ${mediaId}`);
      } catch (err: any) {
        const attemptsMade = job.attemptsMade;
        const maxAttempts = job.opts.attempts || 3;

        if (attemptsMade >= maxAttempts) {
          await prisma.mediaAsset.update({
            where: { id: mediaId },
            data: {
              status: 'FAILED',
              failureReason: err.message?.substring(0, 250) || 'Processing failed after max retries',
            },
          }).catch(() => {});

          await mediaDeadLetterQueue.add('failed-legacy-media-job', {
            mediaId,
            userId,
            originalName,
            error: err.message,
            stack: err.stack,
            failedAt: new Date().toISOString(),
          }).catch(() => {});

          if (fs.existsSync(tempPath)) {
            await fs.promises.unlink(tempPath).catch(() => {});
          }
        }
        throw err;
      }
    },
    { connection, concurrency, skipVersionCheck: true }
  );

  legacyWorker.on('error', (err) => {
    console.warn('[Worker - media-process (legacy)] Redis connection warning:', err.message);
  });

  return {
    close: async () => {
      await Promise.all([assetWorker.close(), legacyWorker.close(), mediaDeadLetterQueue.close()]);
    },
  };
}
