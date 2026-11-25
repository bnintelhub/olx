import { Worker, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@olx/database';
import { getRedisBullConnection } from '../config/env';

type FeedEventType =
  | 'IMPRESSION'
  | 'CLICK'
  | 'VIEW'
  | 'SEARCH'
  | 'CATEGORY_BROWSE'
  | 'WISHLIST'
  | 'CHAT';

interface FeedInteractionEvent {
  eventId: string;
  userId: string | null;
  sessionId: string | null;
  listingId?: string | null;
  categoryId?: string | null;
  eventType: FeedEventType;
  feedPosition?: number;
  feedVersion?: string;
  metadata?: Record<string, any>;
  occurredAt: string;
}

type FeedJobData =
  | { type: 'TRACK_EVENTS'; events: FeedInteractionEvent[] }
  | { type: 'REFRESH_USER_CANDIDATES'; userId: string };

const SIGNAL_WEIGHTS: Record<FeedEventType, number> = {
  IMPRESSION: 0.15,
  CLICK: 1.0,
  VIEW: 1.5,
  SEARCH: 1.5,
  CATEGORY_BROWSE: 1.2,
  WISHLIST: 3.0,
  CHAT: 5.0,
};

async function processTrackEvents(events: FeedInteractionEvent[], redisClient: Redis) {
  if (!events.length) return;

  // 1. Bulk idempotent insert of user interactions
  await prisma.userInteraction.createMany({
    data: events.map((e) => ({
      eventId: e.eventId,
      userId: e.userId,
      sessionId: e.sessionId,
      listingId: e.listingId || null,
      categoryId: e.categoryId || null,
      eventType: e.eventType,
      metadata: (e.metadata as any) || undefined,
    })),
    skipDuplicates: true,
  });

  // 2. Bulk insert feed impressions where applicable
  const impressionRows = events
    .filter((e) => e.eventType === 'IMPRESSION' && Boolean(e.listingId))
    .map((e) => ({
      userId: e.userId,
      sessionId: e.sessionId,
      listingId: e.listingId!,
      feedPosition: e.feedPosition ?? 0,
      feedVersion: e.feedVersion || 'v1',
    }));

  if (impressionRows.length > 0) {
    await prisma.feedImpression.createMany({ data: impressionRows });
  }

  // 3. Fetch listing context (price, locationId, categoryId) in one batched query
  const listingIds = Array.from(
    new Set(events.map((e) => e.listingId).filter((id): id is string => Boolean(id)))
  );
  const adMap = new Map<string, { categoryId: string; locationId: string; price: number }>();
  if (listingIds.length > 0) {
    const ads = await prisma.ad.findMany({
      where: { id: { in: listingIds } },
      select: { id: true, categoryId: true, locationId: true, price: true },
    });
    for (const ad of ads) {
      adMap.set(ad.id, {
        categoryId: ad.categoryId,
        locationId: ad.locationId,
        price: Number(ad.price),
      });
    }
  }

  // 4. Aggregate interest increments per (userId, categoryId)
  const touchedUsers = new Set<string>();
  const interestDeltas = new Map<
    string,
    { userId: string; categoryId: string; delta: number; prices: number[]; locationId?: string }
  >();

  for (const evt of events) {
    if (!evt.userId) continue;
    touchedUsers.add(evt.userId);

    const adInfo = evt.listingId ? adMap.get(evt.listingId) : undefined;
    const catId = evt.categoryId || adInfo?.categoryId;
    if (!catId) continue;

    const key = `${evt.userId}:${catId}`;
    const existing = interestDeltas.get(key) || {
      userId: evt.userId,
      categoryId: catId,
      delta: 0,
      prices: [],
      locationId: adInfo?.locationId,
    };
    existing.delta += SIGNAL_WEIGHTS[evt.eventType] || 0.5;
    if (adInfo?.price && adInfo.price > 0) existing.prices.push(adInfo.price);
    if (adInfo?.locationId) existing.locationId = adInfo.locationId;
    interestDeltas.set(key, existing);

    // Track recent viewed listings in Redis (bounded list of 30)
    if (evt.listingId && (evt.eventType === 'VIEW' || evt.eventType === 'CLICK')) {
      const recentKey = `recent:user:${evt.userId}`;
      await redisClient
        .pipeline()
        .lpush(recentKey, evt.listingId)
        .ltrim(recentKey, 0, 29)
        .expire(recentKey, 86400 * 7)
        .exec()
        .catch(() => {});
    }
  }

  for (const entry of interestDeltas.values()) {
    const existing = await prisma.userInterest.findUnique({
      where: { userId_categoryId: { userId: entry.userId, categoryId: entry.categoryId } },
    });
    const decayedPrev = existing ? existing.interestScore * 0.96 : 0;
    const newScore = Math.min(100, decayedPrev + entry.delta);

    const avgPrice =
      entry.prices.length > 0
        ? entry.prices.reduce((a, b) => a + b, 0) / entry.prices.length
        : undefined;
    const prevMin = existing?.avgPriceMin ? Number(existing.avgPriceMin) : avgPrice;
    const prevMax = existing?.avgPriceMax ? Number(existing.avgPriceMax) : avgPrice;

    const nextMin =
      avgPrice !== undefined
        ? prevMin !== undefined
          ? Math.min(prevMin, avgPrice * 0.7)
          : avgPrice * 0.7
        : prevMin;
    const nextMax =
      avgPrice !== undefined
        ? prevMax !== undefined
          ? Math.max(prevMax, avgPrice * 1.4)
          : avgPrice * 1.4
        : prevMax;

    await prisma.userInterest.upsert({
      where: { userId_categoryId: { userId: entry.userId, categoryId: entry.categoryId } },
      create: {
        userId: entry.userId,
        categoryId: entry.categoryId,
        interestScore: newScore,
        avgPriceMin: nextMin ?? null,
        avgPriceMax: nextMax ?? null,
        preferredLocationId: entry.locationId || null,
      },
      update: {
        interestScore: newScore,
        ...(nextMin !== undefined ? { avgPriceMin: nextMin } : {}),
        ...(nextMax !== undefined ? { avgPriceMax: nextMax } : {}),
        ...(entry.locationId ? { preferredLocationId: entry.locationId } : {}),
      },
    });
  }

  // Refresh cached interest profile & invalidate stale feed cache for touched users
  for (const uid of touchedUsers) {
    const interests = await prisma.userInterest.findMany({
      where: { userId: uid },
      orderBy: { interestScore: 'desc' },
      take: 10,
      select: { categoryId: true, interestScore: true, avgPriceMin: true, avgPriceMax: true, preferredLocationId: true },
    });
    await redisClient.set(`interest:user:${uid}`, JSON.stringify(interests), 'EX', 1800).catch(() => {});
    await redisClient.del(`feed:user:${uid}`).catch(() => {});
  }
}

async function processRefreshUserCandidates(userId: string, redisClient: Redis) {
  const interests = await prisma.userInterest.findMany({
    where: { userId },
    orderBy: { interestScore: 'desc' },
    take: 6,
  });
  if (interests.length === 0) return;

  const topCatIds = interests.map((i) => i.categoryId);
  const now = new Date();

  const ads = await prisma.ad.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      expiresAt: { gt: now },
      userId: { not: userId },
      categoryId: { in: topCatIds },
    },
    select: {
      id: true,
      categoryId: true,
      locationId: true,
      price: true,
      viewCount: true,
      chatCount: true,
      favouriteCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
  });

  if (ads.length === 0) return;

  const interestMap = new Map(interests.map((i) => [i.categoryId, i]));
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

  const scored = ads.map((ad) => {
    const intr = interestMap.get(ad.categoryId);
    const catScore = intr ? Math.min(1, intr.interestScore / 25) : 0.2;
    const locScore = intr?.preferredLocationId && intr.preferredLocationId === ad.locationId ? 1 : 0.3;
    const ageHours = Math.max(0, (Date.now() - ad.createdAt.getTime()) / 3600000);
    const freshScore = 1 / (1 + ageHours / 48);
    const engScore = Math.min(1, (ad.viewCount * 0.02 + ad.favouriteCount * 0.2 + ad.chatCount * 0.4) / 5);
    const total = Number((catScore * 0.4 + locScore * 0.2 + freshScore * 0.25 + engScore * 0.15).toFixed(4));

    return {
      userId,
      listingId: ad.id,
      score: total,
      reason: 'interest_category',
      expiresAt,
    };
  });

  await prisma.$transaction([
    prisma.recommendationCandidate.deleteMany({ where: { userId } }),
    prisma.recommendationCandidate.createMany({ data: scored, skipDuplicates: true }),
  ]);

  const compact = scored
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ id: s.listingId, score: s.score }));
  await redisClient.set(`feed:user:${userId}`, JSON.stringify(compact), 'EX', 120).catch(() => {});
}

export function startFeedWorker() {
  const connection = getRedisBullConnection();
  const redisClient = new Redis(connection);
  const concurrency = Math.max(1, Math.min(4, Number(process.env.FEED_WORKER_CONCURRENCY) || 2));

  const dlq = new Queue('feed-events-dlq', {
    connection,
    skipVersionCheck: true,
    defaultJobOptions: { removeOnComplete: false, removeOnFail: false },
  });
  dlq.on('error', () => {});

  const worker = new Worker<FeedJobData>(
    'feed-events',
    async (job: Job<FeedJobData>) => {
      try {
        if (job.data.type === 'TRACK_EVENTS') {
          await processTrackEvents(job.data.events, redisClient);
        } else if (job.data.type === 'REFRESH_USER_CANDIDATES') {
          await processRefreshUserCandidates(job.data.userId, redisClient);
        }
      } catch (err: any) {
        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
          await dlq.add('failed-feed-job', {
            jobId: job.id,
            data: job.data,
            error: err?.message || 'Unknown error',
            failedAt: new Date().toISOString(),
          }).catch(() => {});
        }
        throw err;
      }
    },
    { connection, concurrency, skipVersionCheck: true }
  );

  worker.on('error', (err) => {
    console.warn('[Worker - feed-events] Redis warning:', err.message);
  });

  // Periodic bounded cleanup of expired candidates & 30-day-old impressions (every 10 minutes)
  const cleanupTimer = setInterval(async () => {
    try {
      await prisma.recommendationCandidate.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await prisma.feedImpression.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
    } catch {
      // Quiet fail in periodic housekeeping
    }
  }, 10 * 60 * 1000);

  return {
    close: async () => {
      clearInterval(cleanupTimer);
      await worker.close();
      await dlq.close().catch(() => {});
      await redisClient.quit().catch(() => {});
    },
  };
}
