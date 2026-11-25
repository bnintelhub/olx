import { Queue } from 'bullmq';
import { getRedisBullConnection } from '../config/redis';

export type FeedEventType =
  | 'IMPRESSION'
  | 'CLICK'
  | 'VIEW'
  | 'SEARCH'
  | 'CATEGORY_BROWSE'
  | 'WISHLIST'
  | 'CHAT';

export interface FeedInteractionEventPayload {
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

export type FeedJobData =
  | {
      type: 'TRACK_EVENTS';
      events: FeedInteractionEventPayload[];
    }
  | {
      type: 'REFRESH_USER_CANDIDATES';
      userId: string;
    };

const connection = getRedisBullConnection();

export const feedEventsQueue = new Queue<FeedJobData>('feed-events', {
  connection,
  skipVersionCheck: true,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

feedEventsQueue.on('error', (err) => {
  console.warn('[BullMQ Feed Queue] Redis connection warning:', err.message);
});

export async function dispatchFeedEventsJob(events: FeedInteractionEventPayload[]): Promise<string | null> {
  if (!events.length) return null;
  const dedupeKey = events.length === 1 ? `evt_${events[0].eventId}` : undefined;
  const job = await feedEventsQueue.add(
    'track-events',
    { type: 'TRACK_EVENTS', events },
    dedupeKey ? { jobId: dedupeKey } : undefined
  );
  return job.id || null;
}

export async function dispatchFeedCandidateRefreshJob(userId: string): Promise<string | null> {
  if (!userId) return null;
  // Coalesce concurrent refresh requests per user via deterministic jobId
  const job = await feedEventsQueue.add(
    'refresh-candidates',
    { type: 'REFRESH_USER_CANDIDATES', userId },
    { jobId: `refresh_${userId}` }
  );
  return job.id || null;
}
