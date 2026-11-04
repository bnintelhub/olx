import { FastifyInstance } from 'fastify';
import { ChatController } from './chat.controller';

export async function chatRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.post('/conversations', auth, ChatController.startConversation);
  fastify.get('/conversations', auth, ChatController.getConversations);
  fastify.get('/conversations/:id/messages', auth, ChatController.getMessages);
  fastify.post('/conversations/:id/messages', auth, ChatController.sendMessage);
  fastify.patch('/conversations/:id/read', auth, ChatController.markAsRead);
}
