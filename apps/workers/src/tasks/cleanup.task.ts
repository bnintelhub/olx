import fs from 'fs';
import path from 'path';
import { getStorageProvider } from '@olx/shared';
import { prisma } from '@olx/database';

/**
 * Periodically deletes files in the temp/ folder older than 24 hours.
 */
export async function cleanupTempFiles(maxAgeHours: number = 24): Promise<number> {
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
 * Periodically checks for MediaAsset records stuck in PROCESSING for more than 2 hours
 * and marks them FAILED.
 */
export async function reconcileStuckMedia(maxAgeHours: number = 2): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  try {
    const stuckRecords = await prisma.mediaAsset.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: cutoff },
      },
      data: {
        status: 'FAILED',
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
 * Starts periodic background housekeeping timers (every hour).
 */
export function startStorageHousekeeping() {
  const ONE_HOUR = 60 * 60 * 1000;

  // Run initial pass on startup
  setTimeout(() => {
    cleanupTempFiles(24);
    cleanupTrashFiles(7);
    reconcileStuckMedia(2);
  }, 10000);

  // Periodic interval
  const timer = setInterval(() => {
    cleanupTempFiles(24);
    cleanupTrashFiles(7);
    reconcileStuckMedia(2);
  }, ONE_HOUR);

  return {
    stop: () => clearInterval(timer),
  };
}

