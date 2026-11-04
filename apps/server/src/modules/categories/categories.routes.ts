import { FastifyInstance } from 'fastify';
import { CategoriesController } from './categories.controller';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';

export async function categoryRoutes(fastify: FastifyInstance) {
  // Public discovery
  fastify.get('/', CategoriesController.getAll);
  fastify.get('/tree', CategoriesController.getTree);
  fastify.get('/:slug', CategoriesController.getBySlug);
  fastify.get('/:id/attributes', CategoriesController.getAttributes);

  // Content Manager & Admin permission guard
  const manageGuard = {
    preHandler: [fastify.authenticate, requirePermission(Permissions.CATEGORIES_MANAGE)],
  };

  fastify.post('/', manageGuard, CategoriesController.create);
  fastify.put('/:id', manageGuard, CategoriesController.update);
  fastify.delete('/:id', manageGuard, CategoriesController.delete);

  fastify.post('/:id/attributes', manageGuard, CategoriesController.addAttribute);
  fastify.put('/attributes/:attrId', manageGuard, CategoriesController.updateAttribute);
  fastify.delete('/attributes/:attrId', manageGuard, CategoriesController.deleteAttribute);
}
