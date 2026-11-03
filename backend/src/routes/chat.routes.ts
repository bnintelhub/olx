import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(requireAuth);

// Start or get conversation for an ad
router.post('/conversations', ChatController.startConversation);

// Get user's active conversations list
router.get('/conversations', ChatController.getConversations);

// Get messages in a conversation
router.get('/conversations/:id/messages', ChatController.getMessages);

// Send message via REST
router.post('/conversations/:id/messages', ChatController.sendMessage);

// Mark conversation as read
router.patch('/conversations/:id/read', ChatController.markAsRead);

export default router;
