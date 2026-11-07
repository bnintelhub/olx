import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { AdStatus } from '@prisma/client';
import { checkContentForFraud } from '../../shared/utils/anti-fraud.util';
import { CreateListingInput, UpdateListingInput } from './listings.schema';
import { processListingImagesJob } from '../../jobs/image-processing.job';
import { SETTING_DEFAULTS } from '../../config/constants';
import { RevenueService } from '../revenue/revenue.service';

export class ListingsService {
  private static slugify(text: string): string {
    return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  static async create(userId: string, data: CreateListingInput) {
    // Dynamic revenue policy enforcement (e.g. 5 free ads/month or active paid credits)
    await RevenueService.assertListingAllowed(userId);

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
      include: { attributes: true, parent: { include: { attributes: true } } },
    });
    if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Selected category does not exist');

    // Robust location resolution by ID, slug, or fallback city
    let location = await prisma.location.findFirst({
      where: {
        OR: [
          { id: data.locationId },
          { slug: data.locationId.toLowerCase() },
          { name: { equals: data.locationId, mode: 'insensitive' } },
        ],
      },
    });
    if (!location) {
      location =
        (await prisma.location.findFirst({ where: { OR: [{ slug: 'patna' }, { type: 'CITY', isActive: true }] } })) ||
        (await prisma.location.create({ data: { name: 'Patna', slug: 'patna', type: 'CITY', latitude: 25.5941, longitude: 85.1376 } }));
    }

    // Dynamic attributes verification
    const allCategoryAttributes = [
      ...(category.parent?.attributes || []),
      ...category.attributes,
    ];

    for (const attr of allCategoryAttributes) {
      if (attr.isRequired && (data.attributes[attr.key] === undefined || data.attributes[attr.key] === '')) {
        throw new AppError(
          400,
          'MISSING_REQUIRED_ATTRIBUTE',
          `The specification "${attr.name}" is required for ${category.name}.`
        );
      }
    }
    const shortId = Math.random().toString(36).substring(2, 8);
    const baseSlug = this.slugify(data.title);
    const slug = `${baseSlug}-${shortId}`;
    const latitude = data.latitude || location.latitude;
    const longitude = data.longitude || location.longitude;

    const fraudResult = checkContentForFraud(data.title, data.description);
    const initialStatus = fraudResult.isFlagged ? AdStatus.PENDING_REVIEW : AdStatus.ACTIVE;
    const rejectionReason = fraudResult.isFlagged ? fraudResult.reasons.join('; ') : null;

    const expiresAt = new Date(Date.now() + (SETTING_DEFAULTS.listingExpiryDays as number) * 24 * 60 * 60 * 1000);

    // Verify media IDs ownership and status if mediaId is supplied
    const mediaIds = (data.images || [])
      .map((i) => i.mediaId)
      .filter(Boolean) as string[];

    let userMediaList: any[] = [];
    if (mediaIds.length > 0) {
      userMediaList = await prisma.media.findMany({
        where: {
          id: { in: mediaIds },
          userId,
        },
      });

      if (userMediaList.length !== mediaIds.length) {
        throw new AppError(
          400,
          'INVALID_MEDIA_ID',
          'One or more specified image IDs do not exist or do not belong to you'
        );
      }

      const failedMedia = userMediaList.filter((m) => m.status === 'FAILED');
      if (failedMedia.length > 0) {
        throw new AppError(
          400,
          'MEDIA_FAILED',
          'One or more uploaded images failed processing. Please remove and re-upload them.'
        );
      }
    }

    const ad = await prisma.$transaction(async (tx) => {
      const createdAd = await tx.ad.create({
        data: {
          userId,
          categoryId: data.categoryId,
          locationId: location.id,
          title: data.title,
          slug,
          description: fraudResult.sanitizedDescription,
          price: data.price,
          isNegotiable: data.isNegotiable,
          status: initialStatus,
          rejectionReason,
          contactPreference: data.contactPreference,
          latitude,
          longitude,
          expiresAt,
          attributesCache: data.attributes,
        },
      });

      if (data.images && data.images.length > 0) {
        const imageRows = data.images.map((img, idx) => {
          const media = img.mediaId ? userMediaList.find((m) => m.id === img.mediaId) : null;
          const variants = (media?.variants as any) || {};
          const fallback = img.url || media?.diskPath || '';
          return {
            adId: createdAd.id,
            mediaId: img.mediaId || null,
            originalUrl: variants.large || variants.card || fallback,
            displayUrl: variants.card || variants.large || fallback,
            thumbnailUrl: variants.thumbnail || variants.card || fallback,
            sortOrder: img.sortOrder !== undefined ? img.sortOrder : idx,
            isCover: img.isCover !== undefined ? img.isCover : idx === 0,
          };
        });

        await tx.adImage.createMany({ data: imageRows });

        // Mark referenced media as attached in atomic transaction
        if (mediaIds.length > 0) {
          await tx.media.updateMany({
            where: { id: { in: mediaIds } },
            data: {
              isAttached: true,
              attachedToId: createdAd.id,
              scope: 'LISTING_IMAGE',
            },
          });
        }
      }

      for (const [key, val] of Object.entries(data.attributes)) {
        const matchedAttr = allCategoryAttributes.find((a) => a.key === key);
        if (matchedAttr && val !== undefined && val !== null) {
          await tx.adAttributeValue.create({
            data: {
              adId: createdAd.id,
              attributeId: matchedAttr.id,
              value: String(val),
            },
          });
        }
      }

      return createdAd;
    });

    // Trigger legacy async image processing job for raw URLs
    const legacyUrls = (data.images || [])
      .map((i) => i.url)
      .filter((u): u is string => Boolean(u));
    if (legacyUrls.length > 0) {
      void processListingImagesJob(ad.id, legacyUrls);
    }

    return prisma.ad.findUnique({
      where: { id: ad.id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  static async getById(id: string) {
    const ad = await prisma.ad.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            latitude: true,
            longitude: true,
            parent: { select: { id: true, name: true, slug: true, latitude: true, longitude: true } },
          },
        },
        images: { orderBy: { sortOrder: 'asc' } },
        attributeValues: {
          include: {
            attribute: {
              select: {
                id: true,
                name: true,
                key: true,
                displayLabel: true,
                type: true,
                unit: true,
                displayOrder: true,
              },
            },
          },
          orderBy: { attribute: { displayOrder: 'asc' } },
        },
        user: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            phoneNumber: true,
            profile: {
              select: {
                name: true,
                avatarUrl: true,
                bio: true,
                ratingAverage: true,
                ratingCount: true,
                isIdentityVerified: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');

    prisma.ad.update({ where: { id: ad.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    const rawPhone = ad.user?.phoneNumber || '';
    const maskedPhone =
      rawPhone.length >= 10 ? `${rawPhone.slice(0, 3)}****${rawPhone.slice(-3)}` : 'Verified Seller';

    const sellerAdsCount = await prisma.ad.count({
      where: { userId: ad.userId, status: AdStatus.ACTIVE, deletedAt: null },
    });

    const attributes = (ad.attributesCache as Record<string, any>) || {};

    return {
      ...ad,
      attributes,
      attributesCache: attributes,
      seller: {
        ...ad.user,
        maskedPhone,
        adsCount: sellerAdsCount,
        phoneNumber: undefined,
      },
      user: undefined,
    };
  }

  static async update(userId: string, role: string, id: string, data: UpdateListingInput) {
    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');

    if (ad.userId !== userId && role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to edit this listing');
    }
    return prisma.ad.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        isNegotiable: data.isNegotiable,
        contactPreference: data.contactPreference,
        attributesCache: data.attributes ? { ...((ad.attributesCache as any) || {}), ...data.attributes } : undefined,
      },
    });
  }

  static async updateStatus(userId: string, role: string, id: string, status: AdStatus) {
    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');
    if (ad.userId !== userId && role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to modify this listing');
    }
    return prisma.ad.update({
      where: { id },
      data: {
        status,
        renewedAt: status === AdStatus.ACTIVE ? new Date() : undefined,
        expiresAt: status === AdStatus.ACTIVE ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
      },
    });
  }

  static async getContact(id: string) {
    const ad = await prisma.ad.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { user: { select: { phoneNumber: true, profile: { select: { name: true } } } } },
    });
    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');
    prisma.ad.update({ where: { id: ad.id }, data: { chatCount: { increment: 1 } } }).catch(() => {});
    return {
      phoneNumber: ad.user.phoneNumber,
      sellerName: ad.user.profile?.name || 'Seller',
      contactPreference: ad.contactPreference,
    };
  }

  static async getMyAds(userId: string, status?: AdStatus) {
    const whereClause: any = { userId };
    if (status) whereClause.status = status;

    const ads = await prisma.ad.findMany({
      where: whereClause,
      include: {
        category: { select: { name: true, slug: true } },
        location: { select: { name: true } },
        images: { orderBy: { isCover: 'desc' }, take: 3 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts = await prisma.ad.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });

    const counts: Record<string, number> = { ACTIVE: 0, PENDING_REVIEW: 0, SOLD: 0, EXPIRED: 0, ARCHIVED: 0, DRAFT: 0, REJECTED: 0 };

    statusCounts.forEach((c) => {
      counts[c.status] = c._count._all;
    });

    return { ads, counts, total: ads.length };
  }

  // Replaces or reorders the images of an existing listing
  static async updateListingImages(
    userId: string,
    listingId: string,
    images: Array<{ mediaId: string; sortOrder?: number; isCover?: boolean }>
  ) {
    const ad = await prisma.ad.findUnique({
      where: { id: listingId },
      include: { images: true },
    });

    if (!ad) throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found');
    if (ad.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'You do not own this listing');

    const mediaIds = images.map((i) => i.mediaId);
    const userMediaList = await prisma.media.findMany({
      where: {
        id: { in: mediaIds },
        userId,
      },
    });

    if (userMediaList.length !== mediaIds.length) {
      throw new AppError(
        400,
        'INVALID_MEDIA_ID',
        'One or more specified image IDs do not exist or do not belong to you'
      );
    }

    const pendingMedia = userMediaList.filter((m) => m.status !== 'READY');
    if (pendingMedia.length > 0) {
      throw new AppError(
        400,
        'MEDIA_PROCESSING',
        'One or more images are still being processed. Please wait until status is ready.'
      );
    }

    // Execute updates in a single transaction
    await prisma.$transaction(async (tx) => {
      // Find old attached media to detach if no longer referenced
      const previousMediaIds = ad.images
        .map((img) => img.mediaId)
        .filter(Boolean) as string[];

      const toDetach = previousMediaIds.filter((id) => !mediaIds.includes(id));
      if (toDetach.length > 0) {
        await tx.media.updateMany({
          where: { id: { in: toDetach } },
          data: {
            isAttached: false,
            attachedToId: null,
            scope: 'UNATTACHED',
          },
        });
      }

      // Mark newly attached media
      await tx.media.updateMany({
        where: { id: { in: mediaIds } },
        data: {
          isAttached: true,
          attachedToId: listingId,
          scope: 'LISTING_IMAGE',
        },
      });

      // Clear existing ad images and insert new ones
      await tx.adImage.deleteMany({ where: { adId: listingId } });

      const newRows = images.map((img, idx) => {
        const media = userMediaList.find((m) => m.id === img.mediaId)!;
        const variants = (media.variants as any) || {};
        return {
          adId: listingId,
          mediaId: media.id,
          originalUrl: variants.large || variants.card || media.diskPath || '',
          displayUrl: variants.card || variants.large || media.diskPath || '',
          thumbnailUrl: variants.thumbnail || variants.card || media.diskPath || '',
          sortOrder: img.sortOrder !== undefined ? img.sortOrder : idx,
          isCover: img.isCover !== undefined ? img.isCover : idx === 0,
        };
      });

      await tx.adImage.createMany({ data: newRows });
    });

    return prisma.adImage.findMany({
      where: { adId: listingId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // Removes a single image from a listing
  static async removeListingImage(userId: string, listingId: string, mediaId: string) {
    const ad = await prisma.ad.findUnique({
      where: { id: listingId },
      include: { images: true },
    });

    if (!ad) throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found');
    if (ad.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'You do not own this listing');

    const imageToRemove = ad.images.find((img) => img.mediaId === mediaId || img.id === mediaId);
    if (!imageToRemove) {
      throw new AppError(404, 'IMAGE_NOT_FOUND', 'Image is not associated with this listing');
    }

    if (ad.images.length <= 1) {
      throw new AppError(400, 'MINIMUM_IMAGES_REQUIRED', 'A listing must have at least one image');
    }

    await prisma.$transaction(async (tx) => {
      // Delete image association
      await tx.adImage.delete({ where: { id: imageToRemove.id } });

      // Detach media record
      if (imageToRemove.mediaId) {
        await tx.media.update({
          where: { id: imageToRemove.mediaId },
          data: {
            isAttached: false,
            attachedToId: null,
            scope: 'UNATTACHED',
          },
        });
      }

      // If removed image was cover, assign cover to the next image
      if (imageToRemove.isCover) {
        const remaining = ad.images.filter((img) => img.id !== imageToRemove.id);
        if (remaining.length > 0) {
          await tx.adImage.update({
            where: { id: remaining[0].id },
            data: { isCover: true },
          });
        }
      }
    });

    return { success: true };
  }
}
