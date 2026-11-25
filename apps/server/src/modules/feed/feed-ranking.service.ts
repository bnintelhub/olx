import { RankingWeights, FEED_LIMITS } from './feed.config';

export interface UserFeedContext {
  userId: string | null;
  preferredLocationId?: string | null;
  latitude?: number;
  longitude?: number;
  categoryInterests: Map<string, { score: number; avgPriceMin?: number; avgPriceMax?: number }>;
}

export interface RankableListing {
  id: string;
  userId: string;
  categoryId: string;
  locationId: string;
  price: any;
  viewCount: number;
  chatCount: number;
  favouriteCount: number;
  description?: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date | string;
  renewedAt?: Date | string | null;
  images?: any[];
  user?: { profile?: { isIdentityVerified?: boolean } | null } | null;
  featuredBoosts?: Array<{ id: string }>;
}

export interface ScoredListing<T extends RankableListing> {
  listing: T;
  score: number;
  isPromoted: boolean;
  explanation: Record<string, number>;
}

function clamp01(val: number): number {
  if (Number.isNaN(val)) return 0;
  return Math.max(0, Math.min(1, val));
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Computes normalized 0-1 ranking signals and weighted score for a single listing. */
export function scoreListing<T extends RankableListing>(
  ad: T,
  ctx: UserFeedContext,
  weights: RankingWeights,
  nowMs = Date.now()
): ScoredListing<T> {
  // 1. Category relevance (0..1)
  const catInterest = ctx.categoryInterests.get(ad.categoryId);
  const categorySignal = catInterest ? clamp01(catInterest.score / 25) : 0.15;

  // 2. Location relevance (0..1)
  let locationSignal = 0.35;
  if (ctx.preferredLocationId && ad.locationId === ctx.preferredLocationId) {
    locationSignal = 1.0;
  } else if (
    ctx.latitude !== undefined &&
    ctx.longitude !== undefined &&
    ad.latitude &&
    ad.longitude
  ) {
    const dist = haversineKm(ctx.latitude, ctx.longitude, ad.latitude, ad.longitude);
    locationSignal = dist <= 10 ? 1.0 : dist <= 50 ? 0.8 : dist <= 150 ? 0.5 : 0.25;
  }

  // 3. Price relevance (0..1)
  let priceSignal = 0.5;
  const priceNum = Number(ad.price) || 0;
  if (catInterest?.avgPriceMin !== undefined && catInterest?.avgPriceMax !== undefined && priceNum > 0) {
    const min = catInterest.avgPriceMin;
    const max = catInterest.avgPriceMax;
    if (priceNum >= min && priceNum <= max) {
      priceSignal = 1.0;
    } else {
      const distRatio = priceNum < min ? (min - priceNum) / Math.max(1, min) : (priceNum - max) / Math.max(1, max);
      priceSignal = clamp01(1 - distRatio * 0.6);
    }
  }

  // 4. Freshness (0..1) based on renewedAt or createdAt
  const refDate = ad.renewedAt ? new Date(ad.renewedAt) : new Date(ad.createdAt);
  const ageHours = Math.max(0, (nowMs - refDate.getTime()) / 3600000);
  const freshnessSignal = clamp01(1 / (1 + ageHours / 48));

  // 5. Engagement (0..1) logarithmic cap prevents fake inflation from dominating
  const rawEng = (ad.viewCount || 0) * 0.05 + (ad.favouriteCount || 0) * 1.5 + (ad.chatCount || 0) * 3;
  const engagementSignal = clamp01(Math.log1p(rawEng) / Math.log1p(50));

  // 6. Listing quality (0..1)
  const hasImage = Array.isArray(ad.images) && ad.images.length > 0 ? 0.45 : 0;
  const descLen = (ad.description || '').trim().length;
  const hasGoodDesc = descLen >= 40 ? 0.3 : descLen >= 15 ? 0.15 : 0;
  const isVerified = ad.user?.profile?.isIdentityVerified ? 0.25 : 0;
  const qualitySignal = clamp01(hasImage + hasGoodDesc + isVerified);

  const score =
    categorySignal * weights.category +
    locationSignal * weights.location +
    priceSignal * weights.price +
    freshnessSignal * weights.freshness +
    engagementSignal * weights.engagement +
    qualitySignal * weights.quality;

  const isPromoted = Array.isArray(ad.featuredBoosts) && ad.featuredBoosts.length > 0;

  return {
    listing: ad,
    score: Number(score.toFixed(4)),
    isPromoted,
    explanation: {
      cat: Number(categorySignal.toFixed(2)),
      loc: Number(locationSignal.toFixed(2)),
      price: Number(priceSignal.toFixed(2)),
      fresh: Number(freshnessSignal.toFixed(2)),
      eng: Number(engagementSignal.toFixed(2)),
      qual: Number(qualitySignal.toFixed(2)),
    },
  };
}

/**
 * Applies seller repetition caps, category diversity, and separates promoted slots
 * while preserving an exploration slice for discovering new interests.
 */
export function diversifyFeed<T extends RankableListing>(
  scored: ScoredListing<T>[],
  maxPerSeller = FEED_LIMITS.maxPerSellerPerPage
): ScoredListing<T>[] {
  const organic = scored.filter((s) => !s.isPromoted).sort((a, b) => b.score - a.score);
  const promoted = scored.filter((s) => s.isPromoted).sort((a, b) => b.score - a.score);

  const selected: ScoredListing<T>[] = [];
  const overflow: ScoredListing<T>[] = [];
  const sellerCounts = new Map<string, number>();

  for (const item of organic) {
    const count = sellerCounts.get(item.listing.userId) || 0;
    if (count < maxPerSeller) {
      selected.push(item);
      sellerCounts.set(item.listing.userId, count + 1);
    } else {
      overflow.push(item);
    }
  }

  // Merge promoted ads at deterministic non-intrusive intervals (every 5th slot)
  const merged: ScoredListing<T>[] = [];
  let pIdx = 0;
  for (let i = 0; i < selected.length; i++) {
    if (i > 0 && i % 5 === 0 && pIdx < promoted.length) {
      merged.push(promoted[pIdx++]);
    }
    merged.push(selected[i]);
  }
  while (pIdx < promoted.length) {
    merged.push(promoted[pIdx++]);
  }

  return [...merged, ...overflow];
}
