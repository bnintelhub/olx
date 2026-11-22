import { Worker, Job, Queue } from 'bullmq';
import sharp from 'sharp';
import fs from 'fs';
import os from 'os';
import { getStorageProvider, buildMediaPath } from '@olx/shared';
import { prisma } from '@olx/database';
import { getRedisBullConnection } from '../config/env';
import { MediaProcessingJobData, MediaProcessJobData } from './media/media.types';
import { detectFocalPoint } from './media/focal-point.util';

// Re-export types for consumer compatibility
export { MediaProcessingJobData, MediaProcessJobData };

export function startMediaWorker() {
  const connection = getRedisBullConnection();
  const storage = getStorageProvider();
  const concurrency = Math.min(4, Math.max(2, os.cpus().length));

  // Dead Letter Queue for poison jobs
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
  // Worker 1: Modern MediaAsset Processor ('media-processing' queue)
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
        entityType,
      } = job.data;

      console.log(`[Worker - media-processing] Processing Asset ${assetId} (${originalName})`);

      const tempFullPath = storage.getPath(tempStorageKey);
      if (!fs.existsSync(tempFullPath)) {
        throw new Error(`Temp file not found at ${tempStorageKey}`);
      }

      // Edge case: Reject 0-byte corrupt files immediately
      const tempStat = fs.statSync(tempFullPath);
      if (tempStat.size === 0) {
        if (await storage.exists(tempStorageKey)) {
          await storage.delete(tempStorageKey).catch(() => {});
        }
        await prisma.mediaAsset.update({
          where: { id: assetId },
          data: {
            status: 'FAILED',
            failureReason: 'Uploaded file is 0 bytes (corrupt or empty image)',
          },
        }).catch(() => {});

        throw new Error(`Asset ${assetId} failed: 0 bytes empty file`);
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
          const fileBuffer = await fs.promises.readFile(tempFullPath);
          const image = sharp(fileBuffer, { failOn: 'error', limitInputPixels: 64000000 });
          const metadata = await image.metadata();

          const isRotated = metadata.orientation && [5, 6, 7, 8].includes(metadata.orientation);
          const width = isRotated ? (metadata.height || 0) : (metadata.width || 0);
          const height = isRotated ? (metadata.width || 0) : (metadata.height || 0);

          if (width > 6000 || height > 6000) {
            throw new Error(`Image dimensions ${width}x${height} exceed the allowable limit of 6000x6000px.`);
          }

          const focalPoint = await detectFocalPoint(tempFullPath, width, height);

          // Rotate first to normalize EXIF, convert to sRGB
          let pipeline = sharp(fileBuffer, { limitInputPixels: 64000000 })
            .rotate()
            .toColorspace('srgb');

          const webpBuffer = await pipeline
            .webp({ quality: 100, effort: 3 })
            .toBuffer();

          if (!webpBuffer || webpBuffer.length === 0) {
            throw new Error('Image optimization resulted in empty (0 bytes) file');
          }

          const baseDir = `images/${year}/${month}/${day}/${assetId}`;
          const imageKey = `${baseDir}/image.webp`;

          await storage.save({ destinationKey: imageKey, streamOrBuffer: webpBuffer });

          await prisma.mediaAsset.update({
            where: { id: assetId },
            data: {
              status: 'READY',
              storageKey: imageKey,
              width,
              height,
              sizeBytes: BigInt(webpBuffer.length),
              variants: { url: imageKey },
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

        // Clean up partial destination file if any exists
        const baseDir = `images/${year}/${month}/${day}/${assetId}`;
        const imageKey = `${baseDir}/image.webp`;
        try {
          if (await storage.exists(imageKey)) {
            await storage.delete(imageKey).catch(() => {});
          }
        } catch {}

        if (attemptsMade >= maxAttempts) {
          await prisma.mediaAsset.update({
            where: { id: assetId },
            data: {
              status: 'FAILED',
              failureReason: err.message?.substring(0, 250) || 'Processing failed after max retries',
            },
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

      const tempStat = fs.statSync(tempPath);
      if (tempStat.size === 0) {
        await fs.promises.unlink(tempPath).catch(() => {});
        await prisma.mediaAsset.update({
          where: { id: mediaId },
          data: {
            status: 'FAILED',
            failureReason: 'Temporary file is 0 bytes (corrupt or empty image)',
          },
        }).catch(() => {});

        throw new Error(`Media ID ${mediaId} failed: 0 bytes empty file`);
      }

      try {
        const fileBuffer = await fs.promises.readFile(tempPath);
        const image = sharp(fileBuffer, { failOn: 'error', limitInputPixels: 64000000 });
        const metadata = await image.metadata();

        const isRotated = metadata.orientation && [5, 6, 7, 8].includes(metadata.orientation);
        const width = isRotated ? (metadata.height || 0) : (metadata.width || 0);
        const height = isRotated ? (metadata.width || 0) : (metadata.height || 0);

        let pipeline = sharp(fileBuffer, { limitInputPixels: 64000000 })
          .rotate()
          .toColorspace('srgb');

        const webpBuffer = await pipeline
          .webp({ quality: 100, effort: 3 })
          .toBuffer();

        if (!webpBuffer || webpBuffer.length === 0) {
          throw new Error('Image optimization resulted in empty (0 bytes) file');
        }

        const imagePath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'image', format: 'webp' });

        await storage.save({ destinationKey: imagePath, streamOrBuffer: webpBuffer });

        await prisma.mediaAsset.update({
          where: { id: mediaId },
          data: {
            status: 'READY',
            width,
            height,
            sizeBytes: BigInt(webpBuffer.length),
            storageKey: imagePath,
            variants: { url: imagePath },
          },
        }).catch(() => {});

        await fs.promises.unlink(tempPath).catch(() => {});
        console.log(`[Worker - media-process (legacy)] Successfully processed Media ID: ${mediaId}`);
      } catch (err: any) {
        console.error(`[Worker - media-process (legacy)] Failed processing Media ID: ${mediaId}:`, err);
        const attemptsMade = job.attemptsMade;
        const maxAttempts = job.opts.attempts || 3;

        const imagePath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'image', format: 'webp' });
        try {
          if (await storage.exists(imagePath)) {
            await storage.delete(imagePath).catch(() => {});
          }
        } catch {}

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
    assetWorker,
    legacyWorker,
    mediaDeadLetterQueue,
    close: async () => {
      await Promise.all([
        assetWorker.close(),
        legacyWorker.close(),
        mediaDeadLetterQueue.close(),
      ]);
    },
  };
}
