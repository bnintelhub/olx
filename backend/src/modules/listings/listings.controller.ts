import { FastifyReply, FastifyRequest } from 'fastify';
import { ListingsService } from './listings.service';
import {
  createListingSchema,
  updateListingSchema,
  updateListingStatusSchema,
} from './listings.schema';
import { AdStatus } from '@prisma/client';

export class ListingsController {
  static async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createListingSchema.parse(request.body);
    const ad = await ListingsService.create(request.user!.id, body);
    return reply.status(201).send({
      success: true,
      data: ad,
      message: 'Listing posted successfully and is now LIVE!',
    });
  }

  static async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const ad = await ListingsService.getById(id);
    return reply.status(200).send({ success: true, data: ad });
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = updateListingSchema.parse(request.body);
    const updated = await ListingsService.update(
      request.user!.id,
      request.user!.role,
      id,
      body
    );
    return reply.status(200).send({ success: true, data: updated });
  }

  static async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { status } = updateListingStatusSchema.parse(request.body);
    const updated = await ListingsService.updateStatus(
      request.user!.id,
      request.user!.role,
      id,
      status
    );
    return reply.status(200).send({
      success: true,
      data: updated,
      message: `Listing status updated to ${status}`,
    });
  }

  static async getContact(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const contact = await ListingsService.getContact(id);
    return reply.status(200).send({ success: true, data: contact });
  }

  static async getMyAds(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { status?: string };
    const status = query?.status as AdStatus | undefined;
    const data = await ListingsService.getMyAds(request.user!.id, status);
    return reply.status(200).send({ success: true, data });
  }
}
