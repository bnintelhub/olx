import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { LocationsService } from './locations.service';
import { requirePermission } from '../../plugins/auth.plugin';
import { Permissions } from '../../shared/auth/rbac';

export class LocationsController {
  static async getCities(request: FastifyRequest, reply: FastifyReply) {
    const data = await LocationsService.getCities();
    return reply.status(200).send({ success: true, data });
  }

  static async getTree(request: FastifyRequest, reply: FastifyReply) {
    const data = await LocationsService.getTree();
    return reply.status(200).send({ success: true, data });
  }

  static async getAdminList(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const data = await LocationsService.getAdminList(
      query?.q,
      query?.type,
      query?.isActive === 'true' ? true : query?.isActive === 'false' ? false : undefined
    );
    return reply.status(200).send({ success: true, data });
  }

  static async create(request: FastifyRequest, reply: FastifyReply) {
    const data = await LocationsService.create(request.body);
    return reply.status(201).send({ success: true, data });
  }
}

export async function locationRoutes(fastify: FastifyInstance) {
  fastify.get('/cities', LocationsController.getCities);
  fastify.get('/tree', LocationsController.getTree);
  fastify.get(
    '/admin',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.SETTINGS_READ, Permissions.CATEGORIES_MANAGE)] },
    LocationsController.getAdminList
  );
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, requirePermission(Permissions.SETTINGS_MANAGE)] },
    LocationsController.create
  );
}
