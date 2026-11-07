import { MessageType, MessageStatus, ReportReason, ReportStatus } from '@prisma/client';

export interface ChatParticipant {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role: 'Buyer' | 'Seller';
  isOnline?: boolean;
}

export interface ChatListingSummary {
  id: string;
  title: string;
  price: number;
  status: string;
  slug?: string | null;
  imageUrl?: string | null;
}

export interface ChatConversationSummary {
  id: string;
  adId: string;
  ad: ChatListingSummary;
  otherParty: ChatParticipant;
  lastMessageText: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  isBlocked: boolean;
  status: string;
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string | null;
  type: MessageType;
  content: string;
  attachmentUrl?: string | null;
  replyToMessageId?: string | null;
  status: MessageStatus;
  isDeleted: boolean;
  createdAt: Date;
  sender: {
    id: string;
    profile?: {
      name: string;
      avatarUrl?: string | null;
    } | null;
  };
}

export interface SpamCheckResult {
  allowed: boolean;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  safetyNotice?: string | null;
  reason?: string | null;
}

export interface SendMessagePayload {
  conversationId: string;
  content?: string;
  attachmentUrl?: string;
  clientMessageId?: string;
  replyToMessageId?: string;
}

export interface ClientToServerEvents {
  'conversation.join': (data: { conversationId: string }) => void;
  'conversation.leave': (data: { conversationId: string }) => void;
  'message.send': (data: SendMessagePayload) => void;
  'message.read': (data: { conversationId: string }) => void;
  'typing.start': (data: { conversationId: string }) => void;
  'typing.stop': (data: { conversationId: string }) => void;
  'presence.subscribe': (data: { userIds: string[] }) => void;
}

export interface ServerToClientEvents {
  'message.new': (data: ChatMessageItem) => void;
  'message.sent': (data: { messageId: string; conversationId: string; clientMessageId?: string; status: string; createdAt: string }) => void;
  'message.delivered': (data: { messageId: string; conversationId: string }) => void;
  'message.read': (data: { conversationId: string; readerId: string; readAt: string }) => void;
  'typing.start': (data: { conversationId: string; userId: string }) => void;
  'typing.stop': (data: { conversationId: string; userId: string }) => void;
  'conversation.updated': (data: { conversationId: string; lastMessageText: string; lastMessageAt: string; senderId: string }) => void;
  'user.blocked': (data: { userId: string }) => void;
  'user.unblocked': (data: { userId: string }) => void;
  'system.message': (data: { conversationId: string; text: string }) => void;
  'presence.update': (data: { userId: string; isOnline: boolean }) => void;
  error: (data: { code: string; message: string }) => void;
}
