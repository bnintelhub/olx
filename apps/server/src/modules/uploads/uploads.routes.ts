import { FastifyInstance } from 'fastify';
import { MediaController } from '../media/media.controller';
import { requireCapability } from '../../plugins/auth.plugin';
import { AccountCapabilities } from '../../shared/auth/rbac';

export async function uploadRoutes(fastify: FastifyInstance) {
  // Direct /api/v1/uploads endpoint for attachments and chat media
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const q = ((request.query as any) || {});
      if (!q.resource) q.resource = 'chats';
      (request.query as any) = q;
      return MediaController.uploadImages(request, reply);
    }
  );

  fastify.post(
    '/upload-images',
    { preHandler: [fastify.authenticate, requireCapability(AccountCapabilities.CAN_SELL)] },
    MediaController.uploadImages
  );
}
