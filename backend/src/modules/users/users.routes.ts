import { FastifyInstance } from 'fastify';
import { UsersController } from './users.controller';

export async function userRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/profile', auth, UsersController.getProfile);
  fastify.put('/profile', auth, UsersController.updateProfile);
  fastify.post('/verify-identity', auth, UsersController.requestIdentityVerification);
  fastify.get('/favourites', auth, UsersController.getFavourites);
}
