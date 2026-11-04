import { z } from 'zod';

export const startConversationSchema = z.object({
  adId: z.string().uuid('Valid Ad ID is required'),
  initialMessage: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
