import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { AdStatus } from '@prisma/client';
import { SearchService } from '../services/search.service';
import { checkContentForFraud } from '../utils/antiFraud';
import { SettingsService } from '../services/settings.service';

const createAdSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(150),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.number().positive('Price must be greater than zero'),
  isNegotiable: z.boolean().default(true),
  categoryId: z.string().uuid('Valid Category ID is required'),
  locationId: z.string().uuid('Valid Location ID is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contactPreference: z.enum(['CHAT_AND_CALL', 'CHAT_ONLY', 'CALL_ONLY']).default('CHAT_AND_CALL'),
  attributes: z.record(z.any()).default({}),
  images: z
    .array(
      z.object({
        url: z.string().min(1, 'Image URL is required'),
        isCover: z.boolean().optional(),
      })
    )
    .min(1, 'At least 1 photo is required')
    .max(12, 'Maximum 12 photos allowed'),
});

const updateAdSchema = z.object({
  title: z.string().min(10).max(150).optional(),
  description: z.string().min(20).optional(),
  price: z.number().positive().optional(),
  isNegotiable: z.boolean().optional(),
  contactPreference: z.enum(['CHAT_AND_CALL', 'CHAT_ONLY', 'CALL_ONLY']).optional(),
  attributes: z.record(z.any()).optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class AdController {
  /**
   * POST /api/v1/ads/upload-images
   * Uploads up to 12 images
   */
  static async uploadImages(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new AppError(400, 'NO_FILES_UPLOADED', 'Please upload at least one image file');
      }
      const [maxCount, maxSizeMb, allowedTypes] = await Promise.all([
        SettingsService.get<number>('maxImageCount'), SettingsService.get<number>('maxImageSizeMb'), SettingsService.get<string[]>('allowedImageMimeTypes'),
      ]);
      if (files.length > maxCount) throw new AppError(400, 'IMAGE_COUNT_LIMIT', `A maximum of ${maxCount} images is allowed`);
      if (files.some((file) => file.size > maxSizeMb * 1024 * 1024)) throw new AppError(400, 'IMAGE_SIZE_LIMIT', `Each image must be no larger than ${maxSizeMb}MB`);
      if (files.some((file) => !allowedTypes.includes(file.mimetype))) throw new AppError(400, 'INVALID_FILE_TYPE', 'This image type is not allowed by platform settings');

      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol === 'https' ? 'https' : 'http';

      const uploaded = files.map((file, idx) => ({
        url: `${protocol}://${host}/uploads/${file.filename}`,
        thumbnailUrl: `${protocol}://${host}/uploads/${file.filename}`,
        displayUrl: `${protocol}://${host}/uploads/${file.filename}`,
        originalName: file.originalname,
        sortOrder: idx,
        isCover: idx === 0,
      }));

      res.status(200).json({
        success: true,
        data: uploaded,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/ads
   * Creates a new Ad in MySQL with dynamic attributes and images
   */
  static async createAd(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const body = createAdSchema.parse(req.body);
      const [expiryDays, maxImageCount, requireModeration] = await Promise.all([
        SettingsService.get<number>('listingExpiryDays'), SettingsService.get<number>('maxImageCount'), SettingsService.get<boolean>('requireModeration'),
      ]);
      if (body.images.length > maxImageCount) throw new AppError(400, 'IMAGE_COUNT_LIMIT', `A maximum of ${maxImageCount} images is allowed`);

      // 1. Verify Category & Location
      const [category, location] = await Promise.all([
        prisma.category.findUnique({
          where: { id: body.categoryId },
          include: {
            attributes: true,
            parent: { include: { attributes: true } },
          },
        }),
        prisma.location.findUnique({ where: { id: body.locationId } }),
      ]);

      if (!category) {
        throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Selected category does not exist');
      }
      if (!location) {
        throw new AppError(404, 'LOCATION_NOT_FOUND', 'Selected location does not exist');
      }

      // 2. Validate Required Dynamic Attributes
      const allCategoryAttributes = [
        ...(category.parent?.attributes || []),
        ...category.attributes,
      ];

      for (const attr of allCategoryAttributes) {
        if (attr.isRequired && (body.attributes[attr.key] === undefined || body.attributes[attr.key] === '')) {
          throw new AppError(
            400,
            'MISSING_REQUIRED_ATTRIBUTE',
            `The dynamic specification "${attr.name}" is required for ${category.name}.`
          );
        }
      }

      // 3. Generate unique slug
      const shortId = Math.random().toString(36).substring(2, 8);
      const baseSlug = slugify(body.title);
      const slug = `${baseSlug}-${shortId}`;

      const latitude = body.latitude || location.latitude;
      const longitude = body.longitude || location.longitude;

      // 4. Automated Content Moderation & Anti-fraud check
      const fraudResult = checkContentForFraud(body.title, body.description);
      const initialStatus = (fraudResult.isFlagged || requireModeration) ? AdStatus.PENDING_REVIEW : AdStatus.ACTIVE;
      const rejectionReason = fraudResult.isFlagged ? fraudResult.reasons.join('; ') : null;

      // 5. Expiry (30 days from now)
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

      // 6. Transactional Ad Creation
      const ad = await prisma.$transaction(async (tx) => {
        // Insert Ad
        const createdAd = await tx.ad.create({
          data: {
            userId,
            categoryId: body.categoryId,
            locationId: body.locationId,
            title: body.title,
            slug,
            description: fraudResult.sanitizedDescription,
            price: body.price,
            isNegotiable: body.isNegotiable,
            status: initialStatus,
            rejectionReason,
            contactPreference: body.contactPreference,
            latitude,
            longitude,
            expiresAt,
            attributesCache: body.attributes,
          },
        });

        // Insert Images
        if (body.images && body.images.length > 0) {
          await tx.adImage.createMany({
            data: body.images.map((img, idx) => ({
              adId: createdAd.id,
              originalUrl: img.url,
              displayUrl: img.url,
              thumbnailUrl: img.url,
              sortOrder: idx,
              isCover: img.isCover !== undefined ? img.isCover : idx === 0,
            })),
          });
        }

        // Insert Normalized Attributes
        const attrEntries = Object.entries(body.attributes);
        for (const [key, val] of attrEntries) {
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

      // Fetch complete created Ad with relations
      const fullAd = await prisma.ad.findUnique({
        where: { id: ad.id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { sortOrder: 'asc' } },
        },
      });

      res.status(201).json({
        success: true,
        data: fullAd,
        message: 'Ad posted successfully and is now LIVE!',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/user/my-ads
   * Fetches the current user's ads with tabbed status filters
   */
  static async getMyAds(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const status = req.query.status as AdStatus | undefined;

      const whereClause: any = { userId };
      if (status) {
        whereClause.status = status;
      }

      const ads = await prisma.ad.findMany({
        where: whereClause,
        include: {
          category: { select: { name: true, slug: true } },
          location: { select: { name: true } },
          images: {
            where: { isCover: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Compute status counts for user dashboard tabs
      const statusCounts = await prisma.ad.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      });

      const countsMap: Record<string, number> = {
        ACTIVE: 0,
        PENDING_REVIEW: 0,
        SOLD: 0,
        EXPIRED: 0,
        ARCHIVED: 0,
        DRAFT: 0,
        REJECTED: 0,
      };

      statusCounts.forEach((c) => {
        countsMap[c.status] = c._count._all;
      });

      res.status(200).json({
        success: true,
        data: {
          ads,
          counts: countsMap,
          total: ads.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/ads/:id/status
   * Updates an Ad's status (e.g. Mark as SOLD, Renew, Archive)
   */
  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;

      if (!status || !Object.values(AdStatus).includes(status)) {
        throw new AppError(400, 'INVALID_STATUS', 'Valid status is required');
      }

      const ad = await prisma.ad.findUnique({ where: { id } });
      if (!ad) {
        throw new AppError(404, 'AD_NOT_FOUND', 'Ad not found');
      }

      // Verify ownership unless admin
      if (ad.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to modify this ad');
      }

      const updated = await prisma.ad.update({
        where: { id },
        data: {
          status: status as AdStatus,
          renewedAt: status === AdStatus.ACTIVE ? new Date() : undefined,
          expiresAt:
            status === AdStatus.ACTIVE ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
        },
      });

      res.status(200).json({
        success: true,
        data: updated,
        message: `Ad status updated to ${status}`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/ads/:id
   * Edit Ad price, description, etc.
   */
  static async updateAd(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = updateAdSchema.parse(req.body);

      const ad = await prisma.ad.findUnique({ where: { id } });
      if (!ad) {
        throw new AppError(404, 'AD_NOT_FOUND', 'Ad not found');
      }

      if (ad.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to edit this ad');
      }

      const updated = await prisma.ad.update({
        where: { id },
        data: {
          title: body.title,
          description: body.description,
          price: body.price,
          isNegotiable: body.isNegotiable,
          contactPreference: body.contactPreference,
          attributesCache: body.attributes
            ? { ...((ad.attributesCache as any) || {}), ...body.attributes }
            : undefined,
        },
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/ads
   * Search and filter ads
   */
  static async searchAds(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        q,
        categoryId,
        categorySlug,
        locationId,
        citySlug,
        minPrice,
        maxPrice,
        sort,
        page,
        limit,
        ...rest
      } = req.query as Record<string, any>;

      // Extract custom attribute filters prefixed with attr_
      const attributes: Record<string, any> = {};
      Object.keys(rest).forEach((key) => {
        if (key.startsWith('attr_')) {
          attributes[key.replace('attr_', '')] = rest[key];
        }
      });

      const result = await SearchService.search({
        q: q ? String(q) : undefined,
        categoryId: categoryId ? String(categoryId) : undefined,
        categorySlug: categorySlug ? String(categorySlug) : undefined,
        locationId: locationId ? String(locationId) : undefined,
        citySlug: citySlug ? String(citySlug) : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort: sort as any,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        attributes,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/ads/suggestions
   * Autocomplete search suggestions (categories and products)
   */
  static async getSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const citySlug = typeof req.query.citySlug === 'string' ? req.query.citySlug : undefined;
      const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));

      const suggestions = await SearchService.getSuggestions(q, citySlug, limit);

      res.status(200).json({
        success: true,
        data: suggestions,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/ads/:id
   * Get single ad detail with full hierarchy
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      const ad = await prisma.ad.findFirst({
        where: {
          OR: [{ id }, { slug: id }],
        },
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

      if (!ad) {
        throw new AppError(404, 'AD_NOT_FOUND', 'Ad listing not found');
      }

      // Increment view count asynchronously
      prisma.ad
        .update({
          where: { id: ad.id },
          data: { viewCount: { increment: 1 } },
        })
        .catch(() => {});

      // Mask seller phone number by default for privacy (revealed on click)
      const rawPhone = ad.user?.phoneNumber || '';
      const maskedPhone =
        rawPhone.length >= 10
          ? `${rawPhone.slice(0, 3)}****${rawPhone.slice(-3)}`
          : 'Verified Seller';

      const sellerAdsCount = await prisma.ad.count({
        where: { userId: ad.userId, status: AdStatus.ACTIVE, deletedAt: null },
      });

      const sanitizedAd = {
        ...ad,
        seller: {
          ...ad.user,
          maskedPhone,
          adsCount: sellerAdsCount,
          phoneNumber: undefined, // Don't expose raw phone in public payload
        },
        user: undefined,
      };

      res.status(200).json({
        success: true,
        data: sanitizedAd,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/ads/:id/similar
   * Fetch similar / related ads for recommendations
   */
  static async getSimilar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const similar = await SearchService.getSimilarAds(id, 6);

      res.status(200).json({
        success: true,
        data: similar,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/ads/:id/contact
   * Reveal full seller phone number
   */
  static async getContact(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const ad = await prisma.ad.findFirst({
        where: { OR: [{ id }, { slug: id }] },
        include: { user: { select: { phoneNumber: true, profile: { select: { name: true } } } } },
      });

      if (!ad) {
        throw new AppError(404, 'AD_NOT_FOUND', 'Ad listing not found');
      }

      // Increment chat/contact interest count
      prisma.ad
        .update({
          where: { id: ad.id },
          data: { chatCount: { increment: 1 } },
        })
        .catch(() => {});

      res.status(200).json({
        success: true,
        data: {
          phoneNumber: ad.user.phoneNumber,
          sellerName: ad.user.profile?.name || 'Seller',
          contactPreference: ad.contactPreference,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/ads/:id/favourite
   * Toggle favourite / wishlist status
   */
  static async toggleFavourite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;

      const ad = await prisma.ad.findUnique({ where: { id } });
      if (!ad) {
        throw new AppError(404, 'AD_NOT_FOUND', 'Ad listing not found');
      }

      const existing = await prisma.favourite.findUnique({
        where: {
          userId_adId: {
            userId,
            adId: id,
          },
        },
      });

      let isFavourited = false;
      if (existing) {
        await prisma.favourite.delete({
          where: { id: existing.id },
        });
        await prisma.ad.update({
          where: { id },
          data: { favouriteCount: { decrement: 1 } },
        });
        isFavourited = false;
      } else {
        await prisma.favourite.create({
          data: {
            userId,
            adId: id,
          },
        });
        await prisma.ad.update({
          where: { id },
          data: { favouriteCount: { increment: 1 } },
        });
        isFavourited = true;
      }

      res.status(200).json({
        success: true,
        data: {
          isFavourited,
          message: isFavourited ? 'Added to favourites' : 'Removed from favourites',
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
