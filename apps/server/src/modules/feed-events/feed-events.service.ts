import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import {
  dispatchFeedEventsJob,
  FeedInteractionEventPayload,
} from '../../jobs/feed.job';
import { SingleEventInput } from './feed-events.schema';

const DEDUPE_WINDOW_SEC: Record<string, number> = {
  IMPRESSION: 15,
  CLICK: 20,
  VIEW: 30,
  SEARCH: 5,
  CATEGORY_BROWSE: 10,
  WISHLIST: 5,
  CHAT: 5,
};

export class FeedEventsService {
  /**
   * Validates, deduplicates, and enqueues interaction events asynchronously.
   * Never trusts client-supplied user_id; always uses authenticated userId or null.
   */
  static async ingest(
    authUserId: string | null,
    headerSessionId: string | null,
    items: SingleEventInput[]
  ): Promise<{ accepted: number; duplicates: number }> {
    const validEvents: FeedInteractionEventPayload[] = [];
    let duplicates = 0;

    // Validate listingIds in a single batched query if any are present
    const listingIds = Array.from(
      new Set(items.map((i) => i.listingId).filter((id): id is string => Boolean(id)))
    );
    let validListingMap = new Map<string, string>();
    if (listingIds.length > 0) {
      const existingAds = await prisma.ad.findMany({
        where: { id: { in: listingIds }, deletedAt: null },
        select: { id: true, categoryId: true },
      });
      validListingMap = new Map(existingAds.map((a) => [a.id, a.categoryId]));
    }

    const nowIso = new Date().toISOString();

    for (const item of items) {
      if (item.listingId && !validListingMap.has(item.listingId)) {
        continue;
      }

      const actorKey = authUserId || item.sessionId || headerSessionId || 'anon';
      const isRedisReady = (redis as any).status === 'ready';

      // Atomic Redis anti-inflation & duplicate-event guard
      if (isRedisReady) {
        try {
          const idKey = `evt:id:${item.eventId}`;
          const setOk = await redis.set(idKey, '1', 'EX', 3600, 'NX');
          if (!setOk) {
            duplicates++;
            continue;
          }

          if (item.listingId) {
            const ttl = DEDUPE_WINDOW_SEC[item.eventType] || 10;
            const throttleKey = `evt:throttle:${actorKey}:${item.eventType}:${item.listingId}`;
            const throttleOk = await redis.set(throttleKey, '1', 'EX', ttl, 'NX');
            if (!throttleOk) {
              duplicates++;
              continue;
            }
          }
        } catch {
          // Graceful degradation: continue to DB unique eventId constraint if Redis fails
        }
      }

      const resolvedCategoryId =
        item.categoryId ||
        (item.listingId ? validListingMap.get(item.listingId) || null : null);

      validEvents.push({
        eventId: item.eventId,
        userId: authUserId,
        sessionId: item.sessionId || headerSessionId || null,
        listingId: item.listingId || null,
        categoryId: resolvedCategoryId,
        eventType: item.eventType,
        feedPosition: item.feedPosition,
        feedVersion: item.feedVersion || 'v1',
        metadata: item.metadata ? sanitizeMetadata(item.metadata) : undefined,
        occurredAt: nowIso,
      });
    }

    if (validEvents.length > 0) {
      try {
        await dispatchFeedEventsJob(validEvents);
      } catch {
        // Fallback: safe idempotent DB write if queue is temporarily unavailable
        await prisma.userInteraction
          .createMany({
            data: validEvents.map((e) => ({
              eventId: e.eventId,
              userId: e.userId,
              sessionId: e.sessionId,
              listingId: e.listingId,
              categoryId: e.categoryId,
              eventType: e.eventType,
              metadata: e.metadata as any,
            })),
            skipDuplicates: true,
          })
          .catch(() => {});
      }
    }

    return { accepted: validEvents.length, duplicates };
  }
}

function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(meta);
  if (json.length <= 1024) return meta;
  return { truncated: true };
}
