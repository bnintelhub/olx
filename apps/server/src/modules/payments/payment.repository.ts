import { prisma } from '../../config/prisma';
import { PaymentOrder, PaymentTransaction, PaymentStatus, PaymentPurpose } from './payment.types';
import { Prisma } from '@prisma/client';

export class PaymentRepository {
  // Creates payment order and initial transaction in a single database transaction
  static async createOrderAndTransaction(params: {
    orderId: string;
    userId: string;
    listingId?: string;
    purpose: PaymentPurpose;
    productId: string;
    amount: number;
    currency: string;
    expiresAt: Date;
    metadata?: Record<string, any>;
    merchantTransactionId: string;
    provider: string;
  }): Promise<{ order: PaymentOrder; transaction: PaymentTransaction }> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.paymentOrder.create({
        data: {
          id: params.orderId,
          userId: params.userId,
          listingId: params.listingId || null,
          purpose: params.purpose,
          productId: params.productId,
          amount: new Prisma.Decimal(params.amount),
          currency: params.currency,
          status: PaymentStatus.CREATED,
          metadata: params.metadata || {},
          expiresAt: params.expiresAt,
        },
      });

      const transaction = await tx.paymentTransaction.create({
        data: {
          paymentOrderId: order.id,
          provider: params.provider,
          merchantTransactionId: params.merchantTransactionId,
          amount: new Prisma.Decimal(params.amount),
          currency: params.currency,
          status: PaymentStatus.INITIATED,
        },
      });

      return { order, transaction };
    });
  }

  // Finds payment order with transactions and listing details
  static async findOrderById(id: string) {
    return prisma.paymentOrder.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        listing: {
          select: { id: true, title: true, status: true, userId: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            profile: { select: { name: true } },
          },
        },
      },
    });
  }

  // Finds payment transaction by unique merchant transaction ID
  static async findTransactionByMerchantId(merchantTransactionId: string) {
    return prisma.paymentTransaction.findFirst({
      where: { merchantTransactionId },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phoneNumber: true,
                profile: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  // Queries paginated payment orders with optional status filter and text search for finance ledger
  static async findAdminOrders(params: {
    page?: number;
    limit?: number;
    status?: PaymentStatus | 'ALL';
    search?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentOrderWhereInput = {};

    if (params.status && params.status !== 'ALL') {
      where.status = params.status as PaymentStatus;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { productId: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { phoneNumber: { contains: q, mode: 'insensitive' } } },
        { user: { profile: { name: { contains: q, mode: 'insensitive' } } } },
        { listing: { title: { contains: q, mode: 'insensitive' } } },
        { transactions: { some: { merchantTransactionId: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [totalItems, orders] = await Promise.all([
      prisma.paymentOrder.count({ where }),
      prisma.paymentOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phoneNumber: true,
              profile: { select: { name: true } },
            },
          },
          listing: {
            select: {
              id: true,
              title: true,
              price: true,
              status: true,
            },
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    return {
      items: orders,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }

  // Atomically updates transaction and parent order status upon payment confirmation
  static async updatePaymentStatus(params: {
    transactionId: string;
    orderId: string;
    status: PaymentStatus;
    providerTransactionId?: string;
    paymentMethod?: string;
    providerResponse?: Record<string, any>;
    paidAt?: Date;
  }): Promise<{ order: PaymentOrder; transaction: PaymentTransaction }> {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.update({
        where: { id: params.transactionId },
        data: {
          status: params.status,
          providerTransactionId: params.providerTransactionId || undefined,
          paymentMethod: params.paymentMethod || undefined,
          providerResponse: params.providerResponse || undefined,
          paidAt: params.paidAt || undefined,
        },
      });

      const order = await tx.paymentOrder.update({
        where: { id: params.orderId },
        data: {
          status: params.status,
        },
      });

      return { order, transaction };
    });
  }

  // Updates transaction and order to REFUNDED status
  static async markRefunded(params: {
    transactionId: string;
    orderId: string;
    refundedAmount: number;
    refundReason?: string;
    providerResponse?: Record<string, any>;
  }): Promise<{ order: PaymentOrder; transaction: PaymentTransaction }> {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.update({
        where: { id: params.transactionId },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAmount: new Prisma.Decimal(params.refundedAmount),
          refundReason: params.refundReason || 'Customer support refund',
          providerResponse: params.providerResponse || undefined,
        },
      });

      const order = await tx.paymentOrder.update({
        where: { id: params.orderId },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      return { order, transaction };
    });
  }
}

