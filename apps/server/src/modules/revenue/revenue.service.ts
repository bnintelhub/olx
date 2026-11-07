import { prisma } from '@olx/database';
import { AdStatus, PaymentPurpose } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error';
import { RevenuePolicy, UserQuotaResponse } from './revenue.types';
import { getCache, setCache, delCache } from '../../config/redis';

const POLICY_SETTING_KEY = 'revenue_policy';
const REDIS_POLICY_KEY = 'revenue:policy:active';

export const DEFAULT_REVENUE_POLICY: RevenuePolicy = {
  id: 'pol-standard-v1',
  name: 'OLX Dynamic Monetization & Free Quota Policy',
  isActive: true,
  updatedAt: new Date().toISOString(),
  postingLimit: {
    freeAdsPerMonth: 5,
    cycleDays: 30,
    allowPaidExtraAds: true,
    extraPackages: [
      { id: 'test_1', name: '1 Extra Ad (Test ₹1)', adsCount: 1, priceInr: 1, validityDays: 30, badge: 'Testing ₹1', description: 'Testing pack for ₹1 rupee' },
      { id: 'extra_5', name: '5 Extra Ads', adsCount: 5, priceInr: 99, validityDays: 30, badge: 'Starter', description: 'Post 5 additional classified ads' },
      { id: 'extra_15', name: '15 Extra Ads', adsCount: 15, priceInr: 199, validityDays: 60, badge: 'Popular', description: 'Post 15 additional classified ads with 60 days validity' },
      { id: 'extra_50', name: '50 Extra Ads', adsCount: 50, priceInr: 499, validityDays: 90, badge: 'Best Value', description: 'Bulk package for regular sellers and small businesses' },
    ],
  },
  boostPackages: [
    { id: 'boost_top', name: 'Boost to Top', priceInr: 49, durationDays: 3, features: ['Jumps to top of search results', 'High visibility tag'], badge: 'Quick Sale' },
    { id: 'featured_boost', name: 'Featured Ad', priceInr: 99, durationDays: 7, features: ['Featured badge on listing', 'Highlighted background', 'Category top placement'], badge: 'Recommended' },
    { id: 'top_featured', name: 'Top + Featured', priceInr: 149, durationDays: 7, features: ['Combined Top rank + Featured tag', 'Up to 8x more inquiries', 'Homepage visibility'], badge: 'Best Seller' },
    { id: 'auto_boost', name: 'Auto Boost', priceInr: 199, durationDays: 14, features: ['Auto-boosts to rank #1 every 48 hours', 'Urgent sticker', 'Top spot in category for 14 days'], badge: 'Pro Boost' },
  ],
  featuredPackages: [
    { id: 'feat_3d', name: 'Featured (3 Days)', durationDays: 3, priceInr: 79, badge: 'Quick' },
    { id: 'feat_7d', name: 'Featured (7 Days)', durationDays: 7, priceInr: 149, badge: 'Popular' },
    { id: 'feat_15d', name: 'Featured (15 Days)', durationDays: 15, priceInr: 249, badge: 'Max Visibility' },
  ],
  subscriptionPlans: [
    { id: 'individual', name: 'Individual', priceMonthlyInr: 0, monthlyListings: 5, boostCredits: 0, features: ['5 Free Ads / Month', 'Standard Search Placement', 'Direct Buyer Chats'] },
    { id: 'pro_seller', name: 'Pro Seller', priceMonthlyInr: 499, monthlyListings: 50, boostCredits: 10, isPopular: true, features: ['50 Active Listings', '10 Free Boost Credits', 'Verified Pro Seller Badge', 'Listing Analytics Dashboard'] },
    { id: 'dealer', name: 'Dealer / Broker', priceMonthlyInr: 1999, monthlyListings: 500, boostCredits: 50, features: ['500 Active Listings', 'Bulk CSV / Excel Inventory Upload', 'Dedicated Dealer Showcase Profile', 'Buyer Lead Phone Numbers', 'Priority Support'] },
    { id: 'enterprise', name: 'Enterprise', priceMonthlyInr: 9999, monthlyListings: 99999, boostCredits: 200, features: ['Unlimited Inventory Ads', 'Direct REST API Integration', 'Multi-agent Team Accounts', 'Automated Instant Moderation', 'Dedicated Account Manager'] },
  ],
  displayAdvertising: {
    enabled: true,
    placements: [
      { slot: 'HERO_LEADERBOARD', ratePerDayInr: 299, cpmInr: 60, description: 'Top banner on Home & Category pages' },
      { slot: 'IN_FEED_SPONSORED', ratePerDayInr: 149, cpmInr: 35, description: 'Native sponsored card inside ad feed' },
      { slot: 'SIDEBAR_STICKY', ratePerDayInr: 199, cpmInr: 45, description: 'Sticky ad banner on desktop search & details' },
    ],
  },
};

let inMemoryPolicy: RevenuePolicy | null = null;
let inMemoryPolicyTime = 0;
const IN_MEMORY_TTL_MS = 30000;

export class RevenueService {
  static async getPolicy(): Promise<RevenuePolicy> {
    const now = Date.now();
    if (inMemoryPolicy && now - inMemoryPolicyTime < IN_MEMORY_TTL_MS) {
      return inMemoryPolicy;
    }

    // 1. Try Redis cache (high performance, shared across cluster)
    try {
      const redisPolicy = await getCache<RevenuePolicy>(REDIS_POLICY_KEY);
      if (redisPolicy) {
        inMemoryPolicy = redisPolicy;
        inMemoryPolicyTime = now;
        return redisPolicy;
      }
    } catch {}

    // 2. Fallback to PostgreSQL platform_settings
    let policy: RevenuePolicy = DEFAULT_REVENUE_POLICY;
    try {
      const setting = await prisma.platformSetting.findUnique({
        where: { key: POLICY_SETTING_KEY },
      });
      if (setting && setting.value) {
        policy = setting.value as unknown as RevenuePolicy;
      }
    } catch {}

    // Ensure test_1 is always present in extraPackages
    if (!policy.postingLimit.extraPackages.some((p) => p.id === 'test_1')) {
      policy.postingLimit.extraPackages.unshift({
        id: 'test_1',
        name: '1 Extra Ad (Test ₹1)',
        adsCount: 1,
        priceInr: 1,
        validityDays: 30,
        badge: 'Test ₹1',
        description: 'Testing pack for ₹1 rupee',
      });
    }

    // 3. Cache into Redis (24h TTL) & in-memory
    setCache(REDIS_POLICY_KEY, policy, 86400).catch(() => {});
    inMemoryPolicy = policy;
    inMemoryPolicyTime = now;
    return policy;
  }

  static async updatePolicy(newPolicy: Partial<RevenuePolicy>, adminId?: string): Promise<RevenuePolicy> {
    const current = await this.getPolicy();
    const merged: RevenuePolicy = {
      ...current,
      ...newPolicy,
      postingLimit: { ...current.postingLimit, ...(newPolicy.postingLimit || {}) },
      displayAdvertising: { ...current.displayAdvertising, ...(newPolicy.displayAdvertising || {}) },
      updatedAt: new Date().toISOString(),
      updatedBy: adminId || 'admin',
    };

    await prisma.platformSetting.upsert({
      where: { key: POLICY_SETTING_KEY },
      update: { value: merged as any, updatedBy: adminId || null },
      create: { key: POLICY_SETTING_KEY, value: merged as any, updatedBy: adminId || null },
    });

    // Invalidate and update Redis cache immediately
    await setCache(REDIS_POLICY_KEY, merged, 86400);
    inMemoryPolicy = merged;
    inMemoryPolicyTime = Date.now();
    return merged;
  }

  static async resetPolicy(adminId?: string): Promise<RevenuePolicy> {
    const reset = {
      ...DEFAULT_REVENUE_POLICY,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId || 'admin',
    };

    await prisma.platformSetting.upsert({
      where: { key: POLICY_SETTING_KEY },
      update: { value: reset as any, updatedBy: adminId || null },
      create: { key: POLICY_SETTING_KEY, value: reset as any, updatedBy: adminId || null },
    });

    // Invalidate and update Redis cache immediately
    await setCache(REDIS_POLICY_KEY, reset, 86400);
    inMemoryPolicy = reset;
    inMemoryPolicyTime = Date.now();
    return reset;
  }

  static async getUserListingQuota(userId: string): Promise<UserQuotaResponse> {
    const policy = await this.getPolicy();
    const cycleDays = policy.postingLimit.cycleDays || 30;
    const cycleStartDate = new Date(Date.now() - cycleDays * 24 * 60 * 60 * 1000);
    const cycleEndDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Count valid user ads created in rolling window
    const usedThisMonth = await prisma.ad.count({
      where: {
        userId,
        status: { in: [AdStatus.ACTIVE, AdStatus.PENDING_REVIEW, AdStatus.SOLD, AdStatus.EXPIRED, AdStatus.DRAFT] },
        createdAt: { gte: cycleStartDate },
      },
    });

    // Check user's paid listing credits from successful PaymentOrder
    const paidOrders = await prisma.paymentOrder.findMany({
      where: {
        userId,
        status: 'SUCCESS',
        purpose: { in: [PaymentPurpose.SELLER_SUBSCRIPTION, PaymentPurpose.OTHER] },
        createdAt: { gte: cycleStartDate },
      },
    });

    let totalPaidAds = 0;
    let subscriptionTier = 'INDIVIDUAL';

    paidOrders.forEach((order) => {
      const meta = (order.metadata as any) || {};
      if (meta.adsCount) totalPaidAds += Number(meta.adsCount) || 0;
      if (meta.subscriptionTier) subscriptionTier = meta.subscriptionTier;
    });

    const freeLimit = policy.postingLimit.freeAdsPerMonth;
    const usedFreeAds = Math.min(usedThisMonth, freeLimit);
    const remainingFreeAds = Math.max(0, freeLimit - usedThisMonth);
    const usedPaidAds = Math.max(0, usedThisMonth - freeLimit);
    const remainingPaidAds = Math.max(0, totalPaidAds - usedPaidAds);
    const totalAllowedAds = freeLimit + totalPaidAds;
    const totalAvailableListings = remainingFreeAds + remainingPaidAds;
    const isLimitReached = totalAvailableListings <= 0;

    return {
      userId,
      freeAdsLimit: freeLimit,
      usedThisMonth,
      usedFreeAds,
      remainingFreeAds,
      totalPaidAds,
      usedPaidAds,
      paidAdsBalance: remainingPaidAds,
      totalAllowedAds,
      totalAvailableListings,
      isLimitReached,
      subscriptionTier,
      cycleStartDate: cycleStartDate.toISOString(),
      cycleEndDate: cycleEndDate.toISOString(),
      extraPackages: policy.postingLimit.extraPackages,
      boostPackages: policy.boostPackages,
      featuredPackages: policy.featuredPackages,
    };
  }

  static async assertListingAllowed(userId: string): Promise<void> {
    const quota = await this.getUserListingQuota(userId);
    if (quota.isLimitReached) {
      throw new AppError(
        402,
        'LISTING_LIMIT_REACHED',
        `Monthly free listing limit reached (${quota.usedThisMonth}/${quota.freeAdsLimit} ads used). Please purchase an additional listing package or upgrade to Pro to continue.`
      );
    }
  }
}

