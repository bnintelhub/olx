import { NotificationType } from '@prisma/client';
import { prisma } from '../prisma';
import { SettingsService } from './settings.service';

export async function sendConfiguredNotification(input: { userId: string; type: NotificationType; templateKey: string; values?: Record<string, string>; data?: unknown }) {
  const templates = await SettingsService.get<Record<string, { title: string; body: string }>>('notificationTemplates');
  const template = templates[input.templateKey];
  const replace = (text: string) => text.replace(/{{(\w+)}}/g, (_, key) => input.values?.[key] || '');
  return prisma.notification.create({ data: {
    userId: input.userId, type: input.type,
    title: template ? replace(template.title) : input.templateKey,
    body: template ? replace(template.body) : '', data: input.data as never,
  }});
}
