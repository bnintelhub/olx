import { Router } from 'express';
import { LocationController } from '../controllers/location.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/cities', LocationController.getCities);
router.get('/tree', LocationController.getTree);
router.get('/admin', requireAuth, requireRole(UserRole.ADMIN, UserRole.MODERATOR), LocationController.getAdminList);
router.post('/', requireAuth, requireRole(UserRole.ADMIN), LocationController.create);
router.put('/:id', requireAuth, requireRole(UserRole.ADMIN), LocationController.update);

export default router;
