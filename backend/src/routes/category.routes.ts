import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Public discovery endpoints
router.get('/', CategoryController.getAll);
router.get('/tree', CategoryController.getTree);
router.get('/:slug', CategoryController.getBySlug);
router.get('/:id/attributes', CategoryController.getAttributes);

// Admin Category & Attribute Builder CRUD
router.post('/', requireAuth, requireRole(UserRole.ADMIN, UserRole.MODERATOR), CategoryController.create);
router.put('/:id', requireAuth, requireRole(UserRole.ADMIN, UserRole.MODERATOR), CategoryController.update);
router.delete('/:id', requireAuth, requireRole(UserRole.ADMIN), CategoryController.delete);

router.post('/:id/attributes', requireAuth, requireRole(UserRole.ADMIN), CategoryController.addAttribute);
router.put('/attributes/:attrId', requireAuth, requireRole(UserRole.ADMIN), CategoryController.updateAttribute);
router.delete('/attributes/:attrId', requireAuth, requireRole(UserRole.ADMIN), CategoryController.deleteAttribute);

export default router;
