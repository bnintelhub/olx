import { prisma } from '../../../config/prisma';
import { PaymentStatus, PaymentPurpose, Prisma } from '@prisma/client';

export interface ExportFilterParams {
  status?: string;
  purpose?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
  search?: string;
}

export class PaymentExportService {
  static async exportToCsv(params: ExportFilterParams): Promise<string> {
    const where: Prisma.PaymentOrderWhereInput = {};

    if (params.status && params.status !== 'ALL') {
      where.status = params.status as PaymentStatus;
    }
    if (params.purpose && params.purpose !== 'ALL') {
      where.purpose = params.purpose as PaymentPurpose;
    }
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { phoneNumber: { contains: q } } },
        { user: { profile: { name: { contains: q, mode: 'insensitive' } } } },
        { transactions: { some: { merchantTransactionId: { contains: q, mode: 'insensitive' } } } },
        { transactions: { some: { providerTransactionId: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const orders = await prisma.paymentOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 2000,
      include: {
        user: { select: { email: true, phoneNumber: true, profile: { select: { name: true } } } },
        listing: { select: { title: true } },
        transactions: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    const headers = [
      'Transaction ID',
      'Order ID',
      'Provider Ref',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Purpose',
      'Listing Title',
      'Amount (INR)',
      'Status',
      'Payment Method',
      'Created At',
      'Paid At',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = orders.map((o) => {
      const txn = o.transactions[0];
      return [
        txn?.merchantTransactionId || o.id,
        o.id,
        txn?.providerTransactionId || 'N/A',
        o.user.profile?.name || 'User',
        o.user.email || 'N/A',
        o.user.phoneNumber || 'N/A',
        o.purpose,
        o.listing?.title || 'General Ad Pack',
        Number(o.amount).toFixed(2),
        o.status,
        txn?.paymentMethod || 'UPI',
        o.createdAt.toISOString(),
        txn?.paidAt ? txn.paidAt.toISOString() : 'N/A',
      ].map(escapeCsv).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
