import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../prisma';
import { MessageType, MessageStatus } from '@prisma/client';

interface SocketUser {
  id: string;
  role: string;
  phoneNumber?: string;
}

// User ID to active Socket IDs mapping
const userSocketsMap = new Map<string, Set<string>>();

export function setupChatSocket(io: SocketIOServer) {
  // Authentication middleware for socket connections
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow guest or reject if auth is required
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as SocketUser;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired socket token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user: SocketUser = (socket as any).user;
    if (!user) return;

    // Track user socket
    if (!userSocketsMap.has(user.id)) {
      userSocketsMap.set(user.id, new Set());
    }
    userSocketsMap.get(user.id)!.add(socket.id);

    console.log(`🔌 [Socket.IO] User connected: ${user.id} (Socket: ${socket.id})`);

    // Join conversation room
    socket.on('join_conversation', ({ conversationId }: { conversationId: string }) => {
      const room = `conv_${conversationId}`;
      socket.join(room);
      console.log(`💬 User ${user.id} joined room: ${room}`);
    });

    // Leave conversation room
    socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
      const room = `conv_${conversationId}`;
      socket.leave(room);
    });

    // Handle sending a real-time message
    socket.on(
      'send_message',
      async ({
        conversationId,
        content,
        attachmentUrl,
      }: {
        conversationId: string;
        content: string;
        attachmentUrl?: string;
      }) => {
        try {
          if (!content && !attachmentUrl) return;

          // 1. Verify conversation access
          const conv = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { buyer: true, seller: true },
          });

          if (!conv) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
          }

          if (conv.buyerId !== user.id && conv.sellerId !== user.id) {
            socket.emit('error', { message: 'Unauthorized access to conversation' });
            return;
          }

          // 2. Anti-fraud safety warning check
          const lowerContent = content.toLowerCase();
          const hasFraudRisk =
            lowerContent.includes('upi') ||
            lowerContent.includes('google pay') ||
            lowerContent.includes('phonepe') ||
            lowerContent.includes('advance') ||
            lowerContent.includes('token money') ||
            lowerContent.includes('qr code') ||
            lowerContent.includes('pin');

          // 3. Create message in DB
          const message = await prisma.message.create({
            data: {
              conversationId,
              senderId: user.id,
              type: attachmentUrl ? MessageType.IMAGE : MessageType.TEXT,
              content: content.trim(),
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

          // 4. Update conversation metadata and unread counts
          const isSenderBuyer = conv.buyerId === user.id;
          const otherUserId = isSenderBuyer ? conv.sellerId : conv.buyerId;

          await prisma.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessageText: content.trim().slice(0, 500),
              lastMessageAt: new Date(),
              buyerUnreadCount: isSenderBuyer ? conv.buyerUnreadCount : { increment: 1 },
              sellerUnreadCount: isSenderBuyer ? { increment: 1 } : conv.sellerUnreadCount,
            },
          });

          // 5. Emit message to conversation room
          const room = `conv_${conversationId}`;
          io.to(room).emit('new_message', {
            ...message,
            hasFraudRisk,
          });

          // 6. Notify other user if they are online outside this room
          const recipientSockets = userSocketsMap.get(otherUserId);
          if (recipientSockets) {
            recipientSockets.forEach((sId) => {
              io.to(sId).emit('conversation_updated', {
                conversationId,
                lastMessageText: content.trim().slice(0, 100),
                senderId: user.id,
              });
            });
          }
        } catch (err: any) {
          console.error('Socket send_message error:', err);
          socket.emit('error', { message: 'Failed to send message' });
        }
      }
    );

    // Typing indicators
    socket.on(
      'typing',
      ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
        const room = `conv_${conversationId}`;
        socket.to(room).emit('user_typing', {
          conversationId,
          userId: user.id,
          isTyping,
        });
      }
    );

    // Mark messages as read
    socket.on('mark_read', async ({ conversationId }: { conversationId: string }) => {
      try {
        const conv = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conv) return;

        const isBuyer = conv.buyerId === user.id;

        // Reset unread counter for current user
        await prisma.conversation.update({
          where: { id: conversationId },
          data: isBuyer ? { buyerUnreadCount: 0 } : { sellerUnreadCount: 0 },
        });

        // Update messages status
        await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: user.id },
            status: { not: MessageStatus.READ },
          },
          data: { status: MessageStatus.READ },
        });

        const room = `conv_${conversationId}`;
        io.to(room).emit('messages_read', {
          conversationId,
          readBy: user.id,
        });
      } catch (err) {
        console.error('Socket mark_read error:', err);
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      const userSockets = userSocketsMap.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketsMap.delete(user.id);
        }
      }
      console.log(`🔌 [Socket.IO] User disconnected: ${user.id}`);
    });
  });
}
