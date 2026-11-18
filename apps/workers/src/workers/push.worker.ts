import { Worker, Job } from 'bullmq';
import { getRedisBullConnection } from '../config/env';
import { fcmService, ChatPushPayload, NotificationPushPayload } from '../services/fcm.service';

export type PushJobData =
  | {
      type: 'CHAT_MESSAGE';
      payload: ChatPushPayload;
    }
  | {
      type: 'NOTIFICATION';
      payload: NotificationPushPayload;
    }
  | {
      type: 'DIRECT_TEST';
      payload: {
        token: string;
        userName: string;
      };
    };

export function startPushWorker(): Worker<PushJobData> {
  const connection = getRedisBullConnection();

  const worker = new Worker<PushJobData>(
    'push-notifications',
    async (job: Job<PushJobData>) => {
      const data = job.data;
      console.log(`[Worker - push-notifications] Processing job #${job.id} (Type: ${data.type})`);

      switch (data.type) {
        case 'CHAT_MESSAGE': {
          const result = await fcmService.sendChatMessagePush(data.payload);
          return { success: result.sent > 0, ...result };
        }
        case 'NOTIFICATION': {
          const result = await fcmService.sendNotificationPush(data.payload);
          return { success: result.sent > 0, ...result };
        }
        case 'DIRECT_TEST': {
          const success = await fcmService.sendDirectTestPush(data.payload.token, data.payload.userName);
          return { success };
        }
        default:
          throw new Error(`Unsupported push notification job type: ${(data as any)?.type}`);
      }
    },
    {
      connection,
      concurrency: 10,
      skipVersionCheck: true,
    }
  );

  worker.on('error', (err) => {
    console.warn('[Worker - push-notifications] Redis connection warning:', err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker - push-notifications] Job #${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker - push-notifications] Job #${job?.id} failed with error:`, err.message);
  });

  return worker;
}
