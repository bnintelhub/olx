import { NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma';

export async function dispatchNotificationJob(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: unknown;
}): Promise<void> {
  try {
    // Chat messages have their own real-time socket events and conversation unread counters.
    // They must NEVER collide with or pollute the system notifications table.
    if (input.type === NotificationType.CHAT_MESSAGE || (input.type as string) === 'CHAT_MESSAGE') {
      return;
    }

    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data as never,
      },
    });
  } catch (err: any) {
    console.error('[Job: Notification] Failed to create notification:', err.message);
  }
}
