import crypto from 'crypto';
import { env } from '../../config/env';

export interface RankingWeights {
  category: number;
  location: number;
  price: number;
  freshness: number;
  engagement: number;
  quality: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  category: 0.30,
  location: 0.20,
  price: 0.15,
  freshness: 0.15,
  engagement: 0.10,
  quality: 0.10,
};

/** Loads configurable ranking weights from FEED_WEIGHTS_JSON if set, falling back to safe defaults. */
export function getRankingWeights(): RankingWeights {
  if (!env.FEED_WEIGHTS_JSON) return DEFAULT_RANKING_WEIGHTS;
  try {
    const parsed = JSON.parse(env.FEED_WEIGHTS_JSON);
    const merged: RankingWeights = {
      category: Number(parsed.category ?? DEFAULT_RANKING_WEIGHTS.category),
      location: Number(parsed.location ?? DEFAULT_RANKING_WEIGHTS.location),
      price: Number(parsed.price ?? DEFAULT_RANKING_WEIGHTS.price),
      freshness: Number(parsed.freshness ?? DEFAULT_RANKING_WEIGHTS.freshness),
      engagement: Number(parsed.engagement ?? DEFAULT_RANKING_WEIGHTS.engagement),
      quality: Number(parsed.quality ?? DEFAULT_RANKING_WEIGHTS.quality),
    };
    const sum = Object.values(merged).reduce((a, b) => a + b, 0);
    if (sum <= 0 || Number.isNaN(sum)) return DEFAULT_RANKING_WEIGHTS;
    return merged;
  } catch {
    return DEFAULT_RANKING_WEIGHTS;
  }
}

export const FEED_LIMITS = {
  version: env.FEED_VERSION || 'v1',
  defaultPageSize: 16,
  maxPageSize: 40,
  candidatePoolLimit: 120,
  trendingPoolLimit: 60,
  maxPerSellerPerPage: 2,
  explorationRatio: 0.15,
  freshInjectionHours: 6,
  // Jittered TTL bounds (seconds) to avoid synchronized cache expiration stampedes
  userFeedTtlMin: 90,
  userFeedTtlMax: 150,
  trendingTtlSec: 180,
  similarTtlSec: 300,
  lockTtlSec: 8,
} as const;

/** Deterministic cohort check (0-100%) for gradual personalization rollout & instant rollback. */
export function isPersonalizationEnabledFor(identityKey: string): boolean {
  if (!env.FEED_PERSONALIZATION_ENABLED) return false;
  const pct = Math.max(0, Math.min(100, Number(env.FEED_ROLLOUT_PERCENT) || 0));
  if (pct === 0) return false;
  if (pct >= 100) return true;

  const hash = crypto.createHash('sha1').update(identityKey).digest();
  const bucket = hash[0] % 100;
  return bucket < pct;
}

/** Returns a jittered TTL in seconds to prevent thundering herd / simultaneous expiry. */
export function getJitteredFeedTtl(): number {
  const span = FEED_LIMITS.userFeedTtlMax - FEED_LIMITS.userFeedTtlMin;
  return FEED_LIMITS.userFeedTtlMin + Math.floor(Math.random() * (span + 1));
}
