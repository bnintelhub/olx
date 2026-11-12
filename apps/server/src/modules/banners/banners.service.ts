import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { MultipartFile } from '@fastify/multipart';
import { prisma } from '../../config/prisma';
import { toPublicMediaUrl } from '../../shared/utils/media-url.util';
import { resolveUploadDir } from '../../integrations/storage/storage.adapter';
import { AppError } from '../../shared/errors/app-error';
import { CreateBannerInput, UpdateBannerInput, QueryBannersInput, AdminQueryBannersInput } from './banners.schema';

export class BannersService {
  /**
   * Upload direct image (max 10MB) or video (max 50MB) for banner directly on main server
   */
  static async uploadBannerMedia(file: MultipartFile) {
    if (!file) {
      throw new AppError(400, 'NO_FILE_PROVIDED', 'No file was provided');
    }

    const mime = file.mimetype.toLowerCase();
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');

    if (!isImage && !isVideo) {
      throw new AppError(
        400,
        'INVALID_MEDIA_TYPE',
        'Only standard images (JPEG, PNG, WebP, GIF, AVIF) or videos (MP4, WebM, MOV) are allowed'
      );
    }

    const buffer = await file.toBuffer();
    const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (buffer.length > maxBytes) {
      const limitStr = isVideo ? '50MB' : '10MB';
      throw new AppError(
        400,
        'FILE_TOO_LARGE',
        `${isVideo ? 'Video' : 'Image'} exceeds maximum limit of ${limitStr}`
      );
    }

    const mediaRoot = resolveUploadDir();
    const bannersDir = path.join(mediaRoot, 'banners');
    if (!fs.existsSync(bannersDir)) {
      fs.mkdirSync(bannersDir, { recursive: true });
    }

    const originalExt = path.extname(file.filename) || (isVideo ? '.mp4' : '.webp');
    const safeExt = originalExt.startsWith('.') ? originalExt.toLowerCase() : `.${originalExt.toLowerCase()}`;
    const fileName = `banner-${randomUUID()}${safeExt}`;
    const filePath = path.join(bannersDir, fileName);

    await fs.promises.writeFile(filePath, buffer);

    const relativeUrl = `/media/banners/${fileName}`;
    return {
      url: relativeUrl,
      publicUrl: toPublicMediaUrl(relativeUrl),
      mediaType: isVideo ? ('VIDEO' as const) : ('IMAGE' as const),
      mimeType: mime,
      sizeBytes: buffer.length,
    };
  }
  /**
   * Normalizes banner media paths to public URLs
   */
  private static formatBanner(banner: any) {
    const impressions = banner.impressions || 0;
    const clicks = banner.clicks || 0;
    const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;

    const desktopUrl = banner.desktopMediaUrl
      ? toPublicMediaUrl(banner.desktopMediaUrl)
      : banner.imageMediaAsset?.storageKey
        ? toPublicMediaUrl(banner.imageMediaAsset.storageKey)
        : null;

    const mobileUrl = banner.mobileMediaUrl
      ? toPublicMediaUrl(banner.mobileMediaUrl)
      : desktopUrl;

    return {
      ...banner,
      desktopMediaUrl: desktopUrl,
      mobileMediaUrl: mobileUrl,
      ctr,
    };
  }

  /**
   * Retrieves active, scheduled banners for client rendering
   */
  static async getActiveBanners(query: QueryBannersInput) {
    const now = new Date();

    const banners = await prisma.banner.findMany({
      where: {
        position: query.position || 'HOME_HERO',
        isActive: true,
        status: 'ACTIVE',
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [
          { cityId: null },
          ...(query.cityId ? [{ cityId: query.cityId }] : []),
        ],
      },
      include: {
        imageMediaAsset: true,
      },
      orderBy: [
        { priority: 'desc' },
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    return banners.map((b) => this.formatBanner(b));
  }

  /**
   * Atomic impression tracking
   */
  static async recordImpression(bannerId: string) {
    try {
      await prisma.banner.update({
        where: { id: bannerId },
        data: { impressions: { increment: 1 } },
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Atomic click tracking
   */
  static async recordClick(bannerId: string) {
    try {
      const banner = await prisma.banner.update({
        where: { id: bannerId },
        data: { clicks: { increment: 1 } },
        select: { targetUrl: true },
      });
      return { success: true, targetUrl: banner.targetUrl };
    } catch {
      return { success: false };
    }
  }

  /**
   * Admin paginated list with real-time computed CTR and status derivation
   */
  static async getAdminBanners(query: AdminQueryBannersInput) {
    const now = new Date();
    const where: any = {};

    if (query.status && query.status !== 'ALL') {
      if (query.status === 'EXPIRED') {
        where.endsAt = { lt: now };
      } else {
        where.status = query.status;
      }
    }

    if (query.search && query.search.trim() !== '') {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { subtitle: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, banners] = await Promise.all([
      prisma.banner.count({ where }),
      prisma.banner.findMany({
        where,
        include: { imageMediaAsset: true },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    const formatted = banners.map((b) => {
      let derivedStatus = b.status;
      if (b.endsAt < now) {
        derivedStatus = 'EXPIRED';
      } else if (b.startsAt > now) {
        derivedStatus = 'SCHEDULED';
      }

      return {
        ...this.formatBanner(b),
        computedStatus: derivedStatus,
      };
    });

    return {
      items: formatted,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  /**
   * Admin Banner creation
   */
  static async createBanner(input: CreateBannerInput) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (endsAt <= startsAt) {
      throw new AppError(400, 'BANNER_INVALID_DATES', 'End time must be after start time');
    }

    const created = await prisma.banner.create({
      data: {
        title: input.title,
        subtitle: input.subtitle,
        ctaText: input.ctaText,
        targetUrl: input.targetUrl,
        position: input.position || 'HOME_HERO',
        mediaType: input.mediaType || 'IMAGE',
        desktopMediaUrl: input.desktopMediaUrl,
        mobileMediaUrl: input.mobileMediaUrl,
        imageMediaAssetId: input.imageMediaAssetId,
        cityId: input.cityId,
        categoryId: input.categoryId,
        locationText: input.locationText,
        categoryText: input.categoryText,
        priority: input.priority || 0,
        displayOrder: input.displayOrder || 0,
        status: input.status || 'ACTIVE',
        isActive: input.isActive ?? true,
        startsAt,
        endsAt,
      },
      include: { imageMediaAsset: true },
    });

    return this.formatBanner(created);
  }

  /**
   * Admin Banner update
   */
  static async updateBanner(id: string, input: UpdateBannerInput) {
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found');
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt;

    if (endsAt <= startsAt) {
      throw new AppError(400, 'BANNER_INVALID_DATES', 'End time must be after start time');
    }

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        ...input,
        startsAt,
        endsAt,
      },
      include: { imageMediaAsset: true },
    });

    return this.formatBanner(updated);
  }

  /**
   * Admin toggle pause/resume status
   */
  static async toggleStatus(id: string, status?: string) {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found');

    const newStatus = status || (banner.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
    const updated = await prisma.banner.update({
      where: { id },
      data: {
        status: newStatus,
        isActive: newStatus === 'ACTIVE',
      },
    });

    return this.formatBanner(updated);
  }

  /**
   * Admin banner deletion
   */
  static async deleteBanner(id: string) {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found');

    await prisma.banner.delete({ where: { id } });
    return { success: true, message: 'Banner deleted successfully' };
  }
}
