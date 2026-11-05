import { FastifyInstance } from 'fastify';
import { MediaController } from './media.controller';

export async function mediaRoutes(fastify: FastifyInstance) {
  // Upload up to 10 images (max 10MB per image)
  fastify.post(
    '/images',
    { preHandler: [fastify.authenticate] },
    MediaController.uploadImages
  );

  // Retrieve media metadata by ID
  fastify.get('/:mediaId', MediaController.getMedia);

  // Delete an unattached media item
  fastify.delete(
    '/:mediaId',
    { preHandler: [fastify.authenticate] },
    MediaController.deleteMedia
  );
}

