import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';

export class FavouritesService {
  static async toggle(userId: string, adId: string) {
    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Listing not found');

    const existing = await prisma.favourite.findUnique({
      where: {
        userId_adId: {
          userId,
          adId,
        },
      },
    });

    let isFavourited = false;
    if (existing) {
      await prisma.favourite.delete({ where: { id: existing.id } });
      await prisma.ad.update({
        where: { id: adId },
        data: { favouriteCount: { decrement: 1 } },
      });
      isFavourited = false;
    } else {
      await prisma.favourite.create({
        data: { userId, adId },
      });
      await prisma.ad.update({
        where: { id: adId },
        data: { favouriteCount: { increment: 1 } },
      });
      isFavourited = true;
    }

    return {
      isFavourited,
      message: isFavourited ? 'Added to favourites' : 'Removed from favourites',
    };
  }
}

export class FavouritesController {
  static async toggle(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const result = await FavouritesService.toggle(request.user!.id, id);
    return reply.status(200).send({ success: true, data: result });
  }
}

export async function favouriteRoutes(fastify: FastifyInstance) {
  fastify.post('/ads/:id/favourite', { preHandler: [fastify.authenticate] }, FavouritesController.toggle);
}
