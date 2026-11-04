import { FastifyReply, FastifyRequest } from 'fastify';
import { UsersService } from './users.service';
import { updateProfileSchema } from './users.schema';

export class UsersController {
  static async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = await UsersService.getProfile(request.user!.id);
    return reply.status(200).send({ success: true, data: user });
  }

  static async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const body = updateProfileSchema.parse(request.body);
    const updated = await UsersService.updateProfile(request.user!.id, body);
    return reply.status(200).send({ success: true, data: updated });
  }

  static async requestIdentityVerification(request: FastifyRequest, reply: FastifyReply) {
    const profile = await UsersService.verifyIdentity(request.user!.id);
    return reply.status(200).send({
      success: true,
      data: profile,
      message: 'Identity verification badge applied successfully!',
    });
  }

  static async getFavourites(request: FastifyRequest, reply: FastifyReply) {
    const ads = await UsersService.getFavourites(request.user!.id);
    return reply.status(200).send({
      success: true,
      data: { ads, total: ads.length },
    });
  }
}
