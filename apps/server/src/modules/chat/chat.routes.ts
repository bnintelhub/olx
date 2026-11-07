import { FastifyInstance } from 'fastify';
import { ChatController } from './chat.controller';

export async function chatRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  // Conversations
  fastify.post('/conversations', auth, ChatController.startConversation);
  fastify.get('/conversations', auth, ChatController.getConversations);
  fastify.get('/conversations/:id/messages', auth, ChatController.getMessages);
  fastify.post('/conversations/:id/messages', auth, ChatController.sendMessage);
  fastify.patch('/conversations/:id/read', auth, ChatController.markAsRead);

  // Messages
  fastify.delete('/messages/:messageId', auth, ChatController.deleteMessage);

  // Safety, Blocking & Reporting
  fastify.post('/users/block', auth, ChatController.blockUser);
  fastify.delete('/users/:userId/block', auth, ChatController.unblockUser);
  fastify.post('/reports', auth, ChatController.reportChat);
}
