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
