import crypto from 'crypto';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../shared/errors/app-error';
import { Prisma } from '@prisma/client';
import { toPublicMediaVariants, toPublicMediaUrl } from '../../../shared/utils/media-url.util';

// Maximum allowed nesting depth (0 = Root, 1 = Subcategory, 2 = Brand/Leaf, 3 = Model)
export const MAX_CATEGORY_DEPTH = 4;

// Generates SEO-friendly lowercase hyphenated slug
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generates server-controlled collision-free Media ID
export function generateMediaId(): string {
  const timestamp = Date.now().toString(36);
  const randomHex = crypto.randomBytes(6).toString('hex');
  return `med_${timestamp}${randomHex}`;
}

// Maps database media relation to a unified clean image object
export function formatCategoryImage(category: any) {
  const asset = category.imageMediaAsset || category.imageMedia;
  if (asset) {
    const publicVariants = toPublicMediaVariants(asset.variants);
    return {
      mediaId: asset.id,
      url: publicVariants.large || publicVariants.card || null,
      thumbnailUrl: publicVariants.thumbnail || publicVariants.card || null,
      displayUrl: publicVariants.card || publicVariants.large || null,
      variants: publicVariants,
    };
  }
  if (category.iconUrl) {
    const publicIcon = toPublicMediaUrl(category.iconUrl);
    return {
      mediaId: null,
      url: publicIcon,
      thumbnailUrl: publicIcon,
      displayUrl: publicIcon,
      variants: {},
    };
  }
  return null;
}

// Validates media entity existence, readiness, and image type
export async function validateMediaImage(mediaId: string) {
  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!media) {
    throw new AppError(404, 'MEDIA_NOT_FOUND', `Image media "${mediaId}" does not exist`);
  }
  if (!media.mimeType.startsWith('image/')) {
    throw new AppError(400, 'INVALID_MEDIA_TYPE', 'Category image must be an IMAGE media resource');
  }
  if (media.status !== 'READY') {
    throw new AppError(400, 'MEDIA_NOT_READY', 'Image is still processing. Please wait until ready');
  }
  return media;
}

// Checks whether targetParentId is a descendant of categoryId to prevent circular parent chains
export async function checkCircularDependency(categoryId: string, targetParentId: string): Promise<boolean> {
  let currentId: string | null = targetParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === categoryId) {
      return true;
    }
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const parent: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = parent?.parentId || null;
  }

  return false;
}

// Computes the maximum depth of an existing subtree rooted at categoryId
export async function getSubtreeMaxDepth(categoryId: string, currentLevel: number): Promise<number> {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });

  if (children.length === 0) {
    return currentLevel;
  }

  let maxDepth = currentLevel;
  for (const child of children) {
    const childMax = await getSubtreeMaxDepth(child.id, currentLevel + 1);
    if (childMax > maxDepth) {
      maxDepth = childMax;
    }
  }
  return maxDepth;
}

// Recursively recalculates and updates the level of all children in a subtree
export async function updateSubtreeLevels(
  tx: Prisma.TransactionClient,
  categoryId: string,
  parentLevel: number
) {
  const children = await tx.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });

  const newChildLevel = parentLevel + 1;
  for (const child of children) {
    await tx.category.update({
      where: { id: child.id },
      data: { level: newChildLevel },
    });
    await updateSubtreeLevels(tx, child.id, newChildLevel);
  }
}

