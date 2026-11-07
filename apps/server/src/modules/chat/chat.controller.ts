import { FastifyReply, FastifyRequest } from 'fastify';
import { ChatService } from './chat.service';
import { broadcastChatMessage, getChatIO } from './chat.socket';
import {
  startConversationSchema,
  sendMessageSchema,
  blockUserSchema,
  reportChatSchema,
  cursorPaginationSchema,
} from './chat.schema';

export class ChatController {
  static async startConversation(request: FastifyRequest, reply: FastifyReply) {
    const { adId, initialMessage, clientMessageId } = startConversationSchema.parse(request.body);
    const result = await ChatService.startConversation(request.user!.id, adId, initialMessage, clientMessageId);
    return reply.status(200).send({ success: true, data: result });
  }

  static async getConversations(request: FastifyRequest, reply: FastifyReply) {
    const filter = (request.query as { filter?: 'all' | 'archived' }).filter || 'all';
    const result = await ChatService.getConversations(request.user!.id, filter);
    return reply.status(200).send({ success: true, data: result });
  }

  static async getMessages(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { cursor, limit } = cursorPaginationSchema.parse(request.query);
    const result = await ChatService.getMessages(request.user!.id, id, cursor, limit);
    return reply.status(200).send({ success: true, data: result });
  }

  static async sendMessage(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { content, attachmentUrl, clientMessageId, replyToMessageId } = sendMessageSchema.parse(request.body);
    const userId = request.user!.id || (request.user as any)!.userId;
    const result = await ChatService.sendMessage(userId, {
      conversationId: id,
      content,
      attachmentUrl,
      clientMessageId,
      replyToMessageId,
    });
    broadcastChatMessage(id, result.message, userId, result.message.receiverId);
    return reply.status(201).send({ success: true, data: result.message, safetyNotice: result.safetyNotice });
  }

  static async markAsRead(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const userId = request.user!.id || (request.user as any)!.userId;
    await ChatService.markAsRead(userId, id);
    getChatIO()?.to(`conv_${id}`).emit('message.read', {
      conversationId: id,
      readerId: userId,
      readAt: new Date().toISOString(),
    });
    return reply.status(200).send({ success: true, message: 'Marked as read' });
  }

  static async deleteMessage(request: FastifyRequest, reply: FastifyReply) {
    const { messageId } = request.params as { messageId: string };
    const result = await ChatService.deleteMessage(request.user!.id, messageId);
    return reply.status(200).send({ success: true, data: result });
  }

  static async blockUser(request: FastifyRequest, reply: FastifyReply) {
    const { targetUserId } = blockUserSchema.parse(request.body);
    const result = await ChatService.blockUser(request.user!.id, targetUserId);
    return reply.status(200).send({ success: true, data: result });
  }

  static async unblockUser(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = request.params as { userId: string };
    const result = await ChatService.unblockUser(request.user!.id, userId);
    return reply.status(200).send({ success: true, data: result });
  }

  static async reportChat(request: FastifyRequest, reply: FastifyReply) {
    const body = reportChatSchema.parse(request.body);
    const result = await ChatService.reportChat(request.user!.id, body);
    return reply.status(201).send({ success: true, data: result });
  }
}
