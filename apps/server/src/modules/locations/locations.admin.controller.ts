import { FastifyReply, FastifyRequest } from 'fastify';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto, LocationSearchParams } from './locations.types';

export class LocationsAdminController {
  static async getTree(request: FastifyRequest, reply: FastifyReply) {
    const data = await LocationsService.getTree(false);
    return reply.status(200).send({ success: true, data });
  }

  static async search(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as LocationSearchParams;
    const data = await LocationsService.adminSearch(query);
    return reply.status(200).send({ success: true, data });
  }

  static async getList(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as LocationSearchParams;
    const data = await LocationsService.adminSearch(query);
    return reply.status(200).send({ success: true, data });
  }

  static async getById(request: FastifyRequest, reply: FastifyReply) {
    const { locationId } = request.params as { locationId: string };
    const data = await LocationsService.getById(locationId);
    return reply.status(200).send({ success: true, data });
  }

  static async getChildren(request: FastifyRequest, reply: FastifyReply) {
    const { locationId } = request.params as { locationId: string };
    const data = await LocationsService.getChildren(locationId, false);
    return reply.status(200).send({ success: true, data });
  }

  static async getDescendants(request: FastifyRequest, reply: FastifyReply) {
    const { locationId } = request.params as { locationId: string };
    const data = await LocationsService.getDescendants(locationId, false);
    return reply.status(200).send({ success: true, data });
  }

  static async getAncestors(request: FastifyRequest, reply: FastifyReply) {
    const { locationId } = request.params as { locationId: string };
    const data = await LocationsService.getAncestors(locationId);
    return reply.status(200).send({ success: true, data });
  }

  static async create(request: FastifyRequest, reply: FastifyReply) {
    const actorId = (request as any).user?.id;
    const body = request.body as CreateLocationDto;
    const data = await LocationsService.create(body, actorId);
    return reply.status(201).send({ success: true, data });
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const { locationId } = request.params as { locationId: string };
    const actorId = (request as any).user?.id;
    const body = request.body as UpdateLocationDto;
    const data = await LocationsService.update(locationId, body, actorId);
    return reply.status(200).send({ success: true, data });
  }

  static async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { locationId } = request.params as { locationId: string };
    const actorId = (request as any).user?.id;
    const body = (request.body || {}) as { isActive: boolean };
    const data = await LocationsService.updateStatus(locationId, Boolean(body.isActive), actorId);
    return reply.status(200).send({ success: true, data });
  }

  static async delete(request: FastifyRequest, reply: FastifyReply) {
    const { locationId } = request.params as { locationId: string };
    const actorId = (request as any).user?.id;
    const data = await LocationsService.delete(locationId, actorId);
    return reply.status(200).send({ success: true, data });
  }
}
