import { Router } from 'express';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import locationRoutes from './location.routes';
import adRoutes from './ad.routes';
import userRoutes from './user.routes';
import chatRoutes from './chat.routes';
import moderationRoutes from './moderation.routes';
import supportRoutes from './support.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/locations', locationRoutes);
router.use('/ads', adRoutes);
router.use('/user', userRoutes);
router.use('/chat', chatRoutes);
router.use('/moderation', moderationRoutes);
router.use('/support', supportRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'olx-backend',
    database: 'MySQL 8.4 Connected',
  });
});

export default router;
