import crypto from 'crypto';
import path from 'path';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { AttributeType, Prisma } from '@prisma/client';
import { getCache, setCache, delCache } from '../../config/redis';
import { buildMediaPath, buildMediaDirectory } from '@olx/shared';
import { defaultStorage } from '../../integrations/storage/storage.adapter';
import { validateImageMagicBytes, getImageDimensions } from '../../shared/utils/image-validator.util';
import { queueMediaProcessingJob } from '../../jobs/media.job';
import { deletePhysicalMedia } from '../admin/admin.media.service';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  ReorderCategoriesInput,
  createCategorySchema,
  updateCategorySchema,
  createAttributeSchema,
} from './categories.schema';

// Maximum allowed nesting depth (0 = Root, 1 = Subcategory, 2 = Brand/Leaf, 3 = Model)
export const MAX_CATEGORY_DEPTH = 4;

export class CategoriesService {
  // Generates SEO-friendly lowercase hyphenated slug
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Generates server-controlled collision-free Media ID
  private static generateMediaId(): string {
    const timestamp = Date.now().toString(36);
    const randomHex = crypto.randomBytes(6).toString('hex');
    return `med_${timestamp}${randomHex}`;
  }

  // Validates attribute type compatibility with provided selection options
  static validateAttributeTypeOptions(type: AttributeType, options?: string[]) {
    if ((type === AttributeType.SELECT || type === AttributeType.MULTI_SELECT) && (!options || options.length === 0)) {
      throw new AppError(400, 'OPTIONS_REQUIRED', 'Allowed values are required for select and multi-select attributes');
    }
    if (
      (type === AttributeType.TEXT ||
        type === AttributeType.NUMBER ||
        type === AttributeType.BOOLEAN ||
        type === AttributeType.DATE) &&
      options &&
      options.length > 0
    ) {
      throw new AppError(400, 'OPTIONS_NOT_ALLOWED', 'Allowed values are supported only for select and multi-select attributes');
    }
  }

  // Maps database media relation to a unified clean image object
  private static formatCategoryImage(category: any) {
    if (category.imageMedia) {
      const variants = (category.imageMedia.variants as any) || {};
      return {
        mediaId: category.imageMedia.id,
        url: variants.large || variants.card || category.imageMedia.diskPath || null,
        thumbnailUrl: variants.thumbnail || variants.card || null,
        displayUrl: variants.card || variants.large || null,
        variants,
      };
    }
    if (category.iconUrl) {
      // Validate that iconUrl is an actual web URL, not a keyword icon string (e.g. 'smartphone', 'car')
      const isHttp =
        category.iconUrl.startsWith('http://') ||
        category.iconUrl.startsWith('https://') ||
        category.iconUrl.startsWith('/');
      if (isHttp) {
        return {
          mediaId: null,
          url: category.iconUrl,
          thumbnailUrl: category.iconUrl,
          displayUrl: category.iconUrl,
          variants: {},
        };
      }
    }
    return null;
  }

  // Checks whether targetParentId is a descendant of categoryId to prevent circular parent chains
  private static async checkCircularDependency(categoryId: string, targetParentId: string): Promise<boolean> {
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
  private static async getSubtreeMaxDepth(categoryId: string, currentLevel: number): Promise<number> {
    const children = await prisma.category.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    });

    if (children.length === 0) {
      return currentLevel;
    }

    let maxDepth = currentLevel;
    for (const child of children) {
      const childMax = await this.getSubtreeMaxDepth(child.id, currentLevel + 1);
      if (childMax > maxDepth) {
        maxDepth = childMax;
      }
    }
    return maxDepth;
  }

  // Recursively recalculates and updates the level of all children in a subtree
  private static async updateSubtreeLevels(tx: Prisma.TransactionClient, categoryId: string, parentLevel: number) {
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
      await this.updateSubtreeLevels(tx, child.id, newChildLevel);
    }
  }

  // Validates media entity existence, readiness, and image type
  private static async validateMediaImage(mediaId: string) {
    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new AppError(404, 'MEDIA_NOT_FOUND', `Image media "${mediaId}" does not exist`);
    }
    if (media.type !== 'IMAGE') {
      throw new AppError(400, 'INVALID_MEDIA_TYPE', 'Category image must be an IMAGE media resource');
    }
    if (media.status !== 'READY') {
      throw new AppError(400, 'MEDIA_NOT_READY', 'Image is still processing. Please wait until ready');
    }
    return media;
  }

  // Returns flat list of root categories with active subcategories for public navigation
  static async getAll(options?: { includeInactive?: boolean }) {
    const includeInactive = options?.includeInactive ?? false;
    const cacheKey = includeInactive ? 'categories:all:admin' : 'categories:all:public';

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const where: Prisma.CategoryWhereInput = { parentId: null };
    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        imageMedia: { select: { id: true, variants: true, diskPath: true } },
        children: {
          where: includeInactive ? undefined : { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            imageMedia: { select: { id: true, variants: true, diskPath: true } },
          },
        },
        attributes: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const formatted = categories.map((cat) => ({
      ...cat,
      image: this.formatCategoryImage(cat),
      children: cat.children.map((sub) => ({
        ...sub,
        image: this.formatCategoryImage(sub),
      })),
    }));

    await setCache(cacheKey, formatted, 600);
    return formatted;
  }

  // Builds an arbitrarily deep hierarchical tree filtered by active status
  static async getTree(options?: { includeInactive?: boolean }) {
    const includeInactive = options?.includeInactive ?? false;
    const cacheKey = includeInactive ? 'categories:tree:admin' : 'categories:tree:public';

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // Fetch all categories in one query to construct tree in-memory (O(N) vs nested recursive SQL)
    const allCategories = await prisma.category.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        imageMedia: { select: { id: true, variants: true, diskPath: true } },
        attributes: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { ads: { where: { deletedAt: null } } } },
      },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Map each category to include unified image and empty children array
    const categoryMap = new Map<string, any>();
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        parentId: cat.parentId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sortOrder: cat.sortOrder,
        level: cat.level,
        isActive: cat.isActive,
        imageMediaId: cat.imageMediaId,
        image: this.formatCategoryImage(cat),
        adsCount: cat._count.ads,
        attributes: cat.attributes,
        children: [],
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      });
    });

    // Assemble hierarchical tree
    const rootCategories: any[] = [];
    categoryMap.forEach((node) => {
      if (!node.parentId) {
        rootCategories.push(node);
      } else {
        const parent = categoryMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        } else if (includeInactive) {
          // If parent is filtered out in public view, attach only in admin mode
          rootCategories.push(node);
        }
      }
    });

    await setCache(cacheKey, rootCategories, 600);
    return rootCategories;
  }

  // Retrieves category by slug including parent lineage (breadcrumbs) and child subcategories
  static async getBySlug(slug: string, options?: { parentId?: string; includeInactive?: boolean }) {
    const where: Prisma.CategoryWhereInput = { slug };
    if (options?.parentId !== undefined) {
      where.parentId = options.parentId;
    }
    if (!options?.includeInactive) {
      where.isActive = true;
    }

    const category = await prisma.category.findFirst({
      where,
      include: {
        imageMedia: { select: { id: true, variants: true, diskPath: true } },
        parent: {
          include: {
            parent: true,
            imageMedia: { select: { id: true, variants: true, diskPath: true } },
          },
        },
        children: {
          where: options?.includeInactive ? undefined : { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            imageMedia: { select: { id: true, variants: true, diskPath: true } },
          },
        },
        attributes: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', `Category with slug "${slug}" not found`);
    }

    // Build breadcrumb lineage
    const breadcrumbs: Array<{ id: string; name: string; slug: string; level: number }> = [];
    let currentAncestor: any = category.parent;
    while (currentAncestor) {
      breadcrumbs.unshift({
        id: currentAncestor.id,
        name: currentAncestor.name,
        slug: currentAncestor.slug,
        level: currentAncestor.level,
      });
      currentAncestor = currentAncestor.parent;
    }

    return {
      ...category,
      image: this.formatCategoryImage(category),
      breadcrumbs,
      children: category.children.map((child) => ({
        ...child,
        image: this.formatCategoryImage(child),
      })),
    };
  }

  // Traverses ancestors to collect and merge dynamic specifications inherited by children
  static async getAttributes(categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { attributes: { orderBy: { displayOrder: 'asc' } } },
    });

    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    // Walk up the ancestor tree collecting attributes
    const ancestorAttributes: any[] = [];
    let currentParentId = category.parentId;

    while (currentParentId) {
      const parent = await prisma.category.findUnique({
        where: { id: currentParentId },
        include: { attributes: { orderBy: { displayOrder: 'asc' } } },
      });
      if (!parent) break;

      ancestorAttributes.unshift(...parent.attributes);
      currentParentId = parent.parentId;
    }

    // Child attributes override ancestor attributes with identical key
    const attrMap = new Map<string, any>();
    ancestorAttributes.forEach((attr) => attrMap.set(attr.key, attr));
    category.attributes.forEach((attr) => attrMap.set(attr.key, attr));

    const merged = Array.from(attrMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);

    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        level: category.level,
      },
      attributes: merged,
    };
  }

  // Creates a category enforcing depth limits, slug uniqueness per parent, and media attachment
  static async create(input: CreateCategoryInput) {
    const normalizedSlug = this.slugify(input.slug || input.name);
    if (!normalizedSlug) {
      throw new AppError(400, 'INVALID_SLUG', 'Category slug cannot be empty');
    }

    let calculatedLevel = 0;
    const parentId = input.parentId || null;

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

    // Check slug uniqueness among siblings under the same parent
    const existing = await prisma.category.findFirst({
      where: { parentId, slug: normalizedSlug },
    });
    if (existing) {
      throw new AppError(
        400,
        'SLUG_EXISTS',
        `A category with slug "${normalizedSlug}" already exists under this parent`
      );
    }

    // Determine default sortOrder as next available sibling sequence if not provided
    let sortOrder = input.sortOrder;
    if (sortOrder === 0) {
      const highestSort = await prisma.category.findFirst({
        where: { parentId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (highestSort?.sortOrder ?? -1) + 1;
    }

    // Verify media asset if provided
    if (input.imageMediaId) {
      await this.validateMediaImage(input.imageMediaId);
    }

    // Execute category creation and media link in an atomic transaction
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          name: input.name,
          slug: normalizedSlug,
          description: input.description || null,
          parentId,
          sortOrder,
          level: calculatedLevel,
          imageMediaId: input.imageMediaId || null,
          iconUrl: input.iconUrl || null,
          isActive: input.isActive ?? true,
        },
        include: {
          imageMedia: { select: { id: true, variants: true, diskPath: true } },
        },
      });

      // Bind media reference
      if (input.imageMediaId) {
        await tx.media.update({
          where: { id: input.imageMediaId },
          data: {
            isAttached: true,
            attachedToId: created.id,
            scope: 'CATEGORY_BANNER',
          },
        });
      }

      return created;
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return {
      ...category,
      image: this.formatCategoryImage(category),
    };
  }

  // Updates category attributes, prevents circular hierarchies, and cascades level shifts
  static async update(id: string, input: UpdateCategoryInput) {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { imageMedia: true },
    });
    if (!existing) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const parentId = input.parentId !== undefined ? input.parentId : existing.parentId;

    // Prevent direct self-parenting
    if (parentId === id) {
      throw new AppError(400, 'INVALID_PARENT_CATEGORY', 'A category cannot be its own parent');
    }

    // Prevent circular ancestor-descendant loop
    if (parentId && parentId !== existing.parentId) {
      const isCircular = await this.checkCircularDependency(id, parentId);
      if (isCircular) {
        throw new AppError(
          400,
          'CIRCULAR_DEPENDENCY',
          'Cannot assign parent: target parent is a descendant of this category'
        );
      }

      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new AppError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Parent category not found');
      }
      if (!parent.isActive && (input.isActive === undefined || input.isActive === true)) {
        throw new AppError(400, 'INACTIVE_PARENT_CATEGORY', 'Cannot move category under an inactive parent');
      }

      const newLevel = parent.level + 1;
      const subtreeMaxDepth = await this.getSubtreeMaxDepth(id, newLevel);
      if (subtreeMaxDepth >= MAX_CATEGORY_DEPTH) {
        throw new AppError(
          400,
          'MAX_DEPTH_EXCEEDED',
          `Moving this branch would exceed maximum hierarchy depth of ${MAX_CATEGORY_DEPTH} levels`
        );
      }
    }

    // Check slug uniqueness under target parent if slug or parent changed
    const targetSlug = input.slug ? this.slugify(input.slug) : existing.slug;
    if (input.slug || input.parentId !== undefined) {
      const duplicate = await prisma.category.findFirst({
        where: {
          parentId,
          slug: targetSlug,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new AppError(400, 'SLUG_EXISTS', `A category with slug "${targetSlug}" already exists under this parent`);
      }
    }

    // Verify replacement media asset if provided
    if (input.imageMediaId && input.imageMediaId !== existing.imageMediaId) {
      await this.validateMediaImage(input.imageMediaId);
    }

    // Calculate level adjustment
    let newLevel = existing.level;
    if (parentId !== existing.parentId) {
      if (parentId === null) {
        newLevel = 0;
      } else {
        const parent = await prisma.category.findUnique({ where: { id: parentId } });
        newLevel = (parent?.level ?? 0) + 1;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Detach old media if imageMediaId changed
      if (input.imageMediaId !== undefined && input.imageMediaId !== existing.imageMediaId && existing.imageMediaId) {
        await tx.media.update({
          where: { id: existing.imageMediaId },
          data: { isAttached: false, attachedToId: null, scope: 'UNATTACHED' },
        });
      }

      // Attach new media
      if (input.imageMediaId && input.imageMediaId !== existing.imageMediaId) {
        await tx.media.update({
          where: { id: input.imageMediaId },
          data: { isAttached: true, attachedToId: id, scope: 'CATEGORY_BANNER' },
        });
      }

      const res = await tx.category.update({
        where: { id },
        data: {
          name: input.name !== undefined ? input.name : existing.name,
          slug: targetSlug,
          description: input.description !== undefined ? input.description : existing.description,
          parentId,
          level: newLevel,
          sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sortOrder,
          imageMediaId: input.imageMediaId !== undefined ? input.imageMediaId : existing.imageMediaId,
          iconUrl: input.iconUrl !== undefined ? input.iconUrl : existing.iconUrl,
          isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
        },
        include: {
          imageMedia: { select: { id: true, variants: true, diskPath: true } },
        },
      });

      // Update descendant levels if parent changed
      if (parentId !== existing.parentId) {
        await this.updateSubtreeLevels(tx, id, newLevel);
      }

      return res;
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return {
      ...updated,
      image: this.formatCategoryImage(updated),
    };
  }

  // Atomic category creation with direct image file upload (all-or-nothing consistency)
  static async createWithFile(fields: any, filePart: any, userId: string, baseUrl?: string) {
    const parsed = createCategorySchema.parse({
      name: fields.name,
      slug: fields.slug || undefined,
      description: fields.description || undefined,
      parentId: fields.parentId && fields.parentId !== '' ? fields.parentId : null,
      sortOrder: fields.sortOrder !== undefined && fields.sortOrder !== '' ? Number(fields.sortOrder) : 0,
      isActive: fields.isActive !== undefined ? fields.isActive === 'true' || fields.isActive === true : true,
    });

    const normalizedSlug = this.slugify(parsed.slug || parsed.name);
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
    if (sortOrder === 0) {
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

      const mediaId = this.generateMediaId();
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

      mediaData = {
        mediaId,
        validated,
        variants,
        diskPath,
        cleanHost,
      };
    }

    const category = await prisma.$transaction(async (tx) => {
      // Create Media record first to satisfy foreign key constraint on category.imageMediaId
      if (mediaData) {
        await tx.media.create({
          data: {
            id: mediaData.mediaId,
            userId,
            type: 'IMAGE',
            status: 'PROCESSING',
            scope: 'CATEGORY_BANNER',
            originalName: path.basename(filePart.filename || 'category-icon.jpg'),
            mimeType: mediaData.validated.mimeType,
            fileSize: filePart.size,
            diskPath: mediaData.diskPath,
            variants: mediaData.variants,
            isAttached: true,
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
          imageMediaId: mediaData?.mediaId || null,
          isActive: parsed.isActive ?? true,
        },
      });

      if (mediaData) {
        // Link media to the created category ID
        await tx.media.update({
          where: { id: mediaData.mediaId },
          data: { attachedToId: createdCategory.id },
        });
      }

      return tx.category.findUniqueOrThrow({
        where: { id: createdCategory.id },
        include: {
          imageMedia: { select: { id: true, variants: true, diskPath: true } },
        },
      });
    });

    // Queue BullMQ job AFTER transaction commits — prevents the worker from racing with
    // an uncommitted media record (which would cause "Record not found" and stuck PROCESSING state)
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
      image: this.formatCategoryImage(category),
    };
  }

  // Atomic category update with direct image file upload / replacement (all-or-nothing consistency)
  static async updateWithFile(id: string, fields: any, filePart: any, userId: string, baseUrl?: string) {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { imageMedia: true },
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
      const isCircular = await this.checkCircularDependency(id, parentId);
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
      const subtreeMaxDepth = await this.getSubtreeMaxDepth(id, newLevel);
      if (subtreeMaxDepth >= MAX_CATEGORY_DEPTH) {
        throw new AppError(400, 'MAX_DEPTH_EXCEEDED', `Moving this branch exceeds maximum depth of ${MAX_CATEGORY_DEPTH} levels`);
      }
    }

    const targetSlug = parsed.slug ? this.slugify(parsed.slug) : existing.slug;
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

      const mediaId = this.generateMediaId();
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

      newMediaData = {
        mediaId,
        validated,
        variants,
        diskPath,
        cleanHost,
      };
    }

    const removeImage = fields.removeImage === 'true' || fields.removeImage === true;

    if ((newMediaData || removeImage) && existing.imageMedia) {
      await deletePhysicalMedia(existing.imageMedia);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Create new Media row first so foreign key constraint is satisfied on category update
      if (newMediaData) {
        await tx.media.create({
          data: {
            id: newMediaData.mediaId,
            userId,
            type: 'IMAGE',
            status: 'PROCESSING',
            scope: 'CATEGORY_BANNER',
            originalName: path.basename(filePart.filename || 'category-icon.jpg'),
            mimeType: newMediaData.validated.mimeType,
            fileSize: filePart.size,
            diskPath: newMediaData.diskPath,
            variants: newMediaData.variants,
            isAttached: true,
            attachedToId: id,
          },
        });
      }

      // 2. Update category referencing the new mediaId or null
      const res = await tx.category.update({
        where: { id },
        data: {
          name: parsed.name !== undefined ? parsed.name : existing.name,
          slug: targetSlug,
          description: parsed.description !== undefined ? parsed.description : existing.description,
          parentId,
          level: newLevel,
          sortOrder: parsed.sortOrder !== undefined ? parsed.sortOrder : existing.sortOrder,
          imageMediaId: newMediaData ? newMediaData.mediaId : (removeImage ? null : existing.imageMediaId),
          isActive: parsed.isActive !== undefined ? parsed.isActive : existing.isActive,
        },
        include: {
          imageMedia: { select: { id: true, variants: true, diskPath: true } },
        },
      });

      // 3. Delete previous media record now that category no longer references it
      if ((newMediaData || removeImage) && existing.imageMediaId) {
        await tx.media.delete({ where: { id: existing.imageMediaId } }).catch(() => {});
      }

      if (parentId !== existing.parentId) {
        await this.updateSubtreeLevels(tx, id, newLevel);
      }

      return res;
    });

    // Queue BullMQ job AFTER transaction commits — prevents the worker from racing with
    // an uncommitted media record (which causes "Record not found" and stuck PROCESSING state)
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
      image: this.formatCategoryImage(updated),
    };
  }

  // Atomically reorders sibling categories to avoid sort collisions
  static async reorder(input: ReorderCategoriesInput) {
    const ids = input.items.map((i) => i.id);

    // Verify all categories exist
    const categories = await prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, parentId: true },
    });

    if (categories.length !== ids.length) {
      throw new AppError(400, 'INVALID_CATEGORY_IDS', 'One or more category IDs are invalid');
    }

    await prisma.$transaction(
      input.items.map((item) =>
        prisma.category.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return { success: true, count: input.items.length };
  }

  // Toggles active state; cascading deactivation down all descendant categories
  static async toggleActive(id: string, isActive: boolean) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    // Prevent activating a child whose parent is inactive
    if (isActive && category.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: category.parentId } });
      if (parent && !parent.isActive) {
        throw new AppError(400, 'INACTIVE_PARENT_CATEGORY', 'Cannot activate child category while parent is inactive');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.category.update({
        where: { id },
        data: { isActive },
      });

      // If deactivating, cascade deactivation to all descendants
      if (!isActive) {
        const cascadeDeactivate = async (catId: string) => {
          const children = await tx.category.findMany({
            where: { parentId: catId },
            select: { id: true },
          });
          if (children.length > 0) {
            await tx.category.updateMany({
              where: { parentId: catId },
              data: { isActive: false },
            });
            for (const child of children) {
              await cascadeDeactivate(child.id);
            }
          }
        };
        await cascadeDeactivate(id);
      }

      return res;
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return updated;
  }

  // Deletion guard: blocks deletion if subcategories exist or active listings reference this category
  static async delete(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { imageMedia: true },
    });
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    // Guard 1: Subcategories check
    const childCount = await prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new AppError(
        409,
        'CATEGORY_HAS_CHILDREN',
        `Cannot delete category with ${childCount} subcategory(s). Move or delete subcategories first.`
      );
    }

    // Guard 2: Active marketplace listings check
    const activeAdsCount = await prisma.ad.count({
      where: {
        categoryId: id,
        status: { in: ['ACTIVE', 'PENDING_REVIEW'] },
        deletedAt: null,
      },
    });
    if (activeAdsCount > 0) {
      throw new AppError(
        409,
        'CATEGORY_IN_USE',
        `Cannot delete category referenced by ${activeAdsCount} active listing(s). Deactivate it instead.`
      );
    }

    await prisma.$transaction(async (tx) => {
      // Detach media reference
      if (category.imageMediaId) {
        await tx.media.update({
          where: { id: category.imageMediaId },
          data: { isAttached: false, attachedToId: null, scope: 'UNATTACHED' },
        });
      }

      // Remove category attributes and category itself
      await tx.categoryAttribute.deleteMany({ where: { categoryId: id } });
      await tx.category.delete({ where: { id } });
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return category;
  }

  // Adds a dynamic specification attribute to a category
  static async addAttribute(categoryId: string, body: any) {
    this.validateAttributeTypeOptions(body.type, body.options);

    const attribute = await prisma.categoryAttribute.create({
      data: {
        categoryId,
        name: body.name,
        key: body.key,
        displayLabel: body.displayLabel,
        type: body.type,
        options: body.options ? body.options : undefined,
        validationRules: body.validationRules,
        isRequired: body.isRequired,
        isFilterable: body.isFilterable,
        unit: body.unit,
        displayOrder: body.displayOrder,
      },
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return attribute;
  }

  // Updates an existing specification attribute
  static async updateAttribute(attrId: string, body: any) {
    if (body.type || body.options) {
      const existing = await prisma.categoryAttribute.findUnique({ where: { id: attrId } });
      if (!existing) throw new AppError(404, 'ATTRIBUTE_NOT_FOUND', 'Attribute not found');
      this.validateAttributeTypeOptions(body.type || existing.type, body.options || (existing.options as string[]));
    }

    const attribute = await prisma.categoryAttribute.update({
      where: { id: attrId },
      data: body,
    });

    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return attribute;
  }

  // Removes a dynamic specification attribute
  static async deleteAttribute(attrId: string) {
    const attribute = await prisma.categoryAttribute.delete({ where: { id: attrId } });
    await delCache('categories:all:public', 'categories:all:admin', 'categories:tree:public', 'categories:tree:admin');
    return attribute;
  }
}
