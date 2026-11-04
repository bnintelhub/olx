import { FastifyReply, FastifyRequest } from 'fastify';
import { CategoriesService } from './categories.service';
import {
  createCategorySchema,
  updateCategorySchema,
  createAttributeSchema,
  updateAttributeSchema,
} from './categories.schema';
import { writeAuditLog } from '../../shared/utils/audit.util';

export class CategoriesController {
  static async getAll(request: FastifyRequest, reply: FastifyReply) {
    const data = await CategoriesService.getAll();
    return reply.status(200).send({ success: true, data });
  }

  static async getTree(request: FastifyRequest, reply: FastifyReply) {
    const data = await CategoriesService.getTree();
    return reply.status(200).send({ success: true, data });
  }

  static async getBySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const data = await CategoriesService.getBySlug(slug);
    return reply.status(200).send({ success: true, data });
  }

  static async getAttributes(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await CategoriesService.getAttributes(id);
    return reply.status(200).send({ success: true, data });
  }

  static async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createCategorySchema.parse(request.body);
    const category = await CategoriesService.create(body);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'ADMIN_CREATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: category.id,
      newData: category,
      request,
    });

    return reply.status(201).send({ success: true, data: category });
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = updateCategorySchema.parse(request.body);
    const category = await CategoriesService.update(id, body);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'ADMIN_UPDATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: id,
      newData: category,
      request,
    });

    return reply.status(200).send({ success: true, data: category });
  }

  static async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const category = await CategoriesService.delete(id);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'ADMIN_DELETE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: id,
      oldData: category,
      request,
    });

    return reply.status(200).send({ success: true, data: { message: 'Category deleted successfully' } });
  }

  static async addAttribute(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = createAttributeSchema.parse(request.body);
    const attribute = await CategoriesService.addAttribute(id, body);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'ADMIN_CREATE_CATEGORY_ATTRIBUTE',
      entityType: 'CATEGORY_ATTRIBUTE',
      entityId: attribute.id,
      newData: attribute,
      request,
    });

    return reply.status(201).send({ success: true, data: attribute });
  }

  static async updateAttribute(request: FastifyRequest, reply: FastifyReply) {
    const { attrId } = request.params as { attrId: string };
    const body = updateAttributeSchema.parse(request.body);
    const attribute = await CategoriesService.updateAttribute(attrId, body);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'ADMIN_UPDATE_CATEGORY_ATTRIBUTE',
      entityType: 'CATEGORY_ATTRIBUTE',
      entityId: attrId,
      newData: attribute,
      request,
    });

    return reply.status(200).send({ success: true, data: attribute });
  }

  static async deleteAttribute(request: FastifyRequest, reply: FastifyReply) {
    const { attrId } = request.params as { attrId: string };
    const current = await CategoriesService.deleteAttribute(attrId);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'ADMIN_DELETE_CATEGORY_ATTRIBUTE',
      entityType: 'CATEGORY_ATTRIBUTE',
      entityId: attrId,
      oldData: current,
      request,
    });

    return reply.status(200).send({ success: true, data: { message: 'Attribute deleted successfully' } });
  }
}
