import { z } from 'zod';
import { ReportReason } from '@prisma/client';

export const startConversationSchema = z.object({
  adId: z.string().uuid('Valid Ad ID is required'),
  initialMessage: z.string().max(1000).optional(),
  clientMessageId: z.string().max(64).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().max(2000).optional(),
  attachmentUrl: z.string().url().optional(),
  clientMessageId: z.string().max(64).optional(),
  replyToMessageId: z.string().uuid().optional(),
});

export const blockUserSchema = z.object({
  targetUserId: z.string().uuid('Valid target User ID is required'),
});

export const reportChatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  reportedUserId: z.string().uuid().optional(),
  reason: z.nativeEnum(ReportReason),
  details: z.string().max(1000).optional(),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(5).max(100).default(30),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type ReportChatInput = z.infer<typeof reportChatSchema>;
