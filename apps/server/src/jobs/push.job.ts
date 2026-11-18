import { Queue } from 'bullmq';
import { getRedisBullConnection } from '../config/redis';

export type PushJobData =
  | {
      type: 'CHAT_MESSAGE';
      payload: {
        recipientId: string;
        senderId: string;
        senderName: string;
        senderAvatar?: string | null;
        messageText: string;
        conversationId: string;
        messageId?: string;
        attachmentUrl?: string | null;
        priority?: 'HIGH' | 'NORMAL';
      };
    }
  | {
      type: 'NOTIFICATION';
      payload: {
        recipientId: string;
        title: string;
        body: string;
        notificationId: string;
        type?: string;
        clickUrl?: string;
        data?: Record<string, any>;
        priority?: 'HIGH' | 'NORMAL';
      };
    }
  | {
      type: 'DIRECT_TEST';
      payload: {
        token: string;
        userName: string;
      };
    };

const connection = getRedisBullConnection();

export const pushQueue = new Queue<PushJobData>('push-notifications', {
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

pushQueue.on('error', (err) => {
  console.warn('[BullMQ Push Queue] Redis connection warning:', err.message);
});

/**
 * Enqueues a chat message push notification into BullMQ for asynchronous worker processing.
 * Returns in <2ms without waiting for external FCM roundtrips.
 */
export async function dispatchChatPushJob(payload: {
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  messageText: string;
  conversationId: string;
  messageId?: string;
  attachmentUrl?: string | null;
  priority?: 'HIGH' | 'NORMAL';
}): Promise<string> {
  const job = await pushQueue.add('chat-push', {
    type: 'CHAT_MESSAGE',
    payload,
  });
  return job.id || 'job-queued';
}

/**
 * Enqueues an in-app/system notification push fallback into BullMQ.
 */
export async function dispatchNotificationPushJob(payload: {
  recipientId: string;
  title: string;
  body: string;
  notificationId: string;
  type?: string;
  clickUrl?: string;
  data?: Record<string, any>;
  priority?: 'HIGH' | 'NORMAL';
}): Promise<string> {
  const job = await pushQueue.add('notification-push', {
    type: 'NOTIFICATION',
    payload,
  });
  return job.id || 'job-queued';
}

/**
 * Enqueues a direct test push into BullMQ.
 */
export async function dispatchTestPushJob(payload: {
  token: string;
  userName: string;
}): Promise<string> {
  const job = await pushQueue.add('direct-test-push', {
    type: 'DIRECT_TEST',
    payload,
  });
  return job.id || 'job-queued';
}

export async function closePushQueue(): Promise<void> {
  await pushQueue.close();
}
