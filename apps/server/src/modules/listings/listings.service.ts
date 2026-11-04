import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { AdStatus } from '@prisma/client';
import { checkContentForFraud } from '../../shared/utils/anti-fraud.util';
import { CreateListingInput, UpdateListingInput } from './listings.schema';
import { processListingImagesJob } from '../../jobs/image-processing.job';
import { SETTING_DEFAULTS } from '../../config/constants';

export class ListingsService {
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static async create(userId: string, data: CreateListingInput) {
    const [category, location] = await Promise.all([
      prisma.category.findUnique({
        where: { id: data.categoryId },
        include: {
          attributes: true,
          parent: { include: { attributes: true } },
        },
      }),
      prisma.location.findUnique({ where: { id: data.locationId } }),
    ]);

    if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Selected category does not exist');
    if (!location) throw new AppError(404, 'LOCATION_NOT_FOUND', 'Selected location does not exist');

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

    const ad = await prisma.$transaction(async (tx) => {
      const createdAd = await tx.ad.create({
        data: {
          userId,
          categoryId: data.categoryId,
          locationId: data.locationId,
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
        await tx.adImage.createMany({
          data: data.images.map((img, idx) => ({
            adId: createdAd.id,
            originalUrl: img.url,
            displayUrl: img.url,
            thumbnailUrl: img.url,
            sortOrder: idx,
            isCover: img.isCover !== undefined ? img.isCover : idx === 0,
          })),
        });
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

    // Trigger async image processing job
    void processListingImagesJob(ad.id, data.images.map((i) => i.url));

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
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
        images: { orderBy: { sortOrder: 'asc' } },
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

    return {
      ...ad,
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
        attributesCache: data.attributes
          ? { ...((ad.attributesCache as any) || {}), ...data.attributes }
          : undefined,
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
        images: { where: { isCover: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts = await prisma.ad.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {
      ACTIVE: 0,
      PENDING_REVIEW: 0,
      SOLD: 0,
      EXPIRED: 0,
      ARCHIVED: 0,
      DRAFT: 0,
      REJECTED: 0,
    };

    statusCounts.forEach((c) => {
      counts[c.status] = c._count._all;
    });

    return { ads, counts, total: ads.length };
  }
}
