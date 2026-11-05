import { FastifyInstance } from 'fastify';
import { CategoriesController } from './categories.controller';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';

export async function categoryRoutes(fastify: FastifyInstance) {
  // Public taxonomy discovery
  fastify.get('/', CategoriesController.getAll);
  fastify.get('/tree', CategoriesController.getTree);
  fastify.get('/slug/:slug', CategoriesController.getBySlug);
  fastify.get('/:id/attributes', CategoriesController.getAttributes);

  // Fallback slug route (kept after static endpoints)
  fastify.get('/:slug', CategoriesController.getBySlug);

  // Content Manager & Admin mutation guards
  const manageGuard = {
    preHandler: [fastify.authenticate, requirePermission(Permissions.CATEGORIES_MANAGE)],
  };

  // Transactional reorder endpoint (must be registered before /:id parameter)
  fastify.patch('/reorder', manageGuard, CategoriesController.reorder);

  // Admin category CRUD operations
  fastify.post('/', manageGuard, CategoriesController.create);
  fastify.put('/:id', manageGuard, CategoriesController.update);
  fastify.patch('/:id/status', manageGuard, CategoriesController.toggleStatus);
  fastify.delete('/:id', manageGuard, CategoriesController.delete);

  // Dynamic specification attributes
  fastify.post('/:id/attributes', manageGuard, CategoriesController.addAttribute);
  fastify.put('/attributes/:attrId', manageGuard, CategoriesController.updateAttribute);
  fastify.delete('/attributes/:attrId', manageGuard, CategoriesController.deleteAttribute);
}
