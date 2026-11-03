import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { MessageType, MessageStatus } from '@prisma/client';
import { sendConfiguredNotification } from '../services/notification.service';

export class ChatController {
  /**
   * POST /api/v1/chat/conversations
   * Start or get existing conversation for an Ad
   */
  static async startConversation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { adId, initialMessage } = req.body;
      const buyerId = req.user!.id;

      if (!adId) {
        throw new AppError(400, 'AD_ID_REQUIRED', 'Ad ID is required to start a chat');
      }

      const ad = await prisma.ad.findUnique({
        where: { id: adId },
        include: {
          images: { where: { isCover: true }, take: 1 },
          user: { select: { id: true, profile: true, phoneNumber: true } },
        },
      });

      if (!ad) {
        throw new AppError(404, 'AD_NOT_FOUND', 'Ad not found');
      }

      if (ad.userId === buyerId) {
        return res.status(200).json({
          success: false,
          isOwnAd: true,
          message: 'You cannot initiate a chat on your own ad listing.',
        });
      }

      const sellerId = ad.userId;

      // Find or create conversation
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
          buyer: {
            select: { id: true, profile: true },
          },
          seller: {
            select: { id: true, profile: true },
          },
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
            buyer: {
              select: { id: true, profile: true },
            },
            seller: {
              select: { id: true, profile: true },
            },
          },
        });
      }

      const isBuyer = conversation.buyerId === buyerId;
      const otherParty = isBuyer ? conversation.seller : conversation.buyer;

      const formatted = {
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

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/chat/conversations
   * Get all active conversations for the authenticated user
   */
  static async getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

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
          buyer: {
            select: {
              id: true,
              profile: { select: { name: true, avatarUrl: true } },
            },
          },
          seller: {
            select: {
              id: true,
              profile: { select: { name: true, avatarUrl: true } },
            },
          },
        },
      });

      // Calculate total unread count for navbar badge
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

      res.status(200).json({
        success: true,
        data: {
          conversations: formatted,
          totalUnread,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/chat/conversations/:id/messages
   * Get messages list for a conversation
   */
  static async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;

      const conversation = await prisma.conversation.findUnique({
        where: { id },
      });

      if (!conversation) {
        throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
      }

      if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Access denied to this conversation');
      }

      // Mark unread messages as read
      const isBuyer = conversation.buyerId === userId;
      await prisma.conversation.update({
        where: { id },
        data: isBuyer ? { buyerUnreadCount: 0 } : { sellerUnreadCount: 0 },
      });
      await prisma.message.updateMany({
        where: {
          conversationId: id,
          senderId: { not: userId },
          status: { not: MessageStatus.READ },
        },
        data: { status: MessageStatus.READ },
      });

      const messages = await prisma.message.findMany({
        where: { conversationId: id },
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

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/chat/conversations/:id/messages
   * Send a message via REST
   */
  static async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;
      const { content, attachmentUrl } = req.body;

      if (!content && !attachmentUrl) {
        throw new AppError(400, 'EMPTY_MESSAGE', 'Message content or image attachment is required');
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id },
      });

      if (!conversation) {
        throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
      }

      if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Access denied to this conversation');
      }

      const isBuyer = conversation.buyerId === userId;

      const message = await prisma.message.create({
        data: {
          conversationId: id,
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

      // Update conversation
      await prisma.conversation.update({
        where: { id },
        data: {
          lastMessageText: (content || 'Photo').trim().slice(0, 500),
          lastMessageAt: new Date(),
          buyerUnreadCount: isBuyer ? conversation.buyerUnreadCount : { increment: 1 },
          sellerUnreadCount: isBuyer ? { increment: 1 } : conversation.sellerUnreadCount,
        },
      });
      await sendConfiguredNotification({
        userId: isBuyer ? conversation.sellerId : conversation.buyerId,
        type: 'CHAT_MESSAGE', templateKey: 'NEW_MESSAGE',
        values: { sender: message.sender.profile?.name || 'Someone', title: '' }, data: { conversationId: id, messageId: message.id },
      });

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/chat/conversations/:id/read
   * Mark conversation as read
   */
  static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;

      const conversation = await prisma.conversation.findUnique({
        where: { id },
      });

      if (!conversation) {
        throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
      }

      const isBuyer = conversation.buyerId === userId;

      await prisma.conversation.update({
        where: { id },
        data: isBuyer ? { buyerUnreadCount: 0 } : { sellerUnreadCount: 0 },
      });

      await prisma.message.updateMany({
        where: {
          conversationId: id,
          senderId: { not: userId },
          status: { not: MessageStatus.READ },
        },
        data: { status: MessageStatus.READ },
      });

      res.status(200).json({
        success: true,
        data: { message: 'Conversation marked as read' },
      });
    } catch (err) {
      next(err);
    }
  }
}
