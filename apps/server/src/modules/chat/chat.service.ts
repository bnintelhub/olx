import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { MessageType, MessageStatus } from '@prisma/client';
import { dispatchNotificationJob } from '../../jobs/notification.job';

export class ChatService {
  static async startConversation(buyerId: string, adId: string, initialMessage?: string) {
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: {
        images: { where: { isCover: true }, take: 1 },
        user: { select: { id: true, profile: true, phoneNumber: true } },
      },
    });

    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');

    if (ad.userId === buyerId) {
      return { isOwnAd: true, message: 'You cannot initiate a chat on your own listing.' };
    }

    const sellerId = ad.userId;

    let conversation = await prisma.conversation.findUnique({
      where: {
        adId_buyerId_sellerId: {
          adId,
          buyerId,
          sellerId,
        },
      },
      include: {
        ad: {
          select: {
            id: true,
            title: true,
            price: true,
            slug: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' } },
          },
        },
        buyer: { select: { id: true, profile: true } },
        seller: { select: { id: true, profile: true } },
      },
    });

    if (!conversation) {
      const text = initialMessage || 'Hi, is this still available?';
      conversation = await prisma.conversation.create({
        data: {
          adId,
          buyerId,
          sellerId,
          lastMessageText: text,
          lastMessageAt: new Date(),
          buyerUnreadCount: 0,
          sellerUnreadCount: 1,
          messages: {
            create: {
              senderId: buyerId,
              type: MessageType.TEXT,
              content: text,
              status: MessageStatus.SENT,
            },
          },
        },
        include: {
          ad: {
            select: {
              id: true,
              title: true,
              price: true,
              slug: true,
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
            },
          },
          buyer: { select: { id: true, profile: true } },
          seller: { select: { id: true, profile: true } },
        },
      });
    }

    const isBuyer = conversation.buyerId === buyerId;
    const otherParty = isBuyer ? conversation.seller : conversation.buyer;

    return {
      id: conversation.id,
      adId: conversation.adId,
      ad: conversation.ad,
      otherParty: {
        id: otherParty.id,
        name: otherParty.profile?.name || (isBuyer ? 'Seller' : 'Buyer'),
        avatarUrl: otherParty.profile?.avatarUrl,
        role: isBuyer ? 'Seller' : 'Buyer',
      },
      lastMessageText: conversation.lastMessageText,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: isBuyer ? conversation.buyerUnreadCount : conversation.sellerUnreadCount,
      isBlocked: conversation.isBlocked,
    };
  }

  static async getConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        ad: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' } },
          },
        },
        buyer: { select: { id: true, profile: { select: { name: true, avatarUrl: true } } } },
        seller: { select: { id: true, profile: { select: { name: true, avatarUrl: true } } } },
      },
    });

    let totalUnread = 0;
    const formatted = conversations.map((conv) => {
      const isBuyer = conv.buyerId === userId;
      const unread = isBuyer ? conv.buyerUnreadCount : conv.sellerUnreadCount;
      totalUnread += unread;

      const otherParty = isBuyer ? conv.seller : conv.buyer;

      return {
        id: conv.id,
        adId: conv.adId,
        ad: conv.ad,
        otherParty: {
          id: otherParty.id,
          name: otherParty.profile?.name || 'User',
          avatarUrl: otherParty.profile?.avatarUrl,
          role: isBuyer ? 'Seller' : 'Buyer',
        },
        lastMessageText: conv.lastMessageText,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: unread,
        isBlocked: conv.isBlocked,
      };
    });

    return { conversations: formatted, totalUnread };
  }

  static async getMessages(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this conversation');
    }

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

    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            profile: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  static async sendMessage(userId: string, conversationId: string, content?: string, attachmentUrl?: string) {
    if (!content && !attachmentUrl) {
      throw new AppError(400, 'EMPTY_MESSAGE', 'Message content or image attachment is required');
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this conversation');
    }

    const isBuyer = conversation.buyerId === userId;

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: attachmentUrl ? MessageType.IMAGE : MessageType.TEXT,
        content: (content || '').trim(),
        attachmentUrl,
        status: MessageStatus.SENT,
      },
      include: {
        sender: {
          select: {
            id: true,
            profile: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageText: (content || 'Photo').trim().slice(0, 500),
        lastMessageAt: new Date(),
        buyerUnreadCount: isBuyer ? conversation.buyerUnreadCount : { increment: 1 },
        sellerUnreadCount: isBuyer ? { increment: 1 } : conversation.sellerUnreadCount,
      },
    });

    void dispatchNotificationJob({
      userId: isBuyer ? conversation.sellerId : conversation.buyerId,
      type: 'CHAT_MESSAGE',
      title: 'New message',
      body: `${message.sender.profile?.name || 'Someone'} sent you a message`,
      data: { conversationId, messageId: message.id },
    });

    return message;
  }

  static async markAsRead(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

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

    return { message: 'Conversation marked as read' };
  }
}
