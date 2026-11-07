import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RevenueService, DEFAULT_REVENUE_POLICY } from '../../src/modules/revenue/revenue.service';
import { prisma } from '@olx/database';
import { AppError } from '../../src/shared/errors/app-error';

vi.mock('@olx/database', () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    ad: {
      count: vi.fn(),
    },
    paymentOrder: {
      findMany: vi.fn(),
    },
  },
}));

describe('Revenue Policy & Listing Quota Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Monetization Rules & Catalog', () => {
    it('should have 5 free ads per month by default', () => {
      expect(DEFAULT_REVENUE_POLICY.postingLimit.freeAdsPerMonth).toBe(5);
      expect(DEFAULT_REVENUE_POLICY.postingLimit.cycleDays).toBe(30);
    });

    it('should contain the extra listing bundles including ₹1 testing plan and standard tiers', () => {
      const packages = DEFAULT_REVENUE_POLICY.postingLimit.extraPackages;
      expect(packages).toHaveLength(4);
      expect(packages.find((p) => p.id === 'test_1')?.priceInr).toBe(1);
      expect(packages.find((p) => p.id === 'extra_5')?.priceInr).toBe(99);
      expect(packages.find((p) => p.id === 'extra_15')?.priceInr).toBe(199);
      expect(packages.find((p) => p.id === 'extra_50')?.priceInr).toBe(499);
    });

    it('should contain the 4 boost promotion tiers (₹49, ₹99, ₹149, ₹199)', () => {
      const boosts = DEFAULT_REVENUE_POLICY.boostPackages;
      expect(boosts).toHaveLength(4);
      expect(boosts.find((b) => b.id === 'boost_top')?.priceInr).toBe(49);
      expect(boosts.find((b) => b.id === 'featured_boost')?.priceInr).toBe(99);
      expect(boosts.find((b) => b.id === 'top_featured')?.priceInr).toBe(149);
      expect(boosts.find((b) => b.id === 'auto_boost')?.priceInr).toBe(199);
    });

    it('should contain the 3 featured duration packages (₹79, ₹149, ₹249)', () => {
      const featured = DEFAULT_REVENUE_POLICY.featuredPackages;
      expect(featured).toHaveLength(3);
      expect(featured.find((f) => f.id === 'feat_3d')?.priceInr).toBe(79);
      expect(featured.find((f) => f.id === 'feat_7d')?.priceInr).toBe(149);
      expect(featured.find((f) => f.id === 'feat_15d')?.priceInr).toBe(249);
    });

    it('should contain the 4 dealer subscription tiers (Individual, Pro, Dealer, Enterprise)', () => {
      const subscriptions = DEFAULT_REVENUE_POLICY.subscriptionPlans;
      expect(subscriptions).toHaveLength(4);
      expect(subscriptions.find((s) => s.id === 'individual')?.priceMonthlyInr).toBe(0);
      expect(subscriptions.find((s) => s.id === 'pro_seller')?.priceMonthlyInr).toBe(499);
      expect(subscriptions.find((s) => s.id === 'dealer')?.priceMonthlyInr).toBe(1999);
      expect(subscriptions.find((s) => s.id === 'enterprise')?.priceMonthlyInr).toBe(9999);
    });
  });

  describe('User Listing Quota Calculation', () => {
    it('should allow posting when user has used 0 of 5 free ads', async () => {
      vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.ad.count).mockResolvedValue(0);
      vi.mocked(prisma.paymentOrder.findMany).mockResolvedValue([]);

      const quota = await RevenueService.getUserListingQuota('user-123');
      expect(quota.freeAdsLimit).toBe(5);
      expect(quota.usedThisMonth).toBe(0);
      expect(quota.remainingFreeAds).toBe(5);
      expect(quota.totalAvailableListings).toBe(5);
      expect(quota.isLimitReached).toBe(false);
    });

    it('should flag limit reached when user has used all 5 free ads with no paid credits', async () => {
      vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.ad.count).mockResolvedValue(5);
      vi.mocked(prisma.paymentOrder.findMany).mockResolvedValue([]);

      const quota = await RevenueService.getUserListingQuota('user-123');
      expect(quota.usedThisMonth).toBe(5);
      expect(quota.remainingFreeAds).toBe(0);
      expect(quota.totalAvailableListings).toBe(0);
      expect(quota.isLimitReached).toBe(true);
    });

    it('should grant extra allowance if user has purchased paid listing packages', async () => {
      vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.ad.count).mockResolvedValue(5);
      vi.mocked(prisma.paymentOrder.findMany).mockResolvedValue([
        {
          id: 'ord-1',
          userId: 'user-123',
          metadata: { adsCount: 15 },
          status: 'SUCCESS',
        } as any,
      ]);

      const quota = await RevenueService.getUserListingQuota('user-123');
      expect(quota.usedThisMonth).toBe(5);
      expect(quota.remainingFreeAds).toBe(0);
      expect(quota.paidAdsBalance).toBe(15);
      expect(quota.totalAvailableListings).toBe(15);
      expect(quota.isLimitReached).toBe(false);
    });

    it('assertListingAllowed should throw 402 LISTING_LIMIT_REACHED when quota exhausted', async () => {
      vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.ad.count).mockResolvedValue(6);
      vi.mocked(prisma.paymentOrder.findMany).mockResolvedValue([]);

      await expect(RevenueService.assertListingAllowed('user-123')).rejects.toThrowError(
        /Monthly free listing limit reached/
      );
    });

    it('assertListingAllowed should succeed when within free quota', async () => {
      vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.ad.count).mockResolvedValue(2);
      vi.mocked(prisma.paymentOrder.findMany).mockResolvedValue([]);

      await expect(RevenueService.assertListingAllowed('user-123')).resolves.not.toThrow();
    });
  });

  describe('Dynamic Policy Updates by Admin', () => {
    it('should update free limit and packages dynamically', async () => {
      vi.mocked(prisma.platformSetting.upsert).mockResolvedValue({} as any);

      const updated = await RevenueService.updatePolicy(
        {
          postingLimit: {
            freeAdsPerMonth: 10,
            cycleDays: 30,
            allowPaidExtraAds: true,
            extraPackages: [],
          },
        },
        'admin-uuid'
      );

      expect(updated.postingLimit.freeAdsPerMonth).toBe(10);
      expect(updated.updatedBy).toBe('admin-uuid');
      expect(prisma.platformSetting.upsert).toHaveBeenCalledTimes(1);
    });
  });
});

