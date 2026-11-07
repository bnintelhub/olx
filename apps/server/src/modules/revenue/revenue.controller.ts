import { FastifyReply, FastifyRequest } from 'fastify';
import { RevenueService } from './revenue.service';
import { AppError } from '../../shared/errors/app-error';

export class RevenueController {
  // GET /v1/revenue/policy - Public view of current pricing & policy
  static async getPublicPolicy(_request: FastifyRequest, reply: FastifyReply) {
    const policy = await RevenueService.getPolicy();
    return reply.status(200).send({
      success: true,
      data: policy,
    });
  }

  // GET /v1/revenue/quota - Current authenticated user's free & paid quota status
  static async getUserQuota(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id;
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required to check listing quota');
    }

    const quota = await RevenueService.getUserListingQuota(userId);
    return reply.status(200).send({
      success: true,
      data: quota,
    });
  }

  // GET /v1/revenue/admin/policy - Full administrative policy view
  static async adminGetPolicy(_request: FastifyRequest, reply: FastifyReply) {
    const policy = await RevenueService.getPolicy();
    return reply.status(200).send({
      success: true,
      data: policy,
    });
  }

  // PUT /v1/revenue/admin/policy - Dynamically update platform revenue & monetization policy
  static async adminUpdatePolicy(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as any;
    const adminId = request.user?.id;
    const updated = await RevenueService.updatePolicy(body, adminId);
    return reply.status(200).send({
      success: true,
      data: updated,
      message: 'Revenue & monetization policy updated and applied across the marketplace successfully',
    });
  }

  // POST /v1/revenue/admin/policy/reset - Reset policy to default baseline
  static async adminResetPolicy(request: FastifyRequest, reply: FastifyReply) {
    const adminId = request.user?.id;
    const reset = await RevenueService.resetPolicy(adminId);
    return reply.status(200).send({
      success: true,
      data: reset,
      message: 'Revenue policy reset to system defaults',
    });
  }
}

