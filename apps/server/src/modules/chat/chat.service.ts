import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { MessageType, MessageStatus, ReportReason, ReportStatus, Prisma } from '@prisma/client';
import { dispatchNotificationJob } from '../../jobs/notification.job';
import { ChatAbuseService } from './chat.abuse.service';
import { ChatPresenceService } from './chat.presence.service';
import { ChatConversationSummary, ChatMessageItem, SendMessagePayload } from './chat.types';
import { toPublicMediaUrl } from '../../shared/utils/media-url.util';

function getAdCoverUrl(adImg?: any): string | null {
  if (!adImg) return null;
  const asset = adImg.mediaAsset;
  if (!asset) return null;
  const variants = (asset.variants as any) || {};
  const storageKey = asset.storageKey;
  const thumb = variants.thumb || variants.thumbnail || variants.card || (storageKey ? `${storageKey}/thumb.webp` : null);
  return thumb ? toPublicMediaUrl(thumb) : null;
}

export class ChatService {
  // Start or fetch existing marketplace conversation tied strictly to a listing
  static async startConversation(buyerId: string, adId: string, initialMessage?: string, clientMessageId?: string) {
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: {
        images: { where: { isCover: true }, take: 1 },
        user: { select: { id: true, profile: true, phoneNumber: true } },
      },
    });

    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');
    if (ad.deletedAt) throw new AppError(400, 'AD_DELETED', 'Listing is no longer active');
    if (ad.status === 'REJECTED' || ad.status === 'ARCHIVED') {
      throw new AppError(400, 'AD_UNAVAILABLE', 'Listing is not eligible for chat inquiries');
    }
    if (ad.userId === buyerId) {
      // If seller opens their own listing, check if an inquiry already exists
      const existing = await prisma.conversation.findFirst({
        where: { adId, sellerId: buyerId },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          ad: { select: { id: true, title: true, price: true, slug: true, status: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, include: { mediaAsset: true } } } },
          buyer: { select: { id: true, profile: true } },
          seller: { select: { id: true, profile: true } },
        },
      });

      if (existing) {
        return {
          id: existing.id,
          adId: existing.adId,
          ad: {
            id: existing.ad.id, title: existing.ad.title, price: Number(existing.ad.price),
            status: existing.ad.status, slug: existing.ad.slug, imageUrl: getAdCoverUrl(existing.ad.images[0]),
          },
          otherParty: {
            id: existing.buyer.id, name: existing.buyer.profile?.name || 'Buyer',
            avatarUrl: existing.buyer.profile?.avatarUrl || null, role: 'Buyer' as const,
          },
          lastMessageText: existing.lastMessageText,
          lastMessageAt: existing.lastMessageAt,
          unreadCount: existing.sellerUnreadCount,
          isBlocked: existing.isBlocked,
          status: existing.status,
        };
      }
      throw new AppError(400, 'OWN_AD', 'You cannot initiate a conversation on your own listing');
    }

    const sellerId = ad.userId;

    // Check bidirectional user blocking
    const isBlocked = await prisma.block.findFirst({
      where: { OR: [{ blockerId: buyerId, blockedId: sellerId }, { blockerId: sellerId, blockedId: buyerId }] },
    });
    if (isBlocked) throw new AppError(403, 'USER_BLOCKED', 'Communication is restricted with this user');

    const convInclude = {
      ad: { select: { id: true, title: true, price: true, slug: true, status: true, images: { take: 1, orderBy: { sortOrder: 'asc' as const }, include: { mediaAsset: true } } } },
      buyer: { select: { id: true, profile: true } },
      seller: { select: { id: true, profile: true } },
    };

    // 1. Check if conversation already exists for this ad
    let conversation = await prisma.conversation.findUnique({
      where: { adId_buyerId_sellerId: { adId, buyerId, sellerId } },
      include: convInclude,
    });

    if (!conversation) {
      // Rate-limit new conversations to prevent mass buyer scraping
      const newConvLimit = await ChatAbuseService.checkNewConversationLimit(buyerId);
      if (!newConvLimit.allowed) {
        throw new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many new conversations initiated. Please try again later.');
      }
      const text = (initialMessage || 'Hi, is this still available?').trim();
      const spamCheck = ChatAbuseService.analyzeMessageRisk(text);
      if (!spamCheck.allowed) {
        throw new AppError(400, 'MESSAGE_REJECTED', spamCheck.reason || 'Message violates safety guidelines');
      }

      try {
        conversation = await prisma.$transaction(async (tx) => {
          const createdConv = await tx.conversation.create({
            data: {
              adId, buyerId, sellerId, lastMessageText: text.slice(0, 500), lastMessageAt: new Date(),
              buyerUnreadCount: 0, sellerUnreadCount: 1, status: 'ACTIVE',
            },
          });

          const createdMsg = await tx.message.create({
            data: {
              conversationId: createdConv.id, senderId: buyerId, receiverId: sellerId,
              type: MessageType.TEXT, content: text, status: MessageStatus.SENT, clientMessageId,
            },
          });

          await tx.conversation.update({ where: { id: createdConv.id }, data: { lastMessageId: createdMsg.id } });

          return tx.conversation.findUniqueOrThrow({
            where: { id: createdConv.id },
            include: convInclude,
          });
        });

        void dispatchNotificationJob({
          userId: sellerId, type: 'CHAT_MESSAGE', title: 'New buyer inquiry',
          body: `${conversation.buyer.profile?.name || 'A buyer'} sent you an inquiry on "${ad.title}"`,
          data: { conversationId: conversation.id },
        });
      } catch (err: any) {
        if (err.code === 'P2002' || err.message?.includes('Unique constraint')) {
          conversation = await prisma.conversation.findUniqueOrThrow({
            where: { adId_buyerId_sellerId: { adId, buyerId, sellerId } },
            include: convInclude,
          });
        } else {
          throw err;
        }
      }
    }

    const isBuyer = conversation.buyerId === buyerId;
    const otherParty = isBuyer ? conversation.seller : conversation.buyer;

    return {
      id: conversation.id,
      adId: conversation.adId,
      ad: {
        id: conversation.ad.id, title: conversation.ad.title, price: Number(conversation.ad.price),
        status: conversation.ad.status, slug: conversation.ad.slug, imageUrl: getAdCoverUrl(conversation.ad.images[0]),
      },
      otherParty: {
        id: otherParty.id, name: otherParty.profile?.name || (isBuyer ? 'Seller' : 'Buyer'),
        avatarUrl: otherParty.profile?.avatarUrl || null, role: isBuyer ? ('Seller' as const) : ('Buyer' as const),
      },
      lastMessageText: conversation.lastMessageText,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: isBuyer ? conversation.buyerUnreadCount : conversation.sellerUnreadCount,
      isBlocked: conversation.isBlocked,
      status: conversation.status,
    };
  }

  // Get active conversations inbox with unread counts
  static async getConversations(userId: string, filter: 'all' | 'archived' = 'all') {
    const where: Prisma.ConversationWhereInput = filter === 'archived'
      ? {
          OR: [
            { buyerId: userId, buyerDeletedAt: null, buyerArchivedAt: { not: null } },
            { sellerId: userId, sellerDeletedAt: null, sellerArchivedAt: { not: null } },
          ],
        }
      : {
          OR: [
            { buyerId: userId, buyerDeletedAt: null, buyerArchivedAt: null },
            { sellerId: userId, sellerDeletedAt: null, sellerArchivedAt: null },
          ],
        };

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        ad: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            slug: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' }, include: { mediaAsset: true } },
          },
        },
        buyer: { select: { id: true, profile: { select: { name: true, avatarUrl: true } } } },
        seller: { select: { id: true, profile: { select: { name: true, avatarUrl: true } } } },
      },
    });

    const otherUserIds = conversations.map((c) => (c.buyerId === userId ? c.sellerId : c.buyerId));
    const onlineMap = await ChatPresenceService.getOnlineStatusBatch(otherUserIds);

    let totalUnread = 0;
    const formatted: ChatConversationSummary[] = conversations.map((conv) => {
      const isBuyer = conv.buyerId === userId;
      const unread = isBuyer ? conv.buyerUnreadCount : conv.sellerUnreadCount;
      totalUnread += unread;

      const otherParty = isBuyer ? conv.seller : conv.buyer;

      return {
        id: conv.id, adId: conv.adId,
        ad: {
          id: conv.ad.id, title: conv.ad.title, price: Number(conv.ad.price), status: conv.ad.status,
          slug: conv.ad.slug, imageUrl: getAdCoverUrl(conv.ad.images[0]),
        },
        otherParty: {
          id: otherParty.id, name: otherParty.profile?.name || (isBuyer ? 'Seller' : 'Buyer'),
          avatarUrl: otherParty.profile?.avatarUrl || null, role: isBuyer ? 'Seller' : 'Buyer',
          isOnline: Boolean(onlineMap[otherParty.id]),
        },
        lastMessageText: conv.lastMessageText, lastMessageAt: conv.lastMessageAt,
        unreadCount: unread, isBlocked: conv.isBlocked, status: conv.status,
      };
    });

    return { conversations: formatted, totalUnread };
  }

  // Cursor-based message history pagination
  static async getMessages(userId: string, conversationId: string, cursor?: string, limit = 30) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        ad: { select: { id: true, title: true, price: true, status: true, slug: true, images: { take: 1, include: { mediaAsset: true } } } },
        buyer: { select: { id: true, profile: true } }, seller: { select: { id: true, profile: true } },
      },
    });

    if (!conversation) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this conversation');
    }

    // Auto mark as read on opening
    await this.markAsRead(userId, conversationId);

    const safeLimit = Math.min(Math.max(limit, 10), 100);
    const messages = await prisma.message.findMany({
      where: { conversationId },
      take: safeLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, profile: { select: { name: true, avatarUrl: true } } } } },
    });

    const hasMore = messages.length > safeLimit;
    const pagedMessages = hasMore ? messages.slice(0, safeLimit) : messages;
    const nextCursor = hasMore ? pagedMessages[pagedMessages.length - 1].id : null;

    // Mask soft-deleted messages for end users
    const formatted: ChatMessageItem[] = pagedMessages.reverse().map((m) => ({
      id: m.id, conversationId: m.conversationId, senderId: m.senderId, receiverId: m.receiverId,
      type: m.type, content: m.deletedAt ? 'This message was deleted' : m.content,
      attachmentUrl: m.deletedAt ? null : (m.attachmentUrl ? toPublicMediaUrl(m.attachmentUrl) : null), replyToMessageId: m.replyToMessageId,
      status: m.status, isDeleted: Boolean(m.deletedAt), createdAt: m.createdAt, sender: m.sender,
    }));

    const isBuyer = conversation.buyerId === userId;
    const otherParty = isBuyer ? conversation.seller : conversation.buyer;

    return {
      messages: formatted,
      nextCursor,
      conversation: {
        id: conversation.id,
        ad: {
          id: conversation.ad.id, title: conversation.ad.title, price: Number(conversation.ad.price),
          status: conversation.ad.status, imageUrl: getAdCoverUrl(conversation.ad.images[0]),
        },
        otherParty: {
          id: otherParty.id, name: otherParty.profile?.name || (isBuyer ? 'Seller' : 'Buyer'),
          avatarUrl: otherParty.profile?.avatarUrl || null, role: isBuyer ? 'Seller' : 'Buyer',
          isOnline: await ChatPresenceService.isUserOnline(otherParty.id),
        },
        isBlocked: conversation.isBlocked,
        status: conversation.status,
      },
    };
  }

  // Transactional, rate-limited message creation with idempotency
  static async sendMessage(userId: string, payload: SendMessagePayload): Promise<{ message: ChatMessageItem; safetyNotice?: string | null }> {
    const { conversationId, content, attachmentUrl, clientMessageId, replyToMessageId } = payload;
    const textContent = (content || '').trim();

    if (!textContent && !attachmentUrl) {
      throw new AppError(400, 'EMPTY_MESSAGE', 'Message content or image attachment is required');
    }

    if (textContent.length > 2000) {
      throw new AppError(400, 'MESSAGE_TOO_LONG', 'Message exceeds 2000 characters limit');
    }

    // Idempotency check: if client retried with same clientMessageId, return existing
    if (clientMessageId) {
      const existing = await prisma.message.findFirst({
        where: { conversationId, senderId: userId, clientMessageId },
        include: { sender: { select: { id: true, profile: { select: { name: true, avatarUrl: true } } } } },
      });
      if (existing) {
        return {
          message: {
            ...existing,
            attachmentUrl: existing.attachmentUrl ? toPublicMediaUrl(existing.attachmentUrl) : null,
            isDeleted: Boolean(existing.deletedAt),
          },
        };
      }
    }

    // Conversation authorization
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { ad: true },
    });

    if (!conversation) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this conversation');
    }
    if (conversation.isBlocked) {
      throw new AppError(403, 'CONVERSATION_BLOCKED', 'This conversation is blocked');
    }

    const isBuyer = conversation.buyerId === userId;
    const recipientId = isBuyer ? conversation.sellerId : conversation.buyerId;

    // Check bidirectional blocks
    const isUserBlocked = await prisma.block.findFirst({
      where: { OR: [{ blockerId: userId, blockedId: recipientId }, { blockerId: recipientId, blockedId: userId }] },
    });
    if (isUserBlocked) {
      throw new AppError(403, 'USER_BLOCKED', 'Messaging is blocked between you and this user');
    }

    // Rate Limiting check
    const rateCheck = await ChatAbuseService.checkRateLimits(userId, conversationId);
    if (!rateCheck.allowed) {
      throw new AppError(429, 'RATE_LIMIT_EXCEEDED', `Message sending rate limit exceeded. Retry in ${rateCheck.retryAfter || 10}s.`);
    }

    // Spam & Content Risk Analysis (only if text is present; image attachments without text are allowed)
    let safetyNotice: string | null = null;
    if (textContent) {
      const recentMessages = await prisma.message.findMany({
        where: { senderId: userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { content: true },
      });
      const spamCheck = ChatAbuseService.analyzeMessageRisk(textContent, recentMessages.map((m) => m.content));
      if (!spamCheck.allowed) {
        throw new AppError(400, 'MESSAGE_REJECTED', spamCheck.reason || 'Message violates marketplace safety guidelines');
      }
      safetyNotice = spamCheck.safetyNotice || null;
    }

    // Database Transaction
    const message = await prisma.$transaction(async (tx) => {
      let mediaAssetId: string | null = null;
      if (attachmentUrl) {
        const mediaMatch = attachmentUrl.match(/med_[a-zA-Z0-9_]+/);
        if (mediaMatch) {
          mediaAssetId = mediaMatch[0];
        }
      }

      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          receiverId: recipientId,
          type: attachmentUrl ? MessageType.IMAGE : MessageType.TEXT,
          content: textContent || (attachmentUrl ? 'Photo' : ''),
          attachmentUrl: attachmentUrl || null,
          attachmentMediaAssetId: mediaAssetId,
          replyToMessageId: replyToMessageId || null,
          clientMessageId: clientMessageId || null,
          status: MessageStatus.SENT,
        },
        include: {
          sender: { select: { id: true, profile: { select: { name: true, avatarUrl: true } } } },
        },
      });

      if (mediaAssetId) {
        await tx.mediaAsset.updateMany({
          where: { id: mediaAssetId },
          data: { entityType: 'CHAT', entityId: created.id, status: 'READY' },
        }).catch(() => {});
      }

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId: created.id,
          lastMessageText: (textContent || 'Photo').slice(0, 500),
          lastMessageAt: new Date(),
          buyerUnreadCount: isBuyer ? conversation.buyerUnreadCount : { increment: 1 },
          sellerUnreadCount: isBuyer ? { increment: 1 } : conversation.sellerUnreadCount,
          buyerDeletedAt: null, // restore for buyer if previously hidden
          sellerDeletedAt: null, // restore for seller
        },
      });

      return created;
    });

    // Asynchronously dispatch offline push notification
    void dispatchNotificationJob({
      userId: recipientId,
      type: 'CHAT_MESSAGE',
      title: 'New message',
      body: `${message.sender.profile?.name || 'Someone'}: ${(textContent || 'Sent a photo').slice(0, 60)}`,
      data: { conversationId, messageId: message.id },
    });

    return {
      message: {
        ...message,
        attachmentUrl: message.attachmentUrl ? toPublicMediaUrl(message.attachmentUrl) : null,
        isDeleted: false,
      },
      safetyNotice,
    };
  }

  // Mark all unread messages in conversation as READ
  static async markAsRead(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) return;

    const isBuyer = conversation.buyerId === userId;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: isBuyer ? { buyerUnreadCount: 0 } : { sellerUnreadCount: 0 },
    });

    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: MessageStatus.READ },
      },
      data: { status: MessageStatus.READ },
    });
  }

  // Soft Delete a message
  static async deleteMessage(userId: string, messageId: string) {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new AppError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
    if (msg.senderId !== userId) throw new AppError(403, 'FORBIDDEN', 'You can only delete your own messages');

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  // Block a user
  static async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new AppError(400, 'CANNOT_BLOCK_SELF', 'Cannot block yourself');
    await prisma.block.upsert({ where: { blockerId_blockedId: { blockerId, blockedId } }, create: { blockerId, blockedId }, update: {} });
    await prisma.conversation.updateMany({
      where: { OR: [{ buyerId: blockerId, sellerId: blockedId }, { buyerId: blockedId, sellerId: blockerId }] },
      data: { isBlocked: true },
    });
    return { success: true, message: 'User blocked successfully' };
  }

  // Unblock a user
  static async unblockUser(blockerId: string, blockedId: string) {
    await prisma.block.deleteMany({ where: { blockerId, blockedId } });
    await prisma.conversation.updateMany({
      where: { OR: [{ buyerId: blockerId, sellerId: blockedId }, { buyerId: blockedId, sellerId: blockerId }] },
      data: { isBlocked: false },
    });
    return { success: true, message: 'User unblocked successfully' };
  }

  // Report a chat, message, or user
  static async reportChat(
    reporterId: string,
    data: { conversationId?: string; messageId?: string; reportedUserId?: string; reason: ReportReason; details?: string }
  ) {
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (data.reason === 'SPAM_OR_FRAUD') priority = 'HIGH';
    if (data.reason === 'PROHIBITED_ITEM' || data.reason === 'INAPPROPRIATE_CONTENT') priority = 'MEDIUM';

    const report = await prisma.report.create({
      data: {
        reporterId, reportedId: data.reportedUserId || null, conversationId: data.conversationId || null,
        messageId: data.messageId || null, reason: data.reason, details: data.details || null, status: ReportStatus.PENDING,
      },
    });
    return { success: true, reportId: report.id, priority };
  }
}
