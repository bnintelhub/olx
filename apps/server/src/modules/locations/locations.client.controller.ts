import { FastifyReply, FastifyRequest } from 'fastify';
import { LocationsService } from './locations.service';
import { NearbyLocationParams } from './locations.types';

export class LocationsClientController {
  // Return active root locations (countries)
  static async getRoots(_request: FastifyRequest, reply: FastifyReply) {
    const data = await LocationsService.getChildren(null, true);
    return reply.status(200).send({ success: true, data });
  }

  // Return active children of a given parent location
  static async getChildren(request: FastifyRequest, reply: FastifyReply) {
    const { locationId } = request.params as { locationId: string };
    const data = await LocationsService.getChildren(locationId, true);
    return reply.status(200).send({ success: true, data });
  }

  // Location detail with breadcrumbs
  static async getById(request: FastifyRequest, reply: FastifyReply) {
    const { locationId } = request.params as { locationId: string };
    const data = await LocationsService.getById(locationId);
    if (!data.isActive) {
      return reply.status(404).send({
        success: false,
        error: { code: 'LOCATION_INACTIVE', message: 'Requested location is currently inactive' },
      });
    }
    return reply.status(200).send({ success: true, data });
  }

  // Breadcrumbs/ancestors from root down to current location
  static async getAncestors(request: FastifyRequest, reply: FastifyReply) {
    const { locationId } = request.params as { locationId: string };
    const data = await LocationsService.getAncestors(locationId);
    return reply.status(200).send({ success: true, data });
  }

  // Public search by keyword with parent breadcrumbs
  static async search(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query || {}) as { q?: string; limit?: string };
    const q = query.q || '';
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const data = await LocationsService.clientSearch(q, limit);
    return reply.status(200).send({ success: true, data });
  }

  // Proximity resolution by GPS coordinates
  static async nearby(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query || {}) as NearbyLocationParams;
    const { latitude, longitude, radiusKm, type, limit } = query;
    if (latitude === undefined || longitude === undefined || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: 'Valid latitude and longitude are required' },
      });
    }

    const data = await LocationsService.nearby({
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusKm: radiusKm ? Number(radiusKm) : 15,
      type,
      limit: limit ? Number(limit) : 20,
    });
    return reply.status(200).send({ success: true, data });
  }

  // Legacy cities list support
  static async getCities(_request: FastifyRequest, reply: FastifyReply) {
    const data = await LocationsService.getCities();
    return reply.status(200).send({ success: true, data });
  }

  // Legacy active tree support
  static async getTree(_request: FastifyRequest, reply: FastifyReply) {
    const data = await LocationsService.getTree(true);
    return reply.status(200).send({ success: true, data });
  }
}
