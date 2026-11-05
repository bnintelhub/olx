import { Queue } from 'bullmq';
import { MediaResource } from '@olx/shared';
import { env } from '../config/env';

export interface MediaProcessJobData {
  mediaId: string;
  tempPath: string;
  userId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  baseUrl?: string;
  resource?: MediaResource;
  resourceId?: string;
  mediaType?: string;
}

export interface MediaDeadLetterJobData extends MediaProcessJobData {
  originalJobId?: string;
  error: string;
  stack?: string;
  attemptsMade: number;
  failedAt: string;
}

const connection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
};

// Primary Media Processing Queue with exponential retry policy
export const mediaQueue = new Queue<MediaProcessJobData>('media-process', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s backoff
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // Keep completed job telemetry for 24h
    },
    removeOnFail: false, // Keep in Redis until dead-letter processing
  },
});

// Dead Letter Queue (DLQ) for poisoned or exhausted media jobs
export const mediaDeadLetterQueue = new Queue<MediaDeadLetterJobData>('media-dead-letter', {
  connection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});

// Non-blocking fire-and-forget enqueue
export async function queueMediaProcessingJob(data: MediaProcessJobData) {
  return mediaQueue.add('process-image', data, {
    jobId: data.mediaId,
  });
}


