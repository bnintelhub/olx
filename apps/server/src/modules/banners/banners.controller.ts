import { FastifyReply, FastifyRequest } from 'fastify';
import { BannersService } from './banners.service';
import {
  createBannerSchema,
  updateBannerSchema,
  queryBannersSchema,
  adminQueryBannersSchema,
  bannerIdParamSchema,
} from './banners.schema';

export class BannersController {
  // Public client endpoints
  static async getActive(request: FastifyRequest, reply: FastifyReply) {
    const query = queryBannersSchema.parse(request.query);
    const data = await BannersService.getActiveBanners(query);
    return reply.status(200).send({ success: true, data });
  }

  static async trackImpression(request: FastifyRequest, reply: FastifyReply) {
    const { id } = bannerIdParamSchema.parse(request.params);
    const result = await BannersService.recordImpression(id);
    return reply.status(200).send(result);
  }

  static async trackClick(request: FastifyRequest, reply: FastifyReply) {
    const { id } = bannerIdParamSchema.parse(request.params);
    const result = await BannersService.recordClick(id);
    return reply.status(200).send(result);
  }

  // Admin endpoints
  static async getAdminBanners(request: FastifyRequest, reply: FastifyReply) {
    const query = adminQueryBannersSchema.parse(request.query);
    const result = await BannersService.getAdminBanners(query);
    return reply.status(200).send({ success: true, ...result });
  }

  static async uploadMedia(request: FastifyRequest, reply: FastifyReply) {
    if (!request.isMultipart()) {
      return reply.status(400).send({
        success: false,
        message: 'Request must be multipart/form-data',
      });
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({
        success: false,
        message: 'No file uploaded',
      });
    }

    const result = await BannersService.uploadBannerMedia(file);
    return reply.status(201).send({ success: true, ...result });
  }

  static async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createBannerSchema.parse(request.body);
    const banner = await BannersService.createBanner(body);
    return reply.status(201).send({ success: true, data: banner });
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = bannerIdParamSchema.parse(request.params);
    const body = updateBannerSchema.parse(request.body);
    const banner = await BannersService.updateBanner(id, body);
    return reply.status(200).send({ success: true, data: banner });
  }

  static async toggleStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = bannerIdParamSchema.parse(request.params);
    const body = request.body as { status?: string };
    const banner = await BannersService.toggleStatus(id, body?.status);
    return reply.status(200).send({ success: true, data: banner });
  }

  static async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = bannerIdParamSchema.parse(request.params);
    const result = await BannersService.deleteBanner(id);
    return reply.status(200).send(result);
  }
}

