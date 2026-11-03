import { Router } from 'express';
import { ModerationController } from '../controllers/moderation.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Public/User accessible with authentication
router.post('/reports', requireAuth, ModerationController.reportAd);
router.post('/blocks', requireAuth, ModerationController.blockUser);
router.post(
  '/ads/:id/boost',
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.MODERATOR),
  ModerationController.boostAd
);

// Admin & Moderator routes
router.get('/pending', requireAuth, requireRole(UserRole.ADMIN, UserRole.MODERATOR), ModerationController.getPendingAds);
router.patch(
  '/ads/:id/review',
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.MODERATOR),
  ModerationController.reviewAd
);
router.get('/reports', requireAuth, requireRole(UserRole.ADMIN, UserRole.MODERATOR), ModerationController.getReports);
router.patch(
  '/reports/:id',
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.MODERATOR),
  ModerationController.resolveReport
);

export default router;
