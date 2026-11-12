import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { HashUtil } from '../../shared/utils/hash.util';
import { AuthRepository } from '../auth/auth.repository';
import { ChatService } from './chat.service';
import { ChatPresenceService } from './chat.presence.service';
import { SendMessagePayload } from './chat.types';
import { fcmService } from '../../integrations/push/fcm.service';
import { fcmDecisionService } from '../../integrations/push/fcm.decision.service';
import { toPublicMediaUrl } from '../../shared/utils/media-url.util';

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

export async function isUserInsideConversation(userId: string, conversationId: string): Promise<boolean> {
  if (!chatIO) return false;
  const isOnline = await ChatPresenceService.isUserOnline(userId);
  if (!isOnline) return false;

  // 1. Check local instance rooms (fastest)
  const userRoom = chatIO.sockets.adapter.rooms.get(`user_${userId}`);
  const convRoom = chatIO.sockets.adapter.rooms.get(`conv_${conversationId}`);
  if (userRoom && convRoom) {
    for (const socketId of userRoom) {
      if (convRoom.has(socketId)) {
        return true;
      }
    }
  }

  // 2. Check distributed Redis presence for multi-server replicas
  return ChatPresenceService.isUserInsideConversation(userId, conversationId);
}

// Broadcasts chat messages across conversation room and recipient's user room
export function broadcastChatMessage(conversationId: string, message: any, senderId: string, receiverId?: string | null) {
  if (!chatIO) {
    console.warn('[broadcastChatMessage] chatIO is not initialized!');
    return;
  }

  const payload = {
    ...message,
    attachmentUrl: message.attachmentUrl ? toPublicMediaUrl(message.attachmentUrl) : null,
    createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
    updatedAt: message.updatedAt instanceof Date ? message.updatedAt.toISOString() : message.updatedAt,
  };

  console.log(`[Chat Broadcast] Emitting message.new for conv_${conversationId} to receiver user_${receiverId}`);

  // Broadcast ONE deduplicated message.new across conversation room and user rooms
  let msgBroadcast: any = chatIO.to(`conv_${conversationId}`);
  if (receiverId) msgBroadcast = msgBroadcast.to(`user_${receiverId}`);
  if (senderId) msgBroadcast = msgBroadcast.to(`user_${senderId}`);
  msgBroadcast.emit('message.new', payload);

  // Broadcast conversation.updated to both recipient and sender so their inbox lists update and re-sort
  let convBroadcast: any = chatIO;
  if (receiverId) convBroadcast = convBroadcast.to(`user_${receiverId}`);
  if (senderId) convBroadcast = convBroadcast.to(`user_${senderId}`);
  convBroadcast.emit('conversation.updated', {
    conversationId,
    lastMessageText: payload.content ? payload.content.slice(0, 80) : (payload.attachmentUrl ? 'Photo' : 'New message'),
    lastMessageAt: payload.createdAt,
    senderId,
  });

  // Evaluate OLX Action-Required Notification Decision Engine
  if (receiverId) {
    void (async () => {
      try {
        const decision = await fcmDecisionService.evaluatePush({
          senderId,
          recipientId: receiverId,
          conversationId,
          messageId: payload.id,
          content: payload.content,
          attachmentUrl: payload.attachmentUrl,
          isDeleted: payload.isDeleted,
        });

        if (!decision.shouldPush) {
          console.log(`[Push Decision] Skip push for conv_${conversationId}: ${decision.reason}`);
          return;
        }

        const senderName = message.sender?.profile?.name || 'New Message';
        const senderAvatar = message.sender?.profile?.avatarUrl || null;
        const messageText = decision.bundledBody || payload.content || (payload.attachmentUrl ? '📷 Photo' : 'Sent an attachment');

        await fcmService.sendChatMessagePush({
          recipientId: receiverId,
          senderId,
          senderName,
          senderAvatar,
          messageText,
          conversationId,
          messageId: payload.id,
          attachmentUrl: payload.attachmentUrl,
          priority: decision.priority,
        });
      } catch (err) {
        console.warn('[Push Decision] Error dispatching push:', err);
      }
    })();
  }
}

export function setupChatSocket(io: SocketIOServer) {
  chatIO = io;

  // Global Handshake Authentication & Token Extraction with automatic refresh fallback
  io.use(async (socket: Socket, next) => {
    try {
      const referer = socket.handshake.headers?.referer || '';
      const isAdminContext =
        referer.includes('/admin') ||
        socket.handshake.auth?.context === 'admin' ||
        socket.handshake.query?.context === 'admin';

      let rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.auth?.accessToken ||
        socket.handshake.headers?.authorization ||
        (socket.handshake.query?.token as string);
      let token = typeof rawToken === 'string' ? rawToken.replace(/^Bearer\s+/i, '').trim() : '';

      const candidateAccessTokens: string[] = [];
      if (token) {
        candidateAccessTokens.push(token);
      }

      if (socket.handshake.headers?.cookie) {
        const rawCookies = socket.handshake.headers.cookie;
        const clientMatch = rawCookies.match(/(?:^|;\s*)access_token=([^;]+)/)?.[1];
        const adminMatch = rawCookies.match(/(?:^|;\s*)admin_access_token=([^;]+)/)?.[1];

        // In admin context, prioritize admin_access_token; in client context, NEVER accept admin token
        if (isAdminContext) {
          if (adminMatch) candidateAccessTokens.push(adminMatch);
          if (clientMatch) candidateAccessTokens.push(clientMatch);
        } else {
          if (clientMatch) candidateAccessTokens.push(clientMatch);
        }
      }

      let userId: string | null = null;
      let userRole: string = 'USER';
      let userPhone: string | undefined;
      let userEmail: string | undefined;

      // 1. Try verifying each candidate access token
      for (const candidate of candidateAccessTokens) {
        try {
          const decoded = jwt.verify(candidate, env.JWT_ACCESS_SECRET) as any;
          if (decoded?.userId || decoded?.id || decoded?.sub) {
            const role = decoded.role || 'USER';
            // In customer client context, ignore admin tokens to prevent session collision
            if (!isAdminContext && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
              continue;
            }
            userId = decoded.userId || decoded.id || decoded.sub;
            userRole = role;
            userPhone = decoded.phoneNumber;
            userEmail = decoded.email;
            break;
          }
        } catch {
          // Token expired or invalid, continue to next candidate
        }
      }

      // 2. If access tokens expired or missing, fallback to 30-day refresh token cookies
      if (!userId && socket.handshake.headers?.cookie) {
        const rawCookies = socket.handshake.headers.cookie;
        const clientRefresh = rawCookies.match(/(?:^|;\s*)refresh_token=([^;]+)/)?.[1];
        const adminRefresh = rawCookies.match(/(?:^|;\s*)admin_refresh_token=([^;]+)/)?.[1];

        // In client context, never fall back to admin_refresh_token to avoid session leakage across tabs
        const candidateRefreshTokens = isAdminContext
          ? [adminRefresh, clientRefresh].filter(Boolean)
          : [clientRefresh].filter(Boolean);

        for (const refToken of candidateRefreshTokens) {
          if (!refToken) continue;
          try {
            const tokenHash = HashUtil.sha256(refToken);
            const user = await AuthRepository.findUserByRefreshTokenHash(tokenHash);
            if (user && user.status === 'ACTIVE') {
              userId = user.id;
              userRole = user.role;
              userPhone = user.phoneNumber || undefined;
              userEmail = user.email || undefined;
              break;
            }
          } catch {
            // Check next refresh token
          }
        }
      }

      if (!userId) {
        console.warn(`[Socket Auth] Connection rejected for ${socket.id}: No valid credentials provided`);
        return next(new Error('AUTHENTICATION_REQUIRED'));
      }

      console.log(`[Socket Auth] User ${userId} (${userRole}) authenticated on socket ${socket.id}`);

      (socket as any).user = {
        id: userId,
        userId,
        role: userRole,
        phoneNumber: userPhone,
        email: userEmail,
      };
      next();
    } catch (err: any) {
      next(new Error(err.message || 'AUTHENTICATION_FAILED'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user: SocketUser = (socket as any).user;
    if (!user || !user.id) {
      socket.disconnect(true);
      return;
    }

    // Join personal user room for multi-device sync and inbox notifications
    socket.join(`user_${user.id}`);

    // Notify client of successful authenticated connection
    socket.emit('chat:ready', { userId: user.id });

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
        socket.data.activeConversationId = conversationId;
        await ChatPresenceService.setUserActiveConversation(user.id, conversationId);

        // Automatically mark messages as read and broadcast receipt
        await ChatService.markAsRead(user.id, conversationId);
        const readReceipt = { conversationId, readerId: user.id, readAt: new Date().toISOString() };
        io.to(`conv_${conversationId}`).emit('message.read', readReceipt);
        const otherUserId = conv.buyerId === user.id ? conv.sellerId : conv.buyerId;
        chatIO?.to(`user_${otherUserId}`).emit('message.read', readReceipt);
      } catch {
        socket.emit('error', { code: 'CHAT_ERROR', message: 'Failed to join conversation room' });
      }
    });

    // 2. Leave Conversation Room
    socket.on('conversation.leave', ({ conversationId }: { conversationId: string }) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`);
        void ChatPresenceService.clearUserActiveConversation(user.id, conversationId);
        if (socket.data.activeConversationId === conversationId) {
          delete socket.data.activeConversationId;
        }
      }
    });

    // 3. Send Message
    socket.on('message.send', async (payload: SendMessagePayload, ack?: any) => {
      try {
        const { conversationId } = payload;
        if (!conversationId) return;

        // Create message in database transaction
        const { message, safetyNotice } = await ChatService.sendMessage(user.id, payload);

        if (typeof ack === 'function') {
          ack({ success: true, data: message, safetyNotice });
        }

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

        // Real-time delivery acknowledgment: if recipient is currently online, mark DELIVERED
        if (message.receiverId) {
          const isRecipientOnline = await ChatPresenceService.isUserOnline(message.receiverId);
          if (isRecipientOnline) {
            await prisma.message.update({
              where: { id: message.id },
              data: { status: 'DELIVERED' },
            });
            message.status = 'DELIVERED';
            io.to(`conv_${conversationId}`).emit('message.delivered', {
              messageId: message.id,
              conversationId,
            });
            chatIO?.to(`user_${user.id}`).emit('message.delivered', {
              messageId: message.id,
              conversationId,
            });
          }
        }
      } catch (err: any) {
        if (typeof ack === 'function') {
          ack({ success: false, error: err.message || 'Unable to send message' });
        }
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

        // Ensure other participant's personal room updates in real time
        const conv = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { buyerId: true, sellerId: true },
        });
        if (conv) {
          const otherUserId = conv.buyerId === user.id ? conv.sellerId : conv.buyerId;
          chatIO?.to(`user_${otherUserId}`).emit('message.read', {
            conversationId,
            readerId: user.id,
            readAt: new Date().toISOString(),
          });
        }
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
      if (socket.data.activeConversationId) {
        void ChatPresenceService.clearUserActiveConversation(user.id, socket.data.activeConversationId);
      }
      const isCompletelyOffline = await ChatPresenceService.setUserOffline(user.id, socket.id);
      if (isCompletelyOffline) {
        io.emit('presence.update', { userId: user.id, isOnline: false });
      }
    });
  });
}
