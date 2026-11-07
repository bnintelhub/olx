import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { ChatService } from './chat.service';
import { ChatPresenceService } from './chat.presence.service';
import { SendMessagePayload } from './chat.types';

interface SocketUser {
  id: string;
  userId?: string;
  role: string;
  phoneNumber?: string;
  email?: string;
}

let chatIO: SocketIOServer | null = null;

export function getChatIO(): SocketIOServer | null {
  return chatIO;
}

// Broadcasts chat messages across conversation room and recipient's user room
export function broadcastChatMessage(conversationId: string, message: any, senderId: string, receiverId?: string | null) {
  if (!chatIO) return;

  // Broadcast to active conversation room
  chatIO.to(`conv_${conversationId}`).emit('message.new', message);

  // Broadcast to receiver's personal user room
  if (receiverId) {
    chatIO.to(`user_${receiverId}`).emit('message.new', message);
    chatIO.to(`user_${receiverId}`).emit('conversation.updated', {
      conversationId,
      lastMessageText: message.content ? message.content.slice(0, 80) : 'Photo',
      lastMessageAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
      senderId,
    });
  }

  // Broadcast to sender's other devices
  chatIO.to(`user_${senderId}`).emit('message.new', message);
}

export function setupChatSocket(io: SocketIOServer) {
  chatIO = io;

  // Global Handshake Authentication & Token Extraction
  io.use(async (socket: Socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token && socket.handshake.headers?.cookie) {
        const rawCookies = socket.handshake.headers.cookie;
        const adminMatch = rawCookies.match(/admin_access_token=([^;]+)/);
        const clientMatch = rawCookies.match(/access_token=([^;]+)/);
        token = adminMatch?.[1] || clientMatch?.[1];
      }

      if (token) {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
        const userId = decoded.userId || decoded.id || decoded.sub;
        if (userId) {
          (socket as any).user = {
            id: userId,
            userId,
            role: decoded.role,
            phoneNumber: decoded.phoneNumber,
            email: decoded.email,
          };
        }
      }
      next();
    } catch {
      next();
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user: SocketUser = (socket as any).user;
    if (!user || !user.id) return;

    // Join personal user room for multi-device sync and inbox notifications
    socket.join(`user_${user.id}`);

    // Register user presence
    await ChatPresenceService.setUserOnline(user.id, socket.id);

    // 1. Join Conversation Room
    socket.on('conversation.join', async ({ conversationId }: { conversationId: string }) => {
      try {
        if (!conversationId) return;

        const conv = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { buyerId: true, sellerId: true },
        });

        if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) {
          socket.emit('error', { code: 'CHAT_ACCESS_DENIED', message: 'Not authorized for this conversation' });
          return;
        }

        socket.join(`conv_${conversationId}`);

        // Automatically mark messages as read and broadcast receipt
        await ChatService.markAsRead(user.id, conversationId);
        io.to(`conv_${conversationId}`).emit('message.read', {
          conversationId,
          readerId: user.id,
          readAt: new Date().toISOString(),
        });
      } catch {
        socket.emit('error', { code: 'CHAT_ERROR', message: 'Failed to join conversation room' });
      }
    });

    // 2. Leave Conversation Room
    socket.on('conversation.leave', ({ conversationId }: { conversationId: string }) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`);
      }
    });

    // 3. Send Message
    socket.on('message.send', async (payload: SendMessagePayload) => {
      try {
        const { conversationId } = payload;
        if (!conversationId) return;

        // Create message in database transaction
        const { message, safetyNotice } = await ChatService.sendMessage(user.id, payload);

        // Acknowledge receipt to the sender
        socket.emit('message.sent', {
          messageId: message.id,
          conversationId,
          clientMessageId: payload.clientMessageId,
          status: message.status,
          createdAt: message.createdAt.toISOString(),
          safetyNotice: safetyNotice || null,
        });

        // Broadcast to conversation room and user rooms
        broadcastChatMessage(conversationId, message, user.id, message.receiverId);

        // If recipient is currently online, mark as delivered
        if (message.receiverId) {
          const isRecipientOnline = await ChatPresenceService.isUserOnline(message.receiverId);
          if (isRecipientOnline) {
            await prisma.message.update({
              where: { id: message.id },
              data: { status: 'DELIVERED' },
            });
            io.to(`conv_${conversationId}`).emit('message.delivered', {
              messageId: message.id,
              conversationId,
            });
          }
        }
      } catch (err: any) {
        socket.emit('error', {
          code: err.code || 'MESSAGE_SEND_FAILED',
          message: err.message || 'Unable to send message',
        });
      }
    });

    // 4. Mark Messages as Read
    socket.on('message.read', async ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      try {
        await ChatService.markAsRead(user.id, conversationId);
        io.to(`conv_${conversationId}`).emit('message.read', {
          conversationId,
          readerId: user.id,
          readAt: new Date().toISOString(),
        });
      } catch {
        // ignore
      }
    });

    // 5. Ephemeral Typing Indicator
    socket.on('typing.start', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      if (!ChatPresenceService.shouldThrottleTyping(user.id, conversationId)) {
        socket.to(`conv_${conversationId}`).emit('typing.start', {
          conversationId,
          userId: user.id,
        });
      }
    });

    socket.on('typing.stop', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      socket.to(`conv_${conversationId}`).emit('typing.stop', {
        conversationId,
        userId: user.id,
      });
    });

    // 6. Presence Heartbeat
    socket.on('presence.ping', async () => {
      await ChatPresenceService.touchPresence(user.id);
    });

    // 7. Disconnection
    socket.on('disconnect', async () => {
      const isCompletelyOffline = await ChatPresenceService.setUserOffline(user.id, socket.id);
      if (isCompletelyOffline) {
        io.emit('presence.update', { userId: user.id, isOnline: false });
      }
    });
  });
}
