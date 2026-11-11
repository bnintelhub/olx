import { Queue } from 'bullmq';
import { env } from '../config/env';

export interface MediaProcessingJobData {
  assetId: string;
  ownerId: string;
  tempStorageKey: string;
  originalName: string;
  mimeType: string;
  extension: string;
  checksum: string;
  sizeBytes: number;
  entityType?: string;
  entityId?: string;
}

export const MEDIA_QUEUE_NAME = 'media-processing';

let mediaQueue: Queue<MediaProcessingJobData> | null = null;

export function getMediaQueue(): Queue<MediaProcessingJobData> {
  if (!mediaQueue) {
    mediaQueue = new Queue(MEDIA_QUEUE_NAME, {
      connection: {
        url: env.REDIS_URL,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }
  return mediaQueue;
}

export async function enqueueMediaProcessing(data: MediaProcessingJobData) {
  const queue = getMediaQueue();
  return queue.add('process-asset', data, {
    jobId: `media-job-${data.assetId}`,
  });
}

