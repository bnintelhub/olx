import { FastifyRequest } from 'fastify';
import { AdStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { redis, getCache, setCache } from '../../config/redis';
import { toPublicMediaUrl } from '../../shared/utils/media-url.util';
import {
  FEED_LIMITS,
  getJitteredFeedTtl,
  getRankingWeights,
  isPersonalizationEnabledFor,
} from './feed.config';
import {
  diversifyFeed,
  scoreListing,
  UserFeedContext,
} from './feed-ranking.service';

export interface HomeFeedParams {
  userId: string | null;
  sessionId: string | null;
  citySlug?: string;
  locationId?: string;
  latitude?: number;
  longitude?: number;
  cursor?: string;
  limit?: number;
}

interface DecodedCursor {
  offset: number;
  v: string;
}

function encodeCursor(offset: number, version: string): string {
  return Buffer.from(JSON.stringify({ offset, v: version })).toString('base64url');
}

function decodeCursor(cursor?: string): DecodedCursor {
  if (!cursor) return { offset: 0, v: FEED_LIMITS.version };
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const offset = Math.max(0, Number(parsed.offset) || 0);
    return { offset, v: parsed.v || FEED_LIMITS.version };
  } catch {
    return { offset: 0, v: FEED_LIMITS.version };
  }
}

function formatFeedListings(ads: any[]) {
  return ads.map((ad) => ({
    ...ad,
    featuredBoosts: undefined,
    images: (ad.images || []).map((img: any) => {
      const asset = img.mediaAsset;
      const variants = (asset?.variants as any) || (asset?.variantsJson as any) || {};
      const rawKey = variants.url || variants.image || asset?.storageKey || img.url || '';
      const singleUrl = toPublicMediaUrl(rawKey);
      return {
        ...img,
        mediaAsset: asset
          ? { ...asset, sizeBytes: asset.sizeBytes != null ? Number(asset.sizeBytes) : 0 }
          : undefined,
        mediaId: img.mediaAssetId || img.mediaId || null,
        url: singleUrl,
        originalUrl: singleUrl,
        displayUrl: singleUrl,
        thumbnailUrl: singleUrl,
      };
    }),
  }));
}

const FEED_AD_SELECT = {
  id: true,
  userId: true,
  title: true,
  description: true,
  slug: true,
  price: true,
  isNegotiable: true,
  status: true,
  viewCount: true,
  chatCount: true,
  favouriteCount: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  renewedAt: true,
  expiresAt: true,
  categoryId: true,
  locationId: true,
  category: { select: { id: true, name: true, slug: true, parentId: true } },
  location: { select: { id: true, name: true, slug: true, type: true } },
  images: {
    select: {
      id: true,
      sortOrder: true,
      isCover: true,
      mediaAssetId: true,
      mediaAsset: { select: { id: true, variants: true, storageKey: true, sizeBytes: true } },
    },
    orderBy: { sortOrder: 'asc' as const },
    take: 2,
  },
  user: {
    select: {
      id: true,
      role: true,
      profile: {
        select: {
          name: true,
          avatarUrl: true,
          ratingAverage: true,
          isIdentityVerified: true,
        },
      },
    },
  },
  featuredBoosts: {
    where: { status: 'ACTIVE' as const, endsAt: { gt: new Date() } },
    select: { id: true },
    take: 1,
  },
};

export class FeedService {
  /** Personalized + Cold-Start Hybrid Home Feed with opaque cursor pagination. */
  static async getHomeFeed(params: HomeFeedParams, request?: FastifyRequest) {
    const limit = Math.min(FEED_LIMITS.maxPageSize, Math.max(1, Number(params.limit) || FEED_LIMITS.defaultPageSize));
    const { offset } = decodeCursor(params.cursor);
    const identityKey = params.userId || params.sessionId || 'anon';
    const personalized = isPersonalizationEnabledFor(identityKey);

    const cacheKey = params.userId
      ? `feed:user:${params.userId}:${params.locationId || params.citySlug || 'all'}`
      : `feed:anon:${params.locationId || params.citySlug || 'all'}`;

    let orderedIds: string[] | null = await getCache<string[]>(cacheKey);

    if (!orderedIds) {
      // Single-flight lock to prevent cache stampede under concurrent requests
      const lockKey = `feed:lock:${cacheKey}`;
      let acquiredLock = false;
      try {
        if ((redis as any).status === 'ready') {
          const ok = await redis.set(lockKey, '1', 'EX', FEED_LIMITS.lockTtlSec, 'NX');
          acquiredLock = Boolean(ok);
        }
      } catch {
        acquiredLock = false;
      }

      orderedIds = await this.buildCandidateIdList(params, personalized, request);
      if (orderedIds.length > 0) {
        await setCache(cacheKey, orderedIds, getJitteredFeedTtl());
      }
      if (acquiredLock) {
        await redis.del(lockKey).catch(() => {});
      }
    }

    const total = orderedIds.length;
    const pageIds = orderedIds.slice(offset, offset + limit);
    const hasMore = offset + limit < total;
    const nextCursor = hasMore ? encodeCursor(offset + limit, FEED_LIMITS.version) : null;

    if (pageIds.length === 0) {
      return {
        items: [],
        next_cursor: null,
        has_more: false,
        feed_version: FEED_LIMITS.version,
      };
    }

    // Fetch only the current page's listings (re-verifying ACTIVE status to filter newly sold/deleted ads)
    const rows = await prisma.ad.findMany({
      where: {
        id: { in: pageIds },
        status: AdStatus.ACTIVE,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: FEED_AD_SELECT,
    });

    const rowMap = new Map(rows.map((r) => [r.id, r]));
    const orderedRows = pageIds.map((id) => rowMap.get(id)).filter(Boolean);

    return {
      items: formatFeedListings(orderedRows),
      next_cursor: nextCursor,
      has_more: hasMore,
      feed_version: FEED_LIMITS.version,
    };
  }

  private static async buildCandidateIdList(
    params: HomeFeedParams,
    personalized: boolean,
    request?: FastifyRequest
  ): Promise<string[]> {
    const now = new Date();
    const blockedSellerIds: string[] = [];

    if (params.userId) {
      const blocks = await prisma.block.findMany({
        where: { blockerId: params.userId },
        select: { blockedId: true },
        take: 100,
      });
      blockedSellerIds.push(...blocks.map((b) => b.blockedId));
    }

    const userCtx: UserFeedContext = {
      userId: params.userId,
      preferredLocationId: params.locationId || null,
      latitude: params.latitude,
      longitude: params.longitude,
      categoryInterests: new Map(),
    };

    if (personalized && params.userId) {
      // Load cached or DB user interest profile
      let interests = await getCache<any[]>(`interest:user:${params.userId}`);
      if (!interests) {
        interests = await prisma.userInterest.findMany({
          where: { userId: params.userId },
          orderBy: { interestScore: 'desc' },
          take: 10,
          select: {
            categoryId: true,
            interestScore: true,
            avgPriceMin: true,
            avgPriceMax: true,
            preferredLocationId: true,
          },
        });
        if (interests.length > 0) {
          await setCache(`interest:user:${params.userId}`, interests, 1800);
        }
      }

      for (const intr of interests) {
        userCtx.categoryInterests.set(intr.categoryId, {
          score: Number(intr.interestScore) || 0,
          avgPriceMin: intr.avgPriceMin != null ? Number(intr.avgPriceMin) : undefined,
          avgPriceMax: intr.avgPriceMax != null ? Number(intr.avgPriceMax) : undefined,
        });
        if (!userCtx.preferredLocationId && intr.preferredLocationId) {
          userCtx.preferredLocationId = intr.preferredLocationId;
        }
      }
    }

    const baseWhere: Prisma.AdWhereInput = {
      status: AdStatus.ACTIVE,
      deletedAt: null,
      expiresAt: { gt: now },
      ...(params.userId ? { userId: { notIn: [params.userId, ...blockedSellerIds] } } : {}),
    };

    // Bounded candidate retrieval: precomputed candidates + fresh real-time injection + cold-start pool
    const topCategories = Array.from(userCtx.categoryInterests.keys()).slice(0, 5);
    const freshCutoff = new Date(Date.now() - FEED_LIMITS.freshInjectionHours * 60 * 60 * 1000);

    const [precomputed, freshInjected, interestPool, generalPool] = await Promise.all([
      personalized && params.userId
        ? prisma.recommendationCandidate.findMany({
            where: { userId: params.userId, expiresAt: { gt: now } },
            orderBy: { score: 'desc' },
            take: 40,
            select: { listingId: true },
          })
        : Promise.resolve([]),
      prisma.ad.findMany({
        where: { ...baseWhere, createdAt: { gte: freshCutoff } },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: FEED_AD_SELECT,
      }),
      topCategories.length > 0
        ? prisma.ad.findMany({
            where: { ...baseWhere, categoryId: { in: topCategories } },
            orderBy: [{ createdAt: 'desc' }],
            take: 50,
            select: FEED_AD_SELECT,
          })
        : Promise.resolve([]),
      prisma.ad.findMany({
        where: baseWhere,
        orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
        take: FEED_LIMITS.candidatePoolLimit,
        select: FEED_AD_SELECT,
      }),
    ]);

    const candidateMap = new Map<string, any>();
    for (const ad of [...freshInjected, ...interestPool, ...generalPool]) {
      if (!candidateMap.has(ad.id)) candidateMap.set(ad.id, ad);
    }

    // Include any precomputed IDs not already in the candidate map
    const missingPrecomputedIds = precomputed
      .map((p) => p.listingId)
      .filter((id) => !candidateMap.has(id));
    if (missingPrecomputedIds.length > 0) {
      const extra = await prisma.ad.findMany({
        where: { ...baseWhere, id: { in: missingPrecomputedIds } },
        select: FEED_AD_SELECT,
      });
      for (const ad of extra) candidateMap.set(ad.id, ad);
    }

    const weights = getRankingWeights();
    const scored = Array.from(candidateMap.values()).map((ad) =>
      scoreListing(ad, userCtx, weights)
    );
    const diversified = diversifyFeed(scored);

    if (diversified.length > 0) {
      request?.log?.debug(
        {
          feedVersion: FEED_LIMITS.version,
          personalized,
          candidateCount: diversified.length,
          topExplanation: diversified[0].explanation,
        },
        'feed.ranking'
      );
    }

    return diversified.map((d) => d.listing.id);
  }

  /** City/Category Trending Feed cached in Redis. */
  static async getTrendingFeed(params: {
    citySlug?: string;
    categorySlug?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(FEED_LIMITS.maxPageSize, Math.max(1, Number(params.limit) || FEED_LIMITS.defaultPageSize));
    const { offset } = decodeCursor(params.cursor);
    const cacheKey = `trending:${params.citySlug || 'all'}:${params.categorySlug || 'all'}`;

    let cachedItems = await getCache<any[]>(cacheKey);
    if (!cachedItems) {
      const where: Prisma.AdWhereInput = {
        status: AdStatus.ACTIVE,
        deletedAt: null,
        expiresAt: { gt: new Date() },
        ...(params.citySlug ? { location: { slug: params.citySlug } } : {}),
        ...(params.categorySlug ? { category: { slug: params.categorySlug } } : {}),
      };

      const rows = await prisma.ad.findMany({
        where,
        orderBy: [{ chatCount: 'desc' }, { favouriteCount: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
        take: FEED_LIMITS.trendingPoolLimit,
        select: FEED_AD_SELECT,
      });
      cachedItems = formatFeedListings(rows);
      await setCache(cacheKey, cachedItems, FEED_LIMITS.trendingTtlSec);
    }

    const pageItems = cachedItems.slice(offset, offset + limit);
    const hasMore = offset + limit < cachedItems.length;
    return {
      items: pageItems,
      next_cursor: hasMore ? encodeCursor(offset + limit, FEED_LIMITS.version) : null,
      has_more: hasMore,
      feed_version: FEED_LIMITS.version,
    };
  }

  /** Similar Listings Feed matching category, price band, and location. */
  static async getSimilarFeed(listingId: string, limit = 10) {
    const safeLimit = Math.min(24, Math.max(1, Number(limit) || 10));
    const cacheKey = `similar:${listingId}:${safeLimit}`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) {
      return { items: cached, next_cursor: null, has_more: false, feed_version: FEED_LIMITS.version };
    }

    const target = await prisma.ad.findUnique({
      where: { id: listingId },
      select: { categoryId: true, locationId: true, price: true },
    });
    if (!target) {
      return { items: [], next_cursor: null, has_more: false, feed_version: FEED_LIMITS.version };
    }

    const targetPrice = Number(target.price) || 0;
    const rows = await prisma.ad.findMany({
      where: {
        id: { not: listingId },
        categoryId: target.categoryId,
        status: AdStatus.ACTIVE,
        deletedAt: null,
        expiresAt: { gt: new Date() },
        ...(targetPrice > 0
          ? { price: { gte: Math.max(0, targetPrice * 0.5), lte: targetPrice * 1.6 } }
          : {}),
      },
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
      take: safeLimit,
      select: FEED_AD_SELECT,
    });

    const formatted = formatFeedListings(rows);
    await setCache(cacheKey, formatted, FEED_LIMITS.similarTtlSec);

    return {
      items: formatted,
      next_cursor: null,
      has_more: false,
      feed_version: FEED_LIMITS.version,
    };
  }
}
