import path from 'path';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../shared/errors/app-error';
import { delCache } from '../../../config/redis';
import { buildMediaPath, buildMediaDirectory } from '@olx/shared';
import { defaultStorage } from '../../../integrations/storage/storage.adapter';
import { validateImageMagicBytes, getImageDimensions } from '../../../shared/utils/image-validator.util';
import { queueMediaProcessingJob } from '../../../jobs/media.job';
import { deletePhysicalMedia } from '../../admin/admin.media.service';
import { createCategorySchema, updateCategorySchema } from '../categories.schema';
import {
  MAX_CATEGORY_DEPTH,
  slugify,
  generateMediaId,
  formatCategoryImage,
  checkCircularDependency,
  getSubtreeMaxDepth,
  updateSubtreeLevels,
} from './category-utils';

export class CategoryMediaService {
  // Atomic category creation with direct image file upload
  static async createWithFile(fields: any, filePart: any, userId: string, baseUrl?: string) {
    const parsed = createCategorySchema.parse({
      name: fields.name,
      slug: fields.slug || undefined,
      description: fields.description || undefined,
      parentId: fields.parentId && fields.parentId !== '' ? fields.parentId : null,
      sortOrder: fields.sortOrder !== undefined && fields.sortOrder !== '' ? Number(fields.sortOrder) : undefined,
      isActive: fields.isActive !== undefined ? fields.isActive === 'true' || fields.isActive === true : true,
    });

    const normalizedSlug = slugify(parsed.slug || parsed.name);
    let calculatedLevel = 0;
    const parentId = parsed.parentId || null;

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new AppError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Specified parent category does not exist');
      }
      if (!parent.isActive) {
        throw new AppError(400, 'INACTIVE_PARENT_CATEGORY', 'Cannot add child category to an inactive parent');
      }
      calculatedLevel = parent.level + 1;
      if (calculatedLevel >= MAX_CATEGORY_DEPTH) {
        throw new AppError(
          400,
          'MAX_DEPTH_EXCEEDED',
          `Category hierarchy cannot exceed maximum depth of ${MAX_CATEGORY_DEPTH} levels`
        );
      }
    }

    const existing = await prisma.category.findFirst({
      where: { parentId, slug: normalizedSlug },
    });
    if (existing) {
      throw new AppError(400, 'SLUG_EXISTS', `A category with slug "${normalizedSlug}" already exists under this parent`);
    }

    let sortOrder = parsed.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const highestSort = await prisma.category.findFirst({
        where: { parentId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (highestSort?.sortOrder ?? -1) + 1;
    }

    let mediaData: any = null;
    if (filePart) {
      const rawMime = filePart.mimetype || '';
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'].includes(rawMime)) {
        throw new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, WebP, and HEIC images are permitted');
      }
      if (filePart.size > 10 * 1024 * 1024) {
        throw new AppError(400, 'FILE_TOO_LARGE', 'Image exceeds maximum allowed size of 10MB');
      }
      const validated = validateImageMagicBytes(filePart.initialBuffer);
      if (!validated) {
        throw new AppError(400, 'INVALID_FILE_CONTENT', 'File content is not a valid image');
      }
      const dimensions = await getImageDimensions(filePart.initialBuffer, filePart.tempPath);
      if (dimensions && (dimensions.width > 5000 || dimensions.height > 5000)) {
        throw new AppError(
          400,
          'IMAGE_DIMENSIONS_EXCEEDED',
          `Image resolution (${dimensions.width}x${dimensions.height}) exceeds 5000x5000px limit`
        );
      }

      const mediaId = generateMediaId();
      const host = baseUrl || process.env.MEDIA_CDN_URL || 'http://localhost:5000';
      const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;

      const largePath = buildMediaPath({ resource: 'categories', resourceId: mediaId, mediaType: 'icon', mediaId, variant: 'large', format: 'webp' });
      const mediumPath = buildMediaPath({ resource: 'categories', resourceId: mediaId, mediaType: 'icon', mediaId, variant: 'medium', format: 'webp' });
      const thumbnailPath = buildMediaPath({ resource: 'categories', resourceId: mediaId, mediaType: 'icon', mediaId, variant: 'thumbnail', format: 'webp' });
      const cardPath = buildMediaPath({ resource: 'categories', resourceId: mediaId, mediaType: 'icon', mediaId, variant: 'card', format: 'webp' });

      const variants = {
        thumbnail: defaultStorage.buildPublicUrl(thumbnailPath, cleanHost),
        card: defaultStorage.buildPublicUrl(cardPath, cleanHost),
        medium: defaultStorage.buildPublicUrl(mediumPath, cleanHost),
        large: defaultStorage.buildPublicUrl(largePath, cleanHost),
      };
      const diskPath = buildMediaDirectory({ resource: 'categories', resourceId: mediaId, mediaType: 'icon', mediaId });

      mediaData = { mediaId, validated, variants, diskPath, cleanHost };
    }

    const category = await prisma.$transaction(async (tx) => {
      if (mediaData) {
        await tx.mediaAsset.create({
          data: {
            id: mediaData.mediaId,
            ownerId: userId,
            entityType: 'CATEGORY',
            originalName: path.basename(filePart.filename || 'category-icon.jpg'),
            mimeType: mediaData.validated.mimeType,
            extension: path.extname(filePart.filename || '').replace('.', '') || 'jpg',
            sizeBytes: BigInt(filePart.size),
            status: 'PROCESSING',
            storageKey: mediaData.variants.large || `images/${mediaData.mediaId}/original.webp`,
            variants: mediaData.variants,
          },
        });
      }

      const createdCategory = await tx.category.create({
        data: {
          name: parsed.name,
          slug: normalizedSlug,
          description: parsed.description || null,
          parentId,
          sortOrder,
          level: calculatedLevel,
          imageMediaAssetId: mediaData?.mediaId || null,
          isActive: parsed.isActive ?? true,
        },
      });

      if (mediaData) {
        await tx.mediaAsset.update({
          where: { id: mediaData.mediaId },
          data: { entityType: 'CATEGORY', entityId: createdCategory.id },
        }).catch(() => {});
      }

      return tx.category.findUniqueOrThrow({
        where: { id: createdCategory.id },
        include: {
          imageMediaAsset: { select: { id: true, variants: true, storageKey: true } },
        },
      });
    });

    if (mediaData) {
      await queueMediaProcessingJob({
        mediaId: mediaData.mediaId,
        tempPath: filePart.tempPath,
        userId,
        originalName: path.basename(filePart.filename || 'category-icon.jpg'),
        mimeType: mediaData.validated.mimeType,
        fileSize: filePart.size,
        baseUrl: mediaData.cleanHost,
        resource: 'categories',
        resourceId: mediaData.mediaId,
        mediaType: 'icon',
      });
    }

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return {
      ...category,
      image: formatCategoryImage(category),
    };
  }

  // Atomic category update with direct image file upload / replacement
  static async updateWithFile(id: string, fields: any, filePart: any, userId: string, baseUrl?: string) {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { imageMediaAsset: true },
    });
    if (!existing) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const parsed = updateCategorySchema.parse({
      name: fields.name !== undefined ? fields.name : undefined,
      slug: fields.slug !== undefined && fields.slug !== '' ? fields.slug : undefined,
      description: fields.description !== undefined ? fields.description : undefined,
      parentId: fields.parentId !== undefined ? (fields.parentId === '' ? null : fields.parentId) : undefined,
      sortOrder: fields.sortOrder !== undefined && fields.sortOrder !== '' ? Number(fields.sortOrder) : undefined,
      isActive: fields.isActive !== undefined ? fields.isActive === 'true' || fields.isActive === true : undefined,
    });

    const parentId = parsed.parentId !== undefined ? parsed.parentId : existing.parentId;

    if (parentId === id) {
      throw new AppError(400, 'INVALID_PARENT_CATEGORY', 'A category cannot be its own parent');
    }

    if (parentId && parentId !== existing.parentId) {
      const isCircular = await checkCircularDependency(id, parentId);
      if (isCircular) {
        throw new AppError(400, 'CIRCULAR_DEPENDENCY', 'Cannot assign parent: target parent is a descendant of this category');
      }

      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new AppError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Parent category not found');
      }
      if (!parent.isActive && (parsed.isActive === undefined || parsed.isActive === true)) {
        throw new AppError(400, 'INACTIVE_PARENT_CATEGORY', 'Cannot move category under an inactive parent');
      }

      const newLevel = parent.level + 1;
      const subtreeMaxDepth = await getSubtreeMaxDepth(id, newLevel);
      if (subtreeMaxDepth >= MAX_CATEGORY_DEPTH) {
        throw new AppError(400, 'MAX_DEPTH_EXCEEDED', `Moving this branch exceeds maximum depth of ${MAX_CATEGORY_DEPTH} levels`);
      }
    }

    const targetSlug = parsed.slug ? slugify(parsed.slug) : existing.slug;
    if (parsed.slug || parsed.parentId !== undefined) {
      const duplicate = await prisma.category.findFirst({
        where: { parentId, slug: targetSlug, id: { not: id } },
      });
      if (duplicate) {
        throw new AppError(400, 'SLUG_EXISTS', `A category with slug "${targetSlug}" already exists under this parent`);
      }
    }

    let newLevel = existing.level;
    if (parentId !== existing.parentId) {
      if (parentId === null) {
        newLevel = 0;
      } else {
        const parent = await prisma.category.findUnique({ where: { id: parentId } });
        newLevel = (parent?.level ?? 0) + 1;
      }
    }

    let newMediaData: any = null;
    if (filePart) {
      const rawMime = filePart.mimetype || '';
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'].includes(rawMime)) {
        throw new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, WebP, and HEIC images are permitted');
      }
      if (filePart.size > 10 * 1024 * 1024) {
        throw new AppError(400, 'FILE_TOO_LARGE', 'Image exceeds maximum allowed size of 10MB');
      }
      const validated = validateImageMagicBytes(filePart.initialBuffer);
      if (!validated) {
        throw new AppError(400, 'INVALID_FILE_CONTENT', 'File content is not a valid image');
      }
      const dimensions = await getImageDimensions(filePart.initialBuffer, filePart.tempPath);
      if (dimensions && (dimensions.width > 5000 || dimensions.height > 5000)) {
        throw new AppError(
          400,
          'IMAGE_DIMENSIONS_EXCEEDED',
          `Image resolution (${dimensions.width}x${dimensions.height}) exceeds 5000x5000px limit`
        );
      }

      const mediaId = generateMediaId();
      const host = baseUrl || process.env.MEDIA_CDN_URL || 'http://localhost:5000';
      const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;

      const largePath = buildMediaPath({ resource: 'categories', resourceId: mediaId, mediaType: 'icon', mediaId, variant: 'large', format: 'webp' });
      const mediumPath = buildMediaPath({ resource: 'categories', resourceId: mediaId, mediaType: 'icon', mediaId, variant: 'medium', format: 'webp' });
      const thumbnailPath = buildMediaPath({ resource: 'categories', resourceId: mediaId, mediaType: 'icon', mediaId, variant: 'thumbnail', format: 'webp' });
      const cardPath = buildMediaPath({ resource: 'categories', resourceId: mediaId, mediaType: 'icon', mediaId, variant: 'card', format: 'webp' });

      const variants = {
        thumbnail: defaultStorage.buildPublicUrl(thumbnailPath, cleanHost),
        card: defaultStorage.buildPublicUrl(cardPath, cleanHost),
        medium: defaultStorage.buildPublicUrl(mediumPath, cleanHost),
        large: defaultStorage.buildPublicUrl(largePath, cleanHost),
      };
      const diskPath = buildMediaDirectory({ resource: 'categories', resourceId: mediaId, mediaType: 'icon', mediaId });

      newMediaData = { mediaId, validated, variants, diskPath, cleanHost };
    }

    const removeImage = fields.removeImage === 'true' || fields.removeImage === true;

    if ((newMediaData || removeImage) && existing.imageMediaAsset) {
      await deletePhysicalMedia(existing.imageMediaAsset);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (newMediaData) {
        await tx.mediaAsset.create({
          data: {
            id: newMediaData.mediaId,
            ownerId: userId,
            entityType: 'CATEGORY',
            originalName: path.basename(filePart.filename || 'category-icon.jpg'),
            mimeType: newMediaData.validated.mimeType,
            extension: path.extname(filePart.filename || '').replace('.', '') || 'jpg',
            sizeBytes: BigInt(filePart.size),
            status: 'PROCESSING',
            storageKey: newMediaData.variants.large || `images/${newMediaData.mediaId}/original.webp`,
            variants: newMediaData.variants,
          },
        });
      }

      const res = await tx.category.update({
        where: { id },
        data: {
          name: parsed.name !== undefined ? parsed.name : existing.name,
          slug: targetSlug,
          description: parsed.description !== undefined ? parsed.description : existing.description,
          parentId,
          level: newLevel,
          sortOrder: parsed.sortOrder !== undefined ? parsed.sortOrder : existing.sortOrder,
          imageMediaAssetId: newMediaData ? newMediaData.mediaId : (removeImage ? null : existing.imageMediaAssetId),
          isActive: parsed.isActive !== undefined ? parsed.isActive : existing.isActive,
        },
        include: {
          imageMediaAsset: { select: { id: true, variants: true, storageKey: true } },
        },
      });

      if ((newMediaData || removeImage) && existing.imageMediaAssetId) {
        await tx.mediaAsset.delete({ where: { id: existing.imageMediaAssetId } }).catch(() => {});
      }

      if (parentId !== existing.parentId) {
        await updateSubtreeLevels(tx, id, newLevel);
      }

      return res;
    });

    if (newMediaData) {
      await queueMediaProcessingJob({
        mediaId: newMediaData.mediaId,
        tempPath: filePart.tempPath,
        userId,
        originalName: path.basename(filePart.filename || 'category-icon.jpg'),
        mimeType: newMediaData.validated.mimeType,
        fileSize: filePart.size,
        baseUrl: newMediaData.cleanHost,
        resource: 'categories',
        resourceId: newMediaData.mediaId,
        mediaType: 'icon',
      });
    }

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return {
      ...updated,
      image: formatCategoryImage(updated),
    };
  }
}

