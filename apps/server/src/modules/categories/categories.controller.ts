import { FastifyReply, FastifyRequest } from 'fastify';
import { CategoriesService } from './categories.service';
import { defaultStorage } from '../../integrations/storage/storage.adapter';
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  toggleCategoryStatusSchema,
  createAttributeSchema,
  updateAttributeSchema,
} from './categories.schema';
import { writeAuditLog } from '../../shared/utils/audit.util';

export class CategoriesController {
  // Public & admin flat category fetch
  static async getAll(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { includeInactive?: string };
    const includeInactive = query.includeInactive === 'true';
    const data = await CategoriesService.getAll({ includeInactive });
    return reply.status(200).send({ success: true, data });
  }

  // Public & admin hierarchical tree fetch
  static async getTree(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { includeInactive?: string };
    const includeInactive = query.includeInactive === 'true';
    const data = await CategoriesService.getTree({ includeInactive });
    return reply.status(200).send({ success: true, data });
  }

  // Fetch category by slug with ancestor breadcrumbs
  static async getBySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const query = request.query as { parentId?: string; includeInactive?: string };
    const includeInactive = query.includeInactive === 'true';
    const data = await CategoriesService.getBySlug(slug, {
      parentId: query.parentId,
      includeInactive,
    });
    return reply.status(200).send({ success: true, data });
  }

  // Traverses ancestor tree to collect inherited dynamic attributes
  static async getAttributes(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await CategoriesService.getAttributes(id);
    return reply.status(200).send({ success: true, data });
  }

  // Admin category creation (supports direct multipart image upload or JSON)
  static async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id || 'system';
    const host = request.headers.host || 'localhost:5000';
    const protocol = request.protocol === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    // Handle atomic direct image upload with category data
    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, any> = {};
      let filePart: any = null;

      try {
        for await (const part of parts) {
          if (part.type === 'file') {
            if (part.fieldname === 'image' || part.fieldname === 'file') {
              const tempFileName = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`;
              const { tempPath, size, initialBuffer } = await defaultStorage.saveTemporaryFile(
                part.file,
                tempFileName
              );
              filePart = {
                tempPath,
                size,
                initialBuffer,
                mimetype: part.mimetype,
                filename: part.filename,
              };
            } else {
              // Discard any unhandled file streams
              await part.toBuffer?.();
            }
          } else {
            fields[part.fieldname] = part.value;
          }
        }

        const category = await CategoriesService.createWithFile(fields, filePart, userId, baseUrl);

        await writeAuditLog({
          userId: request.user?.id,
          action: 'ADMIN_CREATE_CATEGORY',
          entityType: 'CATEGORY',
          entityId: category.id,
          newData: category,
          request,
        });

        return reply.status(201).send({ success: true, data: category });
      } catch (error) {
        // Guarantee clean rollback: delete temp file if category creation fails
        if (filePart?.tempPath) {
          await defaultStorage.deleteFile(filePart.tempPath).catch(() => {});
        }
        throw error;
      }
    }

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

  // Admin category update (supports direct multipart image upload / replacement or JSON)
  static async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const userId = request.user?.id || 'system';
    const host = request.headers.host || 'localhost:5000';
    const protocol = request.protocol === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, any> = {};
      let filePart: any = null;

      try {
        for await (const part of parts) {
          if (part.type === 'file') {
            if (part.fieldname === 'image' || part.fieldname === 'file') {
              const tempFileName = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`;
              const { tempPath, size, initialBuffer } = await defaultStorage.saveTemporaryFile(
                part.file,
                tempFileName
              );
              filePart = {
                tempPath,
                size,
                initialBuffer,
                mimetype: part.mimetype,
                filename: part.filename,
              };
            } else {
              await part.toBuffer?.();
            }
          } else {
            fields[part.fieldname] = part.value;
          }
        }

        const category = await CategoriesService.updateWithFile(id, fields, filePart, userId, baseUrl);

        await writeAuditLog({
          userId: request.user?.id,
          action: 'ADMIN_UPDATE_CATEGORY',
          entityType: 'CATEGORY',
          entityId: id,
          newData: category,
          request,
        });

        return reply.status(200).send({ success: true, data: category });
      } catch (error) {
        // Guarantee clean rollback: delete temp file if category update fails
        if (filePart?.tempPath) {
          await defaultStorage.deleteFile(filePart.tempPath).catch(() => {});
        }
        throw error;
      }
    }

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

  // Admin transactional reordering
  static async reorder(request: FastifyRequest, reply: FastifyReply) {
    const body = reorderCategoriesSchema.parse(request.body);
    const result = await CategoriesService.reorder(body);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'ADMIN_REORDER_CATEGORIES',
      entityType: 'CATEGORY',
      entityId: 'BATCH_REORDER',
      newData: body,
      request,
    });

    return reply.status(200).send({ success: true, data: result });
  }

  // Admin active/inactive status toggle
  static async toggleStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { isActive } = toggleCategoryStatusSchema.parse(request.body);
    const updated = await CategoriesService.toggleActive(id, isActive);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'ADMIN_TOGGLE_CATEGORY_STATUS',
      entityType: 'CATEGORY',
      entityId: id,
      newData: { isActive },
      request,
    });

    return reply.status(200).send({ success: true, data: updated });
  }

  // Admin deletion with active listing & child checks
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

    return reply.status(200).send({
      success: true,
      data: { message: `Category "${category.name}" deleted successfully` },
    });
  }

  // Dynamic attribute management
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
    const attribute = await CategoriesService.deleteAttribute(attrId);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'ADMIN_DELETE_CATEGORY_ATTRIBUTE',
      entityType: 'CATEGORY_ATTRIBUTE',
      entityId: attrId,
      oldData: attribute,
      request,
    });

    return reply.status(200).send({ success: true, data: { message: 'Attribute deleted successfully' } });
  }
}
