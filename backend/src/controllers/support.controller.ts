import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { TicketPriority } from '@prisma/client';

export class SupportController {
  static async createTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { category, subject, message, priority = 'NORMAL' } = req.body;
      if (!String(category || '').trim() || !String(subject || '').trim() || !String(message || '').trim()) {
        throw new AppError(400, 'TICKET_FIELDS_REQUIRED', 'Category, subject and message are required');
      }
      if (!Object.values(TicketPriority).includes(priority)) throw new AppError(400, 'INVALID_PRIORITY', 'Invalid ticket priority');
      const ticket = await prisma.supportTicket.create({ data: {
        requesterId: req.user!.id, category: String(category).trim(), subject: String(subject).trim(), priority,
        slaTargetAt: new Date(Date.now() + (priority === TicketPriority.URGENT ? 4 : 24) * 60 * 60 * 1000),
        entries: { create: { authorId: req.user!.id, body: String(message).trim(), isInternal: false } },
      }, include: { entries: true } });
      res.status(201).json({ success: true, data: ticket });
    } catch (err) { next(err); }
  }

  static async getMyTickets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tickets = await prisma.supportTicket.findMany({ where: { requesterId: req.user!.id }, orderBy: { updatedAt: 'desc' }, include: { entries: { where: { isInternal: false }, orderBy: { createdAt: 'asc' } } } });
      res.json({ success: true, data: { tickets } });
    } catch (err) { next(err); }
  }
}
