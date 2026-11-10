import { FastifyInstance } from 'fastify';
import { LocationsClientController } from './locations.client.controller';
import { LocationsAdminController } from './locations.admin.controller';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';

// Public read-only client endpoints mounted at /api/v1/locations
export async function locationRoutes(fastify: FastifyInstance) {
  fastify.get('/', LocationsClientController.getRoots);
  fastify.get('/search', LocationsClientController.search);
  fastify.get('/nearby', LocationsClientController.nearby);
  fastify.get('/cities', LocationsClientController.getCities);
  fastify.get('/tree', LocationsClientController.getTree);
  fastify.get('/:locationId', LocationsClientController.getById);
  fastify.get('/:locationId/children', LocationsClientController.getChildren);
  fastify.get('/:locationId/ancestors', LocationsClientController.getAncestors);
}

// Granular administrative endpoints mounted at /api/v1/admin/locations
export async function adminLocationRoutes(fastify: FastifyInstance) {
  const readGuard = {
    preHandler: [
      fastify.authenticate,
      requirePermission(
        Permissions.LOCATIONS_READ,
        Permissions.LOCATIONS_MANAGE,
        Permissions.SETTINGS_MANAGE,
        Permissions.CATEGORIES_MANAGE
      ),
    ],
  };

  const writeGuard = {
    preHandler: [
      fastify.authenticate,
      requirePermission(
        Permissions.LOCATIONS_CREATE,
        Permissions.LOCATIONS_UPDATE,
        Permissions.LOCATIONS_MANAGE,
        Permissions.SETTINGS_MANAGE
      ),
    ],
  };

  const statusGuard = {
    preHandler: [
      fastify.authenticate,
      requirePermission(
        Permissions.LOCATIONS_ACTIVATE,
        Permissions.LOCATIONS_DEACTIVATE,
        Permissions.LOCATIONS_MANAGE,
        Permissions.SETTINGS_MANAGE
      ),
    ],
  };

  const deleteGuard = {
    preHandler: [
      fastify.authenticate,
      requirePermission(
        Permissions.LOCATIONS_DELETE,
        Permissions.LOCATIONS_MANAGE,
        Permissions.SETTINGS_MANAGE
      ),
    ],
  };

  fastify.get('/', readGuard, LocationsAdminController.getList);
  fastify.post('/', writeGuard, LocationsAdminController.create);
  fastify.get('/tree', readGuard, LocationsAdminController.getTree);
  fastify.get('/search', readGuard, LocationsAdminController.search);
  fastify.get('/:locationId', readGuard, LocationsAdminController.getById);
  fastify.patch('/:locationId', writeGuard, LocationsAdminController.update);
  fastify.patch('/:locationId/status', statusGuard, LocationsAdminController.updateStatus);
  fastify.delete('/:locationId', deleteGuard, LocationsAdminController.delete);
  fastify.get('/:locationId/children', readGuard, LocationsAdminController.getChildren);
  fastify.get('/:locationId/descendants', readGuard, LocationsAdminController.getDescendants);
  fastify.get('/:locationId/ancestors', readGuard, LocationsAdminController.getAncestors);
}
