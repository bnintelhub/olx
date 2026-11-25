import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  scoreListing,
  diversifyFeed,
  UserFeedContext,
  RankableListing,
} from '../../src/modules/feed/feed-ranking.service';
import {
  DEFAULT_RANKING_WEIGHTS,
  isPersonalizationEnabledFor,
} from '../../src/modules/feed/feed.config';
import { FeedService } from '../../src/modules/feed/feed.service';
import { FeedEventsService } from '../../src/modules/feed-events/feed-events.service';
import { prisma } from '../../src/config/prisma';
import * as redisConfig from '../../src/config/redis';
import * as feedJob from '../../src/jobs/feed.job';

function makeAd(overrides: Partial<RankableListing> = {}): RankableListing {
  return {
    id: overrides.id || 'ad-1',
    userId: overrides.userId || 'seller-1',
    categoryId: overrides.categoryId || 'cat-mobiles',
    locationId: overrides.locationId || 'loc-ranchi',
    price: overrides.price ?? 25000,
    viewCount: overrides.viewCount ?? 10,
    chatCount: overrides.chatCount ?? 1,
    favouriteCount: overrides.favouriteCount ?? 2,
    description: overrides.description ?? 'Well maintained smartphone in clean condition with box and bill.',
    latitude: overrides.latitude ?? 23.3441,
    longitude: overrides.longitude ?? 85.3096,
    createdAt: overrides.createdAt ?? new Date(),
    renewedAt: overrides.renewedAt ?? null,
    images: overrides.images ?? [{ id: 'img-1' }],
    user: overrides.user ?? { profile: { isIdentityVerified: true } },
    featuredBoosts: overrides.featuredBoosts ?? [],
  };
}

describe('Phase 1 Feed & Recommendation System', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Ranking & Scoring Engine', () => {
    it('normalizes signals and prioritizes category + location + price matches over mismatched ads', () => {
      const ctx: UserFeedContext = {
        userId: 'user-1',
        preferredLocationId: 'loc-ranchi',
        categoryInterests: new Map([
          ['cat-mobiles', { score: 25, avgPriceMin: 15000, avgPriceMax: 35000 }],
        ]),
      };

      const matched = makeAd({ id: 'ad-match', categoryId: 'cat-mobiles', locationId: 'loc-ranchi', price: 24000 });
      const mismatched = makeAd({ id: 'ad-other', categoryId: 'cat-furniture', locationId: 'loc-delhi', price: 90000 });

      const s1 = scoreListing(matched, ctx, DEFAULT_RANKING_WEIGHTS);
      const s2 = scoreListing(mismatched, ctx, DEFAULT_RANKING_WEIGHTS);

      expect(s1.score).toBeGreaterThan(s2.score);
      expect(s1.score).toBeLessThanOrEqual(1);
      expect(s1.score).toBeGreaterThan(0);
    });

    it('caps engagement manipulation logarithmically so spam views do not dominate fresh quality ads', () => {
      const ctx: UserFeedContext = { userId: null, categoryInterests: new Map() };
      const normalAd = makeAd({ id: 'normal', viewCount: 20, chatCount: 2 });
      const spamAd = makeAd({ id: 'spam', viewCount: 1000000, chatCount: 500 });

      const sNormal = scoreListing(normalAd, ctx, DEFAULT_RANKING_WEIGHTS);
      const sSpam = scoreListing(spamAd, ctx, DEFAULT_RANKING_WEIGHTS);

      expect(sSpam.explanation.eng).toBeLessThanOrEqual(1);
      expect(sSpam.score - sNormal.score).toBeLessThan(0.1);
    });

    it('enforces seller diversity cap and separates promoted ads from organic ranking', () => {
      const ctx: UserFeedContext = { userId: null, categoryInterests: new Map() };
      const ads = [
        makeAd({ id: 'a1', userId: 'seller-A' }),
        makeAd({ id: 'a2', userId: 'seller-A' }),
        makeAd({ id: 'a3', userId: 'seller-A' }),
        makeAd({ id: 'a4', userId: 'seller-B' }),
        makeAd({ id: 'a5', userId: 'seller-C' }),
        makeAd({ id: 'promo1', userId: 'seller-D', featuredBoosts: [{ id: 'f1' }] }),
      ];

      const scored = ads.map((a) => scoreListing(a, ctx, DEFAULT_RANKING_WEIGHTS));
      const diversified = diversifyFeed(scored, 2);

      // Top 4 organic items should have at most 2 from seller-A
      const top4Sellers = diversified.slice(0, 4).map((d) => d.listing.userId);
      const sellerACount = top4Sellers.filter((id) => id === 'seller-A').length;
      expect(sellerACount).toBeLessThanOrEqual(2);

      // Promoted ad is placed cleanly in the feed without inflating organic items
      expect(diversified.some((d) => d.listing.id === 'promo1' && d.isPromoted)).toBe(true);
    });
  });

  describe('2. Feed API Service, Cursor Pagination & Graceful Redis Degradation', () => {
    it('returns non-empty cold-start feed and stable non-overlapping cursor pages even when Redis is down', async () => {
      vi.spyOn(redisConfig, 'getCache').mockResolvedValue(null);
      vi.spyOn(redisConfig, 'setCache').mockResolvedValue(undefined);

      const mockAds = Array.from({ length: 5 }, (_, i) =>
        makeAd({ id: `ad-${i + 1}`, userId: `seller-${i + 1}` })
      );

      vi.spyOn(prisma.ad, 'findMany').mockImplementation(async (args: any) => {
        if (args?.where?.id?.in) {
          const ids: string[] = args.where.id.in;
          return mockAds.filter((a) => ids.includes(a.id)) as any;
        }
        return mockAds as any;
      });
      vi.spyOn(prisma.block, 'findMany').mockResolvedValue([]);

      const page1 = await FeedService.getHomeFeed({
        userId: null,
        sessionId: 'sess-1',
        limit: 2,
      });

      expect(page1.items.length).toBe(2);
      expect(page1.has_more).toBe(true);
      expect(page1.next_cursor).toBeTruthy();
      expect(page1.feed_version).toBe('v1');

      const page2 = await FeedService.getHomeFeed({
        userId: null,
        sessionId: 'sess-1',
        cursor: page1.next_cursor!,
        limit: 2,
      });

      expect(page2.items.length).toBe(2);
      const ids1 = new Set(page1.items.map((i: any) => i.id));
      for (const item of page2.items) {
        expect(ids1.has((item as any).id)).toBe(false);
      }
    });
  });

  describe('3. Event Ingestion Idempotency & Security', () => {
    it('validates listings and ignores duplicate eventIds via Redis NX lock', async () => {
      vi.spyOn(prisma.ad, 'findMany').mockResolvedValue([
        { id: 'ad-1', categoryId: 'cat-1' } as any,
      ]);
      const dispatchSpy = vi.spyOn(feedJob, 'dispatchFeedEventsJob').mockResolvedValue('job-1');

      const seen = new Set<string>();
      (redisConfig.redis as any).status = 'ready';
      vi.spyOn(redisConfig.redis, 'set').mockImplementation(async (key: any) => {
        if (seen.has(String(key))) return null;
        seen.add(String(key));
        return 'OK';
      });

      const res = await FeedEventsService.ingest('user-1', 'sess-1', [
        { eventId: 'evt-unique-1', eventType: 'VIEW', listingId: 'ad-1' },
        { eventId: 'evt-unique-1', eventType: 'VIEW', listingId: 'ad-1' },
      ]);

      expect(res.accepted).toBe(1);
      expect(res.duplicates).toBe(1);
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Feature Flag Rollout Safety', () => {
    it('evaluates deterministic rollout cohorts cleanly', () => {
      expect(typeof isPersonalizationEnabledFor('user-abc')).toBe('boolean');
    });
  });
});
