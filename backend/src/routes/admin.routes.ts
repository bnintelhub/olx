import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { SettingsController } from '../controllers/settings.controller';

const router = Router();

// All protected admin management endpoints
router.use(requireAuth);
router.use(requireRole(UserRole.ADMIN, UserRole.MODERATOR));

router.get('/stats', AdminController.getStats);
router.get('/profile', AdminController.getProfile);
router.put('/profile', AdminController.updateProfile);
router.put('/change-password', AdminController.changePassword);
router.get('/settings', SettingsController.get);
router.put('/settings', requireRole(UserRole.ADMIN), SettingsController.update);
router.get('/ads', AdminController.getAds);
router.get('/users', AdminController.getUsers);
router.get('/users/:id', AdminController.getUserDetail);
router.patch('/users/:id/action', AdminController.updateUserAction);
router.get('/ads/:id', AdminController.getAdDetail);
router.patch('/ads/bulk-status', AdminController.bulkUpdateAdStatus);
router.patch('/ads/:id/status', AdminController.updateAdStatus);
router.delete('/ads/:id', AdminController.deleteAd);
router.get('/reports', AdminController.getReports);
router.patch('/reports/:id', AdminController.updateReport);
router.get('/conversations', AdminController.getConversations);
router.get('/conversations/:id/messages', AdminController.getConversationMessages);
router.get('/support-tickets', AdminController.getTickets);
router.patch('/support-tickets/:id', AdminController.updateTicket);

export default router;
