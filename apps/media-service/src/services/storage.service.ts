import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Writable } from 'stream';
import { prisma } from '@olx/database';
import { getStorageProvider, generateAssetId, toPublicMediaVariants } from '@olx/shared';
import { env } from '../config/env';
import { validateMagicBytes, sanitizeFilename } from './upload.validator';
import { enqueueMediaProcessing } from './queue.service';

export class MediaStorageService {
  /**
   * Ingests an incoming upload stream:
   * 1. Inspects initial bytes for magic signature validation
   * 2. Computes SHA-256 hash on-the-fly without memory buffering
   * 3. Writes atomically to temp/upload-{assetId}.tmp
   * 4. Persists MediaAsset record in PostgreSQL
   * 5. Enqueues background worker job
   */
  static async handleUpload(
    ownerId: string,
    fileStream: NodeJS.ReadableStream,
    rawFilename: string,
    context?: {
      entityType?: any;
      entityId?: string;
    }
  ) {
    const { cleanName, extension } = sanitizeFilename(rawFilename);
    const assetId = generateAssetId();
    const tempKey = `temp/upload-${assetId}.tmp`;
    const storage = getStorageProvider();
    const tempFullPath = storage.getPath(tempKey);

    const tempDir = path.dirname(tempFullPath);
    if (!fs.existsSync(tempDir)) {
      await fs.promises.mkdir(tempDir, { recursive: true });
    }

    const hash = crypto.createHash('sha256');
    let sizeBytes = 0;
    const initialChunks: Buffer[] = [];
    let initialBytesRead = 0;

    const fileWriteStream = fs.createWriteStream(tempFullPath);

    const inspectingStream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        sizeBytes += chunk.length;
        hash.update(chunk);
        if (initialBytesRead < 4096) {
          const slice = chunk.slice(0, 4096 - initialBytesRead);
          initialChunks.push(slice);
          initialBytesRead += slice.length;
        }
        fileWriteStream.write(chunk, callback);
      },
      final(callback) {
        fileWriteStream.end(callback);
      },
    });

    try {
      await pipeline(fileStream, inspectingStream);
    } catch (err) {
      if (fs.existsSync(tempFullPath)) {
        await fs.promises.unlink(tempFullPath).catch(() => {});
      }
      throw err;
    }

    // Check size limit
    if (sizeBytes > env.MAX_FILE_SIZE_BYTES) {
      if (fs.existsSync(tempFullPath)) {
        await fs.promises.unlink(tempFullPath).catch(() => {});
      }
      throw new Error(`MEDIA_FILE_TOO_LARGE: Upload exceeds maximum allowed limit of ${env.MAX_FILE_SIZE_BYTES} bytes`);
    }

    // Inspect magic bytes
    const initialBuffer = Buffer.concat(initialChunks);
    const magicValidation = validateMagicBytes(initialBuffer);
    if (!magicValidation.valid || !magicValidation.detectedMime) {
      if (fs.existsSync(tempFullPath)) {
        await fs.promises.unlink(tempFullPath).catch(() => {});
      }
      throw new Error('MEDIA_INVALID_FILE: File content signature does not match any permitted media format');
    }

    const detectedMime = magicValidation.detectedMime;
    const checksum = hash.digest('hex');

    // Create record in PostgreSQL
    const asset = await prisma.mediaAsset.create({
      data: {
        id: assetId,
        ownerId,
        entityType: context?.entityType || 'LISTING',
        entityId: context?.entityId || null,
        storageKey: tempKey,
        originalName: cleanName,
        mimeType: detectedMime,
        extension,
        sizeBytes: BigInt(sizeBytes),
        status: 'PROCESSING',
        checksum,
      },
    });

    // Enqueue BullMQ worker job
    await enqueueMediaProcessing({
      assetId,
      ownerId,
      tempStorageKey: tempKey,
      originalName: cleanName,
      mimeType: detectedMime,
      extension,
      checksum,
      sizeBytes,
      entityType: context?.entityType || 'LISTING',
      entityId: context?.entityId,
    });

    return {
      id: asset.id,
      status: 'PROCESSING',
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: Number(asset.sizeBytes),
      checksum: asset.checksum,
      createdAt: asset.createdAt,
    };
  }

  static async getAsset(assetId: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.status === 'DELETED') {
      return null;
    }

    const publicVariants = toPublicMediaVariants(asset.variants as any);

    return {
      id: asset.id,
      ownerId: asset.ownerId,
      entityType: asset.entityType,
      entityId: asset.entityId,
      status: asset.status,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: Number(asset.sizeBytes),
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      variants: publicVariants,
      checksum: asset.checksum,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  static async softDeleteAsset(assetId: string, ownerId?: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) return false;

    if (ownerId && asset.ownerId !== ownerId) {
      throw new Error('MEDIA_ACCESS_DENIED: You do not own this media asset');
    }

    await prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    return true;
  }

  static async restoreAsset(assetId: string, ownerId?: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) return false;

    if (ownerId && asset.ownerId !== ownerId) {
      throw new Error('MEDIA_ACCESS_DENIED: You do not own this media asset');
    }

    await prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: 'READY',
        deletedAt: null,
      },
    });

    return true;
  }

  /**
   * Disk management & metrics
   */
  static async getMetrics() {
    const storage = getStorageProvider();
    const root = storage.getRootDir();

    const counts = await prisma.mediaAsset.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { sizeBytes: true },
    });

    const statusMap: Record<string, { count: number; totalBytes: number }> = {};
    for (const c of counts) {
      statusMap[c.status] = {
        count: c._count._all,
        totalBytes: Number(c._sum.sizeBytes || 0),
      };
    }

    // Measure subdirectories on disk
    const subdirs = ['temp', 'quarantine', 'images', 'videos', 'documents', 'failed', 'trash'];
    const dirStats: Record<string, number> = {};

    for (const sub of subdirs) {
      const full = path.join(root, sub);
      try {
        const files = await fs.promises.readdir(full).catch(() => []);
        dirStats[sub] = files.length;
      } catch {
        dirStats[sub] = 0;
      }
    }

    return {
      storageRoot: root,
      statusCounts: statusMap,
      diskDirectories: dirStats,
    };
  }
}

