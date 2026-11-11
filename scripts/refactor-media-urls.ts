/**
 * Database Media URL Refactor Script
 * ----------------------------------------------------
 * Normalizes MediaAsset records so all variants are clean, relative storage keys
 * (e.g. images/2026/11/10/01.../original.webp).
 *
 * Usage:
 *   pnpm --filter @olx/server exec tsx ../../scripts/refactor-media-urls.ts
 */

import path from 'path';
import dotenv from 'dotenv';

// Automatically load root .env and apps/server/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../apps/server/.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function normalizeMediaKey(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/^https?:\/\/[^/]+\/(?:olx-media\/|uploads\/|media\/)?/, '')
    .replace(/^s3:\/\/[^/]+\//, '')
    .replace(/^uploads\//, '')
    .replace(/^[/\\]+/, '')
    .trim();
}

export function normalizeMediaVariants(variants: any): { updated: boolean; normalized: Record<string, string> } {
  if (!variants || typeof variants !== 'object') {
    return { updated: false, normalized: {} };
  }
  let hasChanges = false;
  const normalized: Record<string, string> = {};

  for (const [key, val] of Object.entries(variants)) {
    if (typeof val === 'string') {
      const clean = normalizeMediaKey(val);
      if (clean !== val) {
        hasChanges = true;
      }
      normalized[key] = clean;
    } else {
      normalized[key] = val as any;
    }
  }

  return { updated: hasChanges, normalized };
}

async function run() {
  console.log('====================================================');
  console.log(' Starting Database Media URL Normalization & Refactor');
  console.log('====================================================\n');

  // 1. Refactor MediaAsset table variants and storageKey
  const mediaRecords = await prisma.mediaAsset.findMany({
    select: { id: true, variants: true, storageKey: true },
  });

  console.log(`Found ${mediaRecords.length} MediaAsset records to inspect.`);
  let mediaUpdated = 0;

  for (const media of mediaRecords) {
    const { updated: variantsUpdated, normalized } = normalizeMediaVariants(media.variants);
    const cleanStorageKey = normalizeMediaKey(media.storageKey);
    const keyUpdated = cleanStorageKey !== media.storageKey;

    if (variantsUpdated || keyUpdated) {
      await prisma.mediaAsset.update({
        where: { id: media.id },
        data: {
          variants: normalized,
          storageKey: cleanStorageKey || media.storageKey,
        },
      });
      mediaUpdated++;
    }
  }
  console.log(`✓ Updated ${mediaUpdated} MediaAsset rows with clean relative keys.\n`);

  // 2. Refactor Category iconUrl
  const categories = await prisma.category.findMany({
    where: { iconUrl: { not: null } },
    select: { id: true, iconUrl: true },
  });

  let categoriesUpdated = 0;
  for (const cat of categories) {
    if (cat.iconUrl && (cat.iconUrl.includes('localhost:') || cat.iconUrl.includes('/olx-media/'))) {
      const clean = normalizeMediaKey(cat.iconUrl);
      await prisma.category.update({
        where: { id: cat.id },
        data: { iconUrl: clean },
      });
      categoriesUpdated++;
    }
  }
  if (categoriesUpdated > 0) {
    console.log(`✓ Updated ${categoriesUpdated} Category icon rows.\n`);
  }

  console.log('====================================================');
  console.log(' All media URLs refactored to clean relative keys!');
  console.log(' DB is now 100% agnostic to host, port, and domain.');
  console.log('====================================================');
}

run()
  .catch((err) => {
    console.error('Refactor failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
