import { FastifyInstance } from 'fastify';
import { ListingsController } from './listings.controller';
import { SearchController } from '../search/search.controller';
import { FavouritesController } from '../favourites/favourites.routes';

export async function listingRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  // Public discovery
  fastify.get('/', SearchController.search);
  fastify.get('/suggestions', SearchController.getSuggestions);
  fastify.get('/:id/similar', SearchController.getSimilar);
  fastify.get('/:id/contact', ListingsController.getContact);
  fastify.get('/:id', ListingsController.getById);

  // Authenticated actions
  fastify.post('/', auth, ListingsController.create);
  fastify.put('/:id', auth, ListingsController.update);
  fastify.patch('/:id/status', auth, ListingsController.updateStatus);
  fastify.post('/:id/favourite', auth, FavouritesController.toggle);
}
