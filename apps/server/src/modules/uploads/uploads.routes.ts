import { FastifyInstance } from 'fastify';
import { MediaController } from '../media/media.controller';
import { requireCapability } from '../../plugins/auth.plugin';
import { AccountCapabilities } from '../../shared/auth/rbac';

export async function uploadRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/upload-images',
    { preHandler: [fastify.authenticate, requireCapability(AccountCapabilities.CAN_SELL)] },
    MediaController.uploadImages
  );
}
