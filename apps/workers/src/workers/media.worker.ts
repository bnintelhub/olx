import { Worker, Job, Queue } from 'bullmq';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { buildMediaPath, buildMediaDirectory, MediaResource } from '@olx/shared';
import { prisma } from '@olx/database';
import { env, getRedisBullConnection } from '../config/env';

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

const s3Client =
  env.STORAGE_DRIVER === 's3'
    ? new S3Client({
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY,
          secretAccessKey: env.S3_SECRET_KEY,
        },
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
      })
    : null;

let bucketChecked = false;
async function ensureBucket(): Promise<void> {
  if (bucketChecked || !s3Client) return;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    bucketChecked = true;
  } catch {
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
      const publicReadPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadVariants',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${env.S3_BUCKET}/*`],
          },
        ],
      });
      await s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: env.S3_BUCKET,
          Policy: publicReadPolicy,
        })
      );
    } catch {
      // Concurrently created
    }
    bucketChecked = true;
  }
}

// Fast, deterministic focal point detection using edge saliency and contrast centroid
async function detectFocalPoint(
  tempPath: string,
  _width: number,
  _height: number
): Promise<{ x: number; y: number }> {
  try {
    const { data, info } = await sharp(tempPath, { limitInputPixels: 64000000 })
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

// Calculates smart crop window anchored to focal point to keep key subject visible
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

// Resolves shared monorepo root uploads/ directory so server and background workers use the exact same storage
function resolveUploadDir(): string {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.env.UPLOAD_DIR);
  }
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return path.join(current, 'uploads');
    }
    current = path.dirname(current);
  }
  return path.resolve(process.cwd(), 'uploads');
}

export function startMediaWorker() {
  const connection = getRedisBullConnection();

  // Dead Letter Queue instance for archiving permanently failed or poisoned jobs
  const mediaDeadLetterQueue = new Queue('media-dead-letter', {
    connection,
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
    },
  });

  const uploadDir = resolveUploadDir();
  const variantsDir = path.join(uploadDir, 'variants');

  // Controlled concurrency to protect worker host from memory exhaustion & CPU spikes (Sharp native threads)
  const concurrency = Math.min(4, Math.max(2, os.cpus().length));

  const worker = new Worker<MediaProcessJobData>(
    'media-process',
    async (job: Job<MediaProcessJobData>) => {
      const {
        mediaId,
        tempPath,
        userId,
        originalName,
        mimeType,
        fileSize,
        baseUrl,
        resource = 'ads',
        resourceId = 'drafts',
        mediaType = 'images',
      } = job.data;
      console.log(`[Worker - media-process] Starting processing for Media ID: ${mediaId} (${resource}/${resourceId}/${mediaType})`);

      if (!fs.existsSync(tempPath)) {
        throw new Error(`Temporary file not found on disk at: ${tempPath}`);
      }

      try {
        // Inspect image metadata with sharp
        const image = sharp(tempPath, { failOn: 'error', limitInputPixels: 64000000 });
        const metadata = await image.metadata();

        const allowedFormats = ['jpeg', 'png', 'webp', 'jpg', 'heif', 'heic'];
        if (!metadata.format || !allowedFormats.includes(metadata.format)) {
          throw new Error(`Unsupported image format: ${metadata.format}`);
        }

        // Account for EXIF rotation
        const isRotated = metadata.orientation && [5, 6, 7, 8].includes(metadata.orientation);
        const width = isRotated ? (metadata.height || 0) : (metadata.width || 0);
        const height = isRotated ? (metadata.width || 0) : (metadata.height || 0);

        if (width > 5000 || height > 5000) {
          throw new Error(`Image dimensions ${width}x${height} exceed the maximum allowable limit of 5000x5000px.`);
        }

        // Detect focal point coordinates normalized between 0.0 and 1.0
        const focalPoint = await detectFocalPoint(tempPath, width, height);

        // Calculate smart crop regions preserving focal area
        const thumbCrop = calculateCropWindow(width, height, 1.0, focalPoint);
        const cardCrop = calculateCropWindow(width, height, 4 / 3, focalPoint);

        // Generate 4 quality-aware WebP variants:
        // 1. Large: Max 1600px on longest side, aspect-ratio preserved
        // 2. Medium: Max 800px on longest side, aspect-ratio preserved
        // 3. Thumbnail: 300x300 1:1 smart cropped around focal point
        // 4. Card: 600x450 4:3 smart cropped around focal point
        const [largeBuffer, mediumBuffer, thumbBuffer, cardBuffer] = await Promise.all([
          sharp(tempPath, { limitInputPixels: 64000000 })
            .rotate()
            .toColorspace('srgb')
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85, effort: 3 })
            .toBuffer(),
          sharp(tempPath, { limitInputPixels: 64000000 })
            .rotate()
            .toColorspace('srgb')
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82, effort: 3 })
            .toBuffer(),
          sharp(tempPath, { limitInputPixels: 64000000 })
            .rotate()
            .toColorspace('srgb')
            .extract(thumbCrop)
            .resize(300, 300)
            .webp({ quality: 80, effort: 3 })
            .toBuffer(),
          sharp(tempPath, { limitInputPixels: 64000000 })
            .rotate()
            .toColorspace('srgb')
            .extract(cardCrop)
            .resize(600, 450)
            .webp({ quality: 82, effort: 3 })
            .toBuffer(),
        ]);

        // Human-readable, domain-driven paths (e.g. ads/{adId}/images/{mediaId}/large.webp)
        const largePath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'large', format: 'webp' });
        const mediumPath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'medium', format: 'webp' });
        const thumbPath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'thumbnail', format: 'webp' });
        const cardPath = buildMediaPath({ resource, resourceId, mediaType, mediaId, variant: 'card', format: 'webp' });
        const relativeDir = buildMediaDirectory({ resource, resourceId, mediaType, mediaId });

        let variants: { thumbnail: string; card: string; medium: string; large: string };
        let diskPath: string;

        if (env.STORAGE_DRIVER === 's3' && s3Client) {
          await ensureBucket();
          await Promise.all([
            s3Client.send(
              new PutObjectCommand({
                Bucket: env.S3_BUCKET,
                Key: largePath,
                Body: largeBuffer,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000, immutable',
              })
            ),
            s3Client.send(
              new PutObjectCommand({
                Bucket: env.S3_BUCKET,
                Key: mediumPath,
                Body: mediumBuffer,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000, immutable',
              })
            ),
            s3Client.send(
              new PutObjectCommand({
                Bucket: env.S3_BUCKET,
                Key: thumbPath,
                Body: thumbBuffer,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000, immutable',
              })
            ),
            s3Client.send(
              new PutObjectCommand({
                Bucket: env.S3_BUCKET,
                Key: cardPath,
                Body: cardBuffer,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000, immutable',
              })
            ),
          ]);

          const publicUrl = env.S3_PUBLIC_URL.replace(/\/+$/, '');
          variants = {
            thumbnail: `${publicUrl}/${thumbPath}`,
            card: `${publicUrl}/${cardPath}`,
            medium: `${publicUrl}/${mediumPath}`,
            large: `${publicUrl}/${largePath}`,
          };
          diskPath = `s3://${env.S3_BUCKET}/${relativeDir}`;
        } else {
          const targetDir = path.join(uploadDir, ...relativeDir.split('/'));
          if (!fs.existsSync(targetDir)) {
            await fs.promises.mkdir(targetDir, { recursive: true });
          }

          await Promise.all([
            fs.promises.writeFile(path.join(uploadDir, ...largePath.split('/')), largeBuffer),
            fs.promises.writeFile(path.join(uploadDir, ...mediumPath.split('/')), mediumBuffer),
            fs.promises.writeFile(path.join(uploadDir, ...thumbPath.split('/')), thumbBuffer),
            fs.promises.writeFile(path.join(uploadDir, ...cardPath.split('/')), cardBuffer),
          ]);

          const host = baseUrl || process.env.MEDIA_CDN_URL || 'http://localhost:5000';
          const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;

          variants = {
            thumbnail: `${cleanHost}/uploads/${thumbPath}`,
            card: `${cleanHost}/uploads/${cardPath}`,
            medium: `${cleanHost}/uploads/${mediumPath}`,
            large: `${cleanHost}/uploads/${largePath}`,
          };
          diskPath = targetDir;
        }

        // Update database record status
        await prisma.media.update({
          where: { id: mediaId },
          data: {
            status: 'READY',
            width,
            height,
            focalPoint,
            diskPath,
            variants,
          },
        });

        // Cleanup temporary input file
        await fs.promises.unlink(tempPath).catch(() => {});

        console.log(`[Worker - media-process] Successfully processed Media ID: ${mediaId}`);
        return {
          mediaId,
          status: 'ready',
          width,
          height,
          focalPoint,
          variants,
        };
      } catch (err: any) {
        const maxAttempts = job.opts.attempts || 3;
        const attemptsMade = job.attemptsMade;
        const isFinalAttempt = attemptsMade >= maxAttempts;

        if (!isFinalAttempt) {
          // Transient failure: preserve temporary file so BullMQ can retry with exponential backoff
          console.warn(
            `[Worker - media-process] Attempt ${attemptsMade}/${maxAttempts} failed for Media ID ${mediaId}: ${err.message}. Preserving file for exponential retry.`
          );
          throw err;
        }

        // All retries exhausted: route to Dead Letter Queue (DLQ) and mark FAILED in DB
        console.error(
          `[Worker - media-process] All ${maxAttempts} attempts exhausted for Media ID ${mediaId}. Routing to Dead Letter Queue. Error: ${err.message}`
        );

        // 1. Move to Dead Letter Queue for auditing, troubleshooting & administrative replay
        await mediaDeadLetterQueue
          .add('failed-media-job', {
            originalJobId: job.id,
            mediaId,
            userId,
            tempPath,
            originalName,
            mimeType,
            fileSize,
            resource,
            resourceId,
            mediaType,
            error: err.message,
            stack: err.stack,
            attemptsMade,
            failedAt: new Date().toISOString(),
          })
          .catch((dlqErr) => {
            console.error('[Worker - media-process] Failed to enqueue into Dead Letter Queue:', dlqErr.message);
          });

        // 2. Mark database record as FAILED with error context
        await prisma.media
          .update({
            where: { id: mediaId },
            data: {
              status: 'FAILED',
              errorMessage: err.message?.substring(0, 250) || 'Image processing failed after maximum retries',
            },
          })
          .catch(() => {});

        // 3. Clean up the temp file only after all retries are completed
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath).catch(() => {});
        }

        throw err;
      }
    },
    { connection, concurrency }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker - media-process] Job #${job.id} (Media ${job.data.mediaId}) completed successfully`);
  });

  worker.on('failed', (job, err) => {
    const attemptsMade = job?.attemptsMade || 1;
    const maxAttempts = job?.opts?.attempts || 3;
    if (attemptsMade >= maxAttempts) {
      console.error(
        `[Worker - media-process] Job #${job?.id} (Media ${job?.data?.mediaId}) PERMANENTLY FAILED after ${attemptsMade} attempts: ${err.message}. Routed to DLQ.`
      );
    } else {
      console.warn(
        `[Worker - media-process] Job #${job?.id} failed attempt ${attemptsMade}/${maxAttempts}: ${err.message}. Next attempt will run after backoff.`
      );
    }
  });

  return worker;
}

