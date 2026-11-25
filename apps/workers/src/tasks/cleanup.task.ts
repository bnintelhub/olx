import fs from 'fs';
import path from 'path';
import { getStorageProvider } from '@olx/shared';
import { prisma } from '@olx/database';

/**
 * Periodically deletes files in the temp/ folder older than 1 hour.
 */
export async function cleanupTempFiles(maxAgeHours: number = 1): Promise<number> {
  const storage = getStorageProvider();
  const root = storage.getRootDir();
  const tempDir = path.join(root, 'temp');

  if (!fs.existsSync(tempDir)) return 0;

  const now = Date.now();
  const thresholdMs = maxAgeHours * 60 * 60 * 1000;
  let deletedCount = 0;

  try {
    const files = await fs.promises.readdir(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (now - stats.mtimeMs > thresholdMs) {
          await fs.promises.unlink(filePath);
          deletedCount++;
        }
      } catch {}
    }
  } catch (err) {
    console.error('[CleanupTask] Error cleaning temp files:', err);
  }

  if (deletedCount > 0) {
    console.log(`[CleanupTask] Cleaned up ${deletedCount} expired temporary files.`);
  }
  return deletedCount;
}

/**
 * Periodically deletes files in the trash/ folder older than 7 days.
 */
export async function cleanupTrashFiles(maxAgeDays: number = 7): Promise<number> {
  const storage = getStorageProvider();
  const root = storage.getRootDir();
  const trashDir = path.join(root, 'trash');

  if (!fs.existsSync(trashDir)) return 0;

  const now = Date.now();
  const thresholdMs = maxAgeDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  async function scanAndDelete(dir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanAndDelete(fullPath);
        // Remove empty dir if empty
        const remaining = await fs.promises.readdir(fullPath);
        if (remaining.length === 0) {
          await fs.promises.rmdir(fullPath).catch(() => {});
        }
      } else {
        const stats = await fs.promises.stat(fullPath);
        if (now - stats.mtimeMs > thresholdMs) {
          await fs.promises.unlink(fullPath);
          deletedCount++;
        }
      }
    }
  }

  try {
    await scanAndDelete(trashDir);
  } catch (err) {
    console.error('[CleanupTask] Error cleaning trash files:', err);
  }

  if (deletedCount > 0) {
    console.log(`[CleanupTask] Cleaned up ${deletedCount} expired trash files.`);
  }
  return deletedCount;
}

/**
 * Periodically checks for MediaAsset records stuck in PROCESSING for more than 15 minutes
 * and marks them FAILED to prevent indefinite hung states if worker crashed.
 */
export async function reconcileStuckMedia(maxAgeMinutes: number = 15): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

  try {
    const stuckRecords = await prisma.mediaAsset.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: cutoff },
      },
      data: {
        status: 'FAILED',
        failureReason: 'Worker processing timed out after 15 minutes',
      },
    });

    if (stuckRecords.count > 0) {
      console.log(`[ReconcileTask] Marked ${stuckRecords.count} stuck media assets as FAILED.`);
    }
    return stuckRecords.count;
  } catch (err) {
    console.error('[ReconcileTask] Error reconciling stuck media:', err);
    return 0;
  }
}

/**
 * Identifies and evicts 0-byte or corrupted media assets.
 * 0-byte files cannot be decoded or viewed and are not true image files.
 */
export async function evictZeroByteAndGhostMedia(): Promise<number> {
  const storage = getStorageProvider();
  let evictedCount = 0;

  try {
    // 1. Find assets with sizeBytes <= 0
    const zeroByteAssets = await prisma.mediaAsset.findMany({
      where: {
        sizeBytes: { lte: 0 },
      },
      take: 200,
    });

    for (const asset of zeroByteAssets) {
      // Unlink any listing image relations
      await prisma.adImage.deleteMany({ where: { mediaAssetId: asset.id } }).catch(() => {});

      // Delete physical file remnants if any
      if (asset.storageKey) {
        await storage.delete(asset.storageKey).catch(() => {});
      }

      await prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => {});
      evictedCount++;
    }

    // 2. Scan READY assets where physical file is missing or 0 bytes on local disk
    const readyAssets = await prisma.mediaAsset.findMany({
      where: {
        status: 'READY',
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    for (const asset of readyAssets) {
      if (!asset.storageKey || asset.storageKey.startsWith('http://') || asset.storageKey.startsWith('https://')) {
        continue;
      }

      const fullPath = storage.getPath(asset.storageKey);
      let isCorrupt = false;

      if (!fs.existsSync(fullPath)) {
        isCorrupt = true;
      } else {
        try {
          const stat = fs.statSync(fullPath);
          if (stat.size === 0) isCorrupt = true;
        } catch {
          isCorrupt = true;
        }
      }

      if (isCorrupt) {
        await prisma.adImage.deleteMany({ where: { mediaAssetId: asset.id } }).catch(() => {});
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath).catch(() => {});
        }
        await prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => {});
        evictedCount++;
      }
    }

    if (evictedCount > 0) {
      console.log(`[AutoEviction] Evicted ${evictedCount} 0-byte or corrupted media assets.`);
    }
  } catch (err) {
    console.error('[AutoEviction] Error evicting 0-byte media:', err);
  }

  return evictedCount;
}

/**
 * Periodically auto-evicts permanently failed or unattached orphaned media.
 */
export async function evictFailedAndOrphanedMedia(maxAgeHours: number = 2): Promise<number> {
  const storage = getStorageProvider();
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  let evictedCount = 0;

  try {
    // 1. Evict permanently failed media older than 1 hour
    const failedCutoff = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const failedAssets = await prisma.mediaAsset.findMany({
      where: {
        status: 'FAILED',
        createdAt: { lt: failedCutoff },
      },
      take: 200,
    });

    for (const asset of failedAssets) {
      await prisma.adImage.deleteMany({ where: { mediaAssetId: asset.id } }).catch(() => {});
      if (asset.storageKey) {
        await storage.delete(asset.storageKey).catch(() => {});
      }
      await prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => {});
      evictedCount++;
    }

    // 2. Evict unattached orphaned media older than grace period
    const orphans = await prisma.mediaAsset.findMany({
      where: {
        createdAt: { lt: cutoff },
        categories: { none: {} },
        adImages: { none: {} },
        banners: { none: {} },
        messages: { none: {} },
        NOT: {
          OR: [
            {
              entityType: 'CHAT',
              entityId: { not: null },
            },
            {
              entityType: 'USER',
            },
          ],
        },
      },
      take: 200,
    });

    for (const orphan of orphans) {
      if (orphan.storageKey) {
        await storage.delete(orphan.storageKey).catch(() => {});
      }
      await prisma.mediaAsset.delete({ where: { id: orphan.id } }).catch(() => {});
      evictedCount++;
    }

    if (evictedCount > 0) {
      console.log(`[AutoEviction] Cleaned up ${evictedCount} failed or orphaned media assets.`);
    }
  } catch (err) {
    console.error('[AutoEviction] Error evicting failed and orphaned media:', err);
  }

  return evictedCount;
}

/**
 * Starts periodic background housekeeping and auto-eviction timers (runs every 15 minutes).
 */
export function startStorageHousekeeping() {
  const FIFTEEN_MINUTES = 15 * 60 * 1000;

  // Run initial pass on startup after 10s
  setTimeout(async () => {
    await cleanupTempFiles(1);
    await cleanupTrashFiles(7);
    await reconcileStuckMedia(15);
    await evictZeroByteAndGhostMedia();
    await evictFailedAndOrphanedMedia(2);
  }, 10000);

  // Periodic interval every 15 minutes
  const timer = setInterval(async () => {
    await cleanupTempFiles(1);
    await cleanupTrashFiles(7);
    await reconcileStuckMedia(15);
    await evictZeroByteAndGhostMedia();
    await evictFailedAndOrphanedMedia(2);
  }, FIFTEEN_MINUTES);

  return {
    stop: () => clearInterval(timer),
  };
}

