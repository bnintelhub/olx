import { FastifyInstance } from 'fastify';
import { CategoriesController } from './categories.controller';
import { authorizeRoles } from '../../plugins/auth.plugin';
import { UserRole } from '@prisma/client';

export async function categoryRoutes(fastify: FastifyInstance) {
  // Public discovery
  fastify.get('/', CategoriesController.getAll);
  fastify.get('/tree', CategoriesController.getTree);
  fastify.get('/:slug', CategoriesController.getBySlug);
  fastify.get('/:id/attributes', CategoriesController.getAttributes);

  // Protected Admin/Moderator management
  const adminGuard = {
    preHandler: [fastify.authenticate, authorizeRoles(UserRole.ADMIN, UserRole.MODERATOR)],
  };
  const superAdminGuard = {
    preHandler: [fastify.authenticate, authorizeRoles(UserRole.ADMIN)],
  };

  fastify.post('/', adminGuard, CategoriesController.create);
  fastify.put('/:id', adminGuard, CategoriesController.update);
  fastify.delete('/:id', superAdminGuard, CategoriesController.delete);

  fastify.post('/:id/attributes', superAdminGuard, CategoriesController.addAttribute);
  fastify.put('/attributes/:attrId', superAdminGuard, CategoriesController.updateAttribute);
  fastify.delete('/attributes/:attrId', superAdminGuard, CategoriesController.deleteAttribute);
}
