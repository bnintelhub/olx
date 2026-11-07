import { FastifyInstance } from 'fastify';
import { ListingsController } from './listings.controller';
import { SearchController } from '../search/search.controller';
import { FavouritesController } from '../favourites/favourites.routes';
import { MediaController } from '../media/media.controller';
import { requireCapability } from '../../plugins/auth.plugin';
import { AccountCapabilities } from '../../shared/auth/rbac';

export async function listingRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };
  const sellGuard = { preHandler: [fastify.authenticate, requireCapability(AccountCapabilities.CAN_SELL)] };
  const buyGuard = { preHandler: [fastify.authenticate, requireCapability(AccountCapabilities.CAN_BUY)] };

  // Public discovery
  fastify.get('/', SearchController.search);
  fastify.get('/suggestions', SearchController.getSuggestions);
  fastify.get('/my-ads', auth, ListingsController.getMyAds);
  fastify.get('/:id/similar', SearchController.getSimilar);
  fastify.get('/:id/contact', ListingsController.getContact);
  fastify.get('/:id', ListingsController.getById);

  // Authenticated actions (Enforced by account capabilities)
  fastify.post('/', sellGuard, ListingsController.create);
  fastify.post('/upload-images', sellGuard, MediaController.uploadImages);
  fastify.put('/:id', sellGuard, ListingsController.update);
  fastify.patch('/:id/status', sellGuard, ListingsController.updateStatus);
  fastify.patch('/:listingId/images', sellGuard, ListingsController.updateImages);
  fastify.delete('/:listingId/images/:mediaId', sellGuard, ListingsController.removeImage);
  fastify.post('/:id/favourite', buyGuard, FavouritesController.toggle);
}
