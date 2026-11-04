import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { MessageType, MessageStatus } from '@prisma/client';

interface SocketUser {
  id: string;
  role: string;
  phoneNumber?: string;
}

const userSocketsMap = new Map<string, Set<string>>();

export function setupChatSocket(io: SocketIOServer) {
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as SocketUser;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired socket token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user: SocketUser = (socket as any).user;
    if (!user) return;

    if (!userSocketsMap.has(user.id)) {
      userSocketsMap.set(user.id, new Set());
    }
    userSocketsMap.get(user.id)!.add(socket.id);

    socket.on('join_conversation', ({ conversationId }: { conversationId: string }) => {
      socket.join(`conv_${conversationId}`);
    });

    socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
      socket.leave(`conv_${conversationId}`);
    });

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

          const conv = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { buyer: true, seller: true },
          });

          if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) {
            socket.emit('error', { message: 'Unauthorized or conversation not found' });
            return;
          }

          const message = await prisma.message.create({
            data: {
              conversationId,
              senderId: user.id,
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

          const isSenderBuyer = conv.buyerId === user.id;
          const otherUserId = isSenderBuyer ? conv.sellerId : conv.buyerId;

          await prisma.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessageText: (content || 'Photo').trim().slice(0, 500),
              lastMessageAt: new Date(),
              buyerUnreadCount: isSenderBuyer ? conv.buyerUnreadCount : { increment: 1 },
              sellerUnreadCount: isSenderBuyer ? { increment: 1 } : conv.sellerUnreadCount,
            },
          });

          io.to(`conv_${conversationId}`).emit('new_message', message);

          const recipientSockets = userSocketsMap.get(otherUserId);
          if (recipientSockets) {
            recipientSockets.forEach((sId) => {
              io.to(sId).emit('conversation_updated', {
                conversationId,
                lastMessageText: (content || 'Photo').trim().slice(0, 100),
                senderId: user.id,
              });
            });
          }
        } catch (err: any) {
          socket.emit('error', { message: 'Failed to send message' });
        }
      }
    );

    socket.on('disconnect', () => {
      const userSockets = userSocketsMap.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketsMap.delete(user.id);
        }
      }
    });
  });
}
