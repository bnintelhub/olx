import { FastifyReply, FastifyRequest } from 'fastify';
import { ReportsService } from './reports.service';
import {
  reportAdSchema,
  blockUserSchema,
  reviewAdSchema,
  resolveReportSchema,
} from './reports.schema';
import { writeAuditLog } from '../../shared/utils/audit.util';

export class ReportsController {
  static async reportAd(request: FastifyRequest, reply: FastifyReply) {
    const { adId, reason, details } = reportAdSchema.parse(request.body);
    const report = await ReportsService.reportAd(request.user!.id, adId, reason, details);
    return reply.status(201).send({
      success: true,
      data: report,
      message: 'Report submitted successfully.',
    });
  }

  static async blockUser(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = blockUserSchema.parse(request.body);
    const block = await ReportsService.blockUser(request.user!.id, userId);
    return reply.status(200).send({
      success: true,
      data: block,
      message: 'User blocked successfully.',
    });
  }

  static async getPendingAds(request: FastifyRequest, reply: FastifyReply) {
    const ads = await ReportsService.getPendingAds();
    return reply.status(200).send({
      success: true,
      data: { ads, total: ads.length },
    });
  }

  static async reviewAd(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { action, rejectionReason } = reviewAdSchema.parse(request.body);
    const ad = await ReportsService.reviewAd(id, action, rejectionReason);

    await writeAuditLog({
      userId: request.user?.id,
      action: action === 'APPROVE' ? 'MODERATION_APPROVE_AD' : 'MODERATION_REJECT_AD',
      entityType: 'AD',
      entityId: id,
      request,
    });

    return reply.status(200).send({
      success: true,
      data: ad,
      message: `Listing ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
    });
  }

  static async getReports(request: FastifyRequest, reply: FastifyReply) {
    const reports = await ReportsService.getReports();
    return reply.status(200).send({ success: true, data: { reports, total: reports.length } });
  }

  static async resolveReport(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = resolveReportSchema.parse(request.body);
    const updated = await ReportsService.resolveReport(id, body);

    await writeAuditLog({
      userId: request.user?.id,
      action: 'MODERATION_RESOLVE_REPORT',
      entityType: 'REPORT',
      entityId: id,
      request,
    });

    return reply.status(200).send({ success: true, data: updated, message: 'Report updated successfully' });
  }
}
