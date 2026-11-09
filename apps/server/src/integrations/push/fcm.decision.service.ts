import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { isUserInsideConversation } from '../../modules/chat/chat.socket';

const TRANSACTION_KEYWORDS = [
  'available', 'is this available', 'available?', 'still available',
  'price', 'final price', 'best price', 'last price', 'offer', 'discount',
  'pickup', 'pick up', 'location', 'address', 'where', 'meet',
  'buy', 'sell', 'deal', 'condition', 'bill', 'box', 'warranty',
  'call', 'contact', 'phone', 'number', 'urgent',
  'kitne', 'milega', 'kab', 'kahan', 'lena hai', 'rate'
];

interface PushDecisionParams {
  senderId: string;
  recipientId: string;
  conversationId: string;
  messageId: string;
  content?: string | null;
  attachmentUrl?: string | null;
  isDeleted?: boolean;
}

export interface PushDecisionResult {
  shouldPush: boolean;
  reason?: string;
  priority?: 'HIGH' | 'NORMAL';
  bundledCount?: number;
  bundledBody?: string;
}

class FcmDecisionService {
  private notifiedMessagesMemory = new Set<string>();
  private burstCacheMemory = new Map<string, { count: number; lastTime: number }>();

  /**
   * Action-Required Push Decision Engine for OLX Messaging
   */
  async evaluatePush(params: PushDecisionParams): Promise<PushDecisionResult> {
    const { senderId, recipientId, conversationId, messageId, content, attachmentUrl, isDeleted } = params;

    // 1. Don't notify if sender is the recipient
    if (!recipientId || senderId === recipientId) {
      return { shouldPush: false, reason: 'Sender is recipient' };
    }

    // 2. Don't notify deleted or empty non-attachment messages
    if (isDeleted || (!content && !attachmentUrl)) {
      return { shouldPush: false, reason: 'Message deleted or empty' };
    }

    // 3. Don't notify if user is actively viewing THIS conversation
    if (await isUserInsideConversation(recipientId, conversationId)) {
      return { shouldPush: false, reason: 'Recipient is currently viewing this chat' };
    }

    // 4. Deduplicate message: don't notify same message twice
    if (await this.isMessageAlreadyNotified(messageId)) {
      return { shouldPush: false, reason: 'Message already notified' };
    }

    // 5. Check conversation status & user blocks
    try {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          isBlocked: true,
          status: true,
          buyerId: true,
          sellerId: true,
        },
      });

      if (!conv) {
        return { shouldPush: false, reason: 'Conversation not found' };
      }

      if (conv.isBlocked || conv.status !== 'ACTIVE') {
        return { shouldPush: false, reason: 'Conversation blocked or inactive' };
      }

      // Check if user has blocked sender
      const blockExists = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: recipientId, blockedId: senderId },
            { blockerId: senderId, blockedId: recipientId },
          ],
        },
      });

      if (blockExists) {
        return { shouldPush: false, reason: 'User blocked' };
      }
    } catch (err) {
      console.warn('[FcmDecision] Error querying conversation permissions:', err);
    }

    // Mark message as notified
    await this.markMessageNotified(messageId);

    // 6. Rapid message arrival bundling (< 10 seconds burst window)
    const burst = await this.evaluateBurst(recipientId, conversationId, content || 'Photo');

    // 7. Evaluate notification priority
    const priority = this.evaluatePriority(content);

    return {
      shouldPush: true,
      priority,
      bundledCount: burst.count,
      bundledBody: burst.bundledBody,
    };
  }

  private async isMessageAlreadyNotified(messageId: string): Promise<boolean> {
    if (!messageId) return false;
    if (this.notifiedMessagesMemory.has(messageId)) return true;

    try {
      const exists = await redis.get(`fcm:notified:${messageId}`);
      return Boolean(exists);
    } catch {
      return false;
    }
  }

  private async markMessageNotified(messageId: string): Promise<void> {
    if (!messageId) return;
    this.notifiedMessagesMemory.add(messageId);
    if (this.notifiedMessagesMemory.size > 5000) {
      const firstKey = this.notifiedMessagesMemory.values().next().value;
      if (firstKey) this.notifiedMessagesMemory.delete(firstKey);
    }

    try {
      await redis.set(`fcm:notified:${messageId}`, '1', 'EX', 3600); // 1 hour TTL
    } catch {}
  }

  private async evaluateBurst(
    recipientId: string,
    conversationId: string,
    latestText: string
  ): Promise<{ count: number; bundledBody?: string }> {
    const burstKey = `${recipientId}:${conversationId}`;
    const now = Date.now();
    const memBurst = this.burstCacheMemory.get(burstKey);

    let count = 1;
    if (memBurst && now - memBurst.lastTime < 10000) {
      count = memBurst.count + 1;
    }

    this.burstCacheMemory.set(burstKey, { count, lastTime: now });

    if (count > 1) {
      return {
        count,
        bundledBody: `${count} new messages: "${latestText.slice(0, 60)}"`,
      };
    }

    return { count: 1 };
  }

  private evaluatePriority(content?: string | null): 'HIGH' | 'NORMAL' {
    if (!content) return 'NORMAL';
    const lower = content.toLowerCase();
    for (const kw of TRANSACTION_KEYWORDS) {
      if (lower.includes(kw)) {
        return 'HIGH';
      }
    }
    return 'NORMAL';
  }
}

export const fcmDecisionService = new FcmDecisionService();

