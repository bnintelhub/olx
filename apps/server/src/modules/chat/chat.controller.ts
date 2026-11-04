import { FastifyReply, FastifyRequest } from 'fastify';
import { ChatService } from './chat.service';
import { startConversationSchema, sendMessageSchema } from './chat.schema';

export class ChatController {
  static async startConversation(request: FastifyRequest, reply: FastifyReply) {
    const { adId, initialMessage } = startConversationSchema.parse(request.body);
    const result = await ChatService.startConversation(request.user!.id, adId, initialMessage);
    return reply.status(200).send({ success: true, data: result });
  }

  static async getConversations(request: FastifyRequest, reply: FastifyReply) {
    const result = await ChatService.getConversations(request.user!.id);
    return reply.status(200).send({ success: true, data: result });
  }

  static async getMessages(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const messages = await ChatService.getMessages(request.user!.id, id);
    return reply.status(200).send({ success: true, data: messages });
  }

  static async sendMessage(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { content, attachmentUrl } = sendMessageSchema.parse(request.body);
    const message = await ChatService.sendMessage(request.user!.id, id, content, attachmentUrl);
    return reply.status(201).send({ success: true, data: message });
  }

  static async markAsRead(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const result = await ChatService.markAsRead(request.user!.id, id);
    return reply.status(200).send({ success: true, data: result });
  }
}
