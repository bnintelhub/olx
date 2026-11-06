import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { writeAuditLog } from '../../shared/utils/audit.util';
import {
  CreatePaymentOrderInput,
  PaymentOrderResult,
  PaymentStatus,
  VerifyPaymentResult,
  RefundResult,
  PayUCallbackPayload,
} from './payment.types';
import { getCatalogProduct, validatePurposeWithProduct, PRODUCT_CATALOG } from './payment.catalog';
import { PaymentRepository } from './payment.repository';
import { PayUProvider } from './providers/payu/payu.provider';
import { PaymentProvider } from './providers/payment-provider.interface';
import { queuePaymentFulfillmentJob } from '../../jobs/payment-fulfillment.job';
import { PayUWebhookService } from './providers/payu/payu.webhook';
import { assertValidTransition } from './payment.state-machine';

export class PaymentService {
  private static provider: PaymentProvider = new PayUProvider();

  // Generates unique merchant transaction identifier (e.g. OLX_20261106_A1B2C3D4)
  private static generateMerchantTxnId(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `OLX_${dateStr}_${randomHex}`;
  }

  // Generates unique internal payment order identifier
  private static generateOrderId(): string {
    const randomHex = crypto.randomBytes(4).toString('hex').toLowerCase();
    return `payord_${Date.now()}_${randomHex}`;
  }

  // Resolves backend API callback URL for PayU hosted redirects
  private static getCallbackUrl(type: 'success' | 'failure'): string {
    const host = process.env.SERVER_URL || `http://localhost:${env.PORT}`;
    const cleanHost = host.replace(/\/+$/, '');
    return `${cleanHost}/api/v1/payments/payu/${type}`;
  }

  // Step 1: Initiates payment order, calculates price server-side, and generates PayU checkout payload
  static async createPaymentOrder(
    userId: string,
    input: CreatePaymentOrderInput
  ): Promise<PaymentOrderResult> {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

    // 1. Validate product catalogue server-side (amount is never trusted from client)
    const product = getCatalogProduct(input.productId);
    validatePurposeWithProduct(input.purpose, product);

    // 2. Validate listing association if applicable
    if (input.listingId) {
      const listing = await prisma.ad.findUnique({ where: { id: input.listingId } });
      if (!listing) throw new AppError(404, 'LISTING_NOT_FOUND', 'Target listing does not exist');
      if (listing.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'You can only promote listings that you own');
      }
      if (listing.status !== 'ACTIVE') {
        throw new AppError(
          400,
          'INVALID_LISTING_STATUS',
          `Cannot promote listing with status "${listing.status}". Listing must be active.`
        );
      }
    }

    const orderId = this.generateOrderId();
    const merchantTransactionId = this.generateMerchantTxnId();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins window

    // 3. Persist order & initial transaction in database
    const { order } = await PaymentRepository.createOrderAndTransaction({
      orderId,
      userId,
      listingId: input.listingId,
      purpose: input.purpose,
      productId: product.productId,
      amount: product.amount,
      currency: product.currency,
      expiresAt,
      metadata: {
        productName: product.name,
        durationDays: product.durationDays,
        clientReturnUrl: input.returnUrl,
      },
      merchantTransactionId,
      provider: 'PAYU',
    });

    // 4. Generate PayU Hosted Checkout parameters and cryptographic SHA-512 hash
    const checkoutResult = await this.provider.createPayment({
      merchantTransactionId,
      amount: product.amount,
      currency: product.currency,
      productInfo: product.name,
      customerName: user.profile?.name || 'BharatMarket User',
      customerEmail: user.email || `${user.phoneNumber || 'user'}@bharatmarket.in`,
      customerPhone: user.phoneNumber || undefined,
      successUrl: this.getCallbackUrl('success'),
      failureUrl: this.getCallbackUrl('failure'),
      udf1: order.id,
      udf2: input.listingId || '',
      udf3: input.purpose,
      udf4: product.productId,
      udf5: userId,
    });

    await writeAuditLog({
      userId,
      action: 'PAYMENT_CREATED',
      entityType: 'PAYMENT_ORDER',
      entityId: order.id,
      status: 'SUCCESS',
      newData: {
        orderId: order.id,
        merchantTransactionId,
        productId: product.productId,
        amount: product.amount,
        purpose: input.purpose,
      },
    });

    return {
      paymentOrderId: order.id,
      transactionId: merchantTransactionId,
      purpose: order.purpose,
      productId: order.productId,
      amount: Number(order.amount),
      currency: order.currency,
      status: order.status,
      checkoutUrl: checkoutResult.checkoutUrl,
      checkoutParams: checkoutResult.checkoutParams,
      expiresAt: order.expiresAt,
    };
  }

  // Retrieves order details with transaction state (strictly enforces ownership)
  static async getPaymentOrder(userId: string, orderId: string) {
    const order = await PaymentRepository.findOrderById(orderId);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Payment order not found');

    if (order.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this payment order');
    }

    const latestTxn = order.transactions[0];

    return {
      id: order.id,
      purpose: order.purpose,
      productId: order.productId,
      amount: Number(order.amount),
      currency: order.currency,
      status: order.status,
      expiresAt: order.expiresAt,
      createdAt: order.createdAt,
      listing: order.listing,
      transaction: latestTxn
        ? {
            merchantTransactionId: latestTxn.merchantTransactionId,
            providerTransactionId: latestTxn.providerTransactionId,
            status: latestTxn.status,
            paymentMethod: latestTxn.paymentMethod,
            paidAt: latestTxn.paidAt,
          }
        : null,
    };
  }

  // Verifies payment status directly with PayU and applies fulfillment if paid
  static async verifyPayment(userId: string, id: string): Promise<VerifyPaymentResult> {
    // Allows querying by either order ID (payord_xxx) or transaction ID (OLX_xxx)
    let transaction = await PaymentRepository.findTransactionByMerchantId(id);
    let order: any = null;

    if (transaction) {
      order = transaction.order;
    } else {
      order = await PaymentRepository.findOrderById(id);
      if (order && order.transactions.length > 0) {
        transaction = order.transactions[0];
      }
    }

    if (!order || !transaction) {
      throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment transaction not found');
    }

    if (order.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    // Idempotency: If already verified SUCCESS, return immediately
    if (order.status === PaymentStatus.SUCCESS) {
      return {
        paymentOrderId: order.id,
        transactionId: transaction.merchantTransactionId,
        status: PaymentStatus.SUCCESS,
        amount: Number(order.amount),
        currency: order.currency,
        isFulfilled: true,
        message: 'Payment verified successfully.',
      };
    }

    // Call PayU API server-to-server to inspect authoritative state
    const verifyResult = await this.provider.verifyPayment(transaction.merchantTransactionId);

    // Verify amount and currency
    if (verifyResult.isVerified) {
      const expectedAmount = Number(order.amount);
      if (!PayUWebhookService.validateAmount(expectedAmount, verifyResult.amount)) {
        await writeAuditLog({
          userId,
          action: 'PAYMENT_VERIFICATION_FAILED',
          entityType: 'PAYMENT_TRANSACTION',
          entityId: transaction.id,
          status: 'FAILED',
          reason: `Amount mismatch: Expected ₹${expectedAmount}, got ₹${verifyResult.amount}`,
        });

        throw new AppError(
          400,
          'PAYMENT_AMOUNT_MISMATCH',
          'Paid amount does not match order configuration. Flagged for review.'
        );
      }

      assertValidTransition(transaction.status, PaymentStatus.SUCCESS);

      await PaymentRepository.updatePaymentStatus({
        transactionId: transaction.id,
        orderId: order.id,
        status: PaymentStatus.SUCCESS,
        providerTransactionId: verifyResult.providerTransactionId,
        paymentMethod: verifyResult.paymentMethod,
        providerResponse: verifyResult.rawResponse,
        paidAt: new Date(),
      });

      // Dispatch async fulfillment worker job
      await queuePaymentFulfillmentJob({
        paymentOrderId: order.id,
        merchantTransactionId: transaction.merchantTransactionId,
        userId: order.userId,
        listingId: order.listingId || undefined,
        purpose: order.purpose,
        productId: order.productId,
        amount: Number(order.amount),
      });

      await writeAuditLog({
        userId,
        action: 'PAYMENT_SUCCESS',
        entityType: 'PAYMENT_ORDER',
        entityId: order.id,
        status: 'SUCCESS',
      });

      return {
        paymentOrderId: order.id,
        transactionId: transaction.merchantTransactionId,
        status: PaymentStatus.SUCCESS,
        amount: Number(order.amount),
        currency: order.currency,
        isFulfilled: false, // Worker will fulfill asynchronously
        message: 'Payment verified and queued for fulfillment.',
      };
    }

    // If PayU marked transaction failed
    if (verifyResult.status === PaymentStatus.FAILED) {
      await PaymentRepository.updatePaymentStatus({
        transactionId: transaction.id,
        orderId: order.id,
        status: PaymentStatus.FAILED,
        providerResponse: verifyResult.rawResponse,
      });

      return {
        paymentOrderId: order.id,
        transactionId: transaction.merchantTransactionId,
        status: PaymentStatus.FAILED,
        amount: Number(order.amount),
        currency: order.currency,
        isFulfilled: false,
        message: verifyResult.errorMessage || 'Payment was declined or cancelled.',
      };
    }

    return {
      paymentOrderId: order.id,
      transactionId: transaction.merchantTransactionId,
      status: PaymentStatus.PENDING,
      amount: Number(order.amount),
      currency: order.currency,
      isFulfilled: false,
      message: 'Payment is currently pending verification with the payment provider.',
    };
  }

  // Handles PayU server-to-server webhook notifications with idempotency and hash verification
  static async handleWebhook(payload: PayUCallbackPayload): Promise<{ processed: boolean; message: string }> {
    // 1. Verify cryptographic hash
    const isValidSignature = this.provider.verifyWebhookSignature(payload);
    if (!isValidSignature) {
      await writeAuditLog({
        action: 'PAYMENT_WEBHOOK_REJECTED',
        entityType: 'PAYMENT_TRANSACTION',
        entityId: payload.txnid || 'UNKNOWN',
        status: 'FAILED',
        reason: 'Invalid PayU response hash signature',
        newData: PayUWebhookService.sanitizePayload(payload),
      });

      throw new AppError(400, 'INVALID_SIGNATURE', 'PayU webhook signature validation failed');
    }

    const merchantTransactionId = payload.txnid;
    if (!merchantTransactionId) {
      throw new AppError(400, 'MISSING_TXNID', 'Missing transaction identifier');
    }

    const transaction = await PaymentRepository.findTransactionByMerchantId(merchantTransactionId);
    if (!transaction) {
      throw new AppError(404, 'TRANSACTION_NOT_FOUND', `Transaction ${merchantTransactionId} not found`);
    }

    const order = transaction.order;

    // 2. Strict amount verification
    const expectedAmount = Number(order.amount);
    if (!PayUWebhookService.validateAmount(expectedAmount, payload.amount || '0')) {
      await writeAuditLog({
        userId: order.userId,
        action: 'PAYMENT_AMOUNT_MISMATCH',
        entityType: 'PAYMENT_TRANSACTION',
        entityId: transaction.id,
        status: 'FAILED',
        reason: `Webhook amount mismatch: Expected ${expectedAmount}, received ${payload.amount}`,
      });

      throw new AppError(400, 'AMOUNT_MISMATCH', 'Webhook reported unexpected transaction amount');
    }

    const isSuccess = (payload.status || '').toLowerCase() === 'success';

    // 3. Idempotency: If order is already in target status, return 200 without duplicate action
    if (isSuccess && order.status === PaymentStatus.SUCCESS) {
      return { processed: true, message: 'Webhook already processed (idempotent)' };
    }

    if (isSuccess) {
      assertValidTransition(transaction.status, PaymentStatus.SUCCESS);

      await PaymentRepository.updatePaymentStatus({
        transactionId: transaction.id,
        orderId: order.id,
        status: PaymentStatus.SUCCESS,
        providerTransactionId: payload.mihpayid ? String(payload.mihpayid) : undefined,
        paymentMethod: payload.mode,
        providerResponse: PayUWebhookService.sanitizePayload(payload),
        paidAt: new Date(),
      });

      // Dispatch fulfillment to worker
      await queuePaymentFulfillmentJob({
        paymentOrderId: order.id,
        merchantTransactionId: transaction.merchantTransactionId,
        userId: order.userId,
        listingId: order.listingId || undefined,
        purpose: order.purpose,
        productId: order.productId,
        amount: expectedAmount,
      });

      await writeAuditLog({
        userId: order.userId,
        action: 'PAYMENT_SUCCESS',
        entityType: 'PAYMENT_ORDER',
        entityId: order.id,
        status: 'SUCCESS',
        newData: {
          merchantTransactionId,
          providerTransactionId: payload.mihpayid,
        },
      });
    } else {
      await PaymentRepository.updatePaymentStatus({
        transactionId: transaction.id,
        orderId: order.id,
        status: PaymentStatus.FAILED,
        providerResponse: PayUWebhookService.sanitizePayload(payload),
      });

      await writeAuditLog({
        userId: order.userId,
        action: 'PAYMENT_FAILED',
        entityType: 'PAYMENT_ORDER',
        entityId: order.id,
        status: 'FAILED',
        reason: payload.error || payload.errorMessage || 'Provider reported payment failure',
      });
    }

    return { processed: true, message: 'Webhook processed successfully' };
  }

  // Handles PayU Hosted Checkout browser redirects (surl / furl)
  // Verifies payment status and constructs safe client redirection URL
  static async handleRedirect(payload: PayUCallbackPayload, expectedStatus: 'SUCCESS' | 'FAILED'): Promise<string> {
    const clientUrl = env.CLIENT_URL.replace(/\/+$/, '');
    const txnid = payload.txnid;

    if (!txnid) {
      return `${clientUrl}/payment/status?status=failed&message=Missing+transaction+reference`;
    }

    const transaction = await PaymentRepository.findTransactionByMerchantId(txnid);
    if (!transaction) {
      return `${clientUrl}/payment/status?status=failed&message=Transaction+not+found`;
    }

    const order = transaction.order;
    const metadata = (order.metadata as Record<string, any>) || {};
    const customReturnUrl = metadata.clientReturnUrl;

    // Check signature if hash is provided
    if (payload.hash && this.provider.verifyWebhookSignature(payload)) {
      if (expectedStatus === 'SUCCESS' && (payload.status || '').toLowerCase() === 'success') {
        const expectedAmount = Number(order.amount);
        if (PayUWebhookService.validateAmount(expectedAmount, payload.amount || '0')) {
          if (order.status !== PaymentStatus.SUCCESS) {
            await PaymentRepository.updatePaymentStatus({
              transactionId: transaction.id,
              orderId: order.id,
              status: PaymentStatus.SUCCESS,
              providerTransactionId: payload.mihpayid ? String(payload.mihpayid) : undefined,
              paymentMethod: payload.mode,
              providerResponse: PayUWebhookService.sanitizePayload(payload),
              paidAt: new Date(),
            });

            await queuePaymentFulfillmentJob({
              paymentOrderId: order.id,
              merchantTransactionId: transaction.merchantTransactionId,
              userId: order.userId,
              listingId: order.listingId || undefined,
              purpose: order.purpose,
              productId: order.productId,
              amount: expectedAmount,
            });
          }
        }
      } else if (order.status !== PaymentStatus.SUCCESS) {
        await PaymentRepository.updatePaymentStatus({
          transactionId: transaction.id,
          orderId: order.id,
          status: PaymentStatus.FAILED,
          providerResponse: PayUWebhookService.sanitizePayload(payload),
        });
      }
    }

    // Construct redirect destination for user browser UX
    const baseRedirect = customReturnUrl || `${clientUrl}/payment/status`;
    const separator = baseRedirect.includes('?') ? '&' : '?';
    const statusParam = order.status === PaymentStatus.SUCCESS ? 'success' : expectedStatus.toLowerCase();

    return `${baseRedirect}${separator}orderId=${order.id}&txnId=${transaction.merchantTransactionId}&status=${statusParam}`;
  }

  // Admin/System initiated refund routine
  static async processRefund(
    adminUserId: string,
    orderId: string,
    reason?: string
  ): Promise<RefundResult> {
    const order = await PaymentRepository.findOrderById(orderId);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Payment order not found');

    if (order.status !== PaymentStatus.SUCCESS) {
      throw new AppError(
        400,
        'REFUND_INELIGIBLE',
        `Cannot refund order in status "${order.status}". Only SUCCESS orders can be refunded.`
      );
    }

    const latestTxn = order.transactions[0];
    if (!latestTxn) {
      throw new AppError(400, 'TRANSACTION_MISSING', 'No transaction found for order');
    }

    assertValidTransition(latestTxn.status, PaymentStatus.REFUND_REQUESTED);

    const amount = Number(order.amount);

    // Call PayU refund API
    const refundResult = await this.provider.refundPayment({
      merchantTransactionId: latestTxn.merchantTransactionId,
      providerTransactionId: latestTxn.providerTransactionId || undefined,
      amount,
      reason,
    });

    if (!refundResult.isSuccess) {
      await writeAuditLog({
        userId: adminUserId,
        action: 'REFUND_FAILED',
        entityType: 'PAYMENT_ORDER',
        entityId: order.id,
        status: 'FAILED',
        reason: refundResult.errorMessage || 'Provider rejected refund',
      });

      throw new AppError(
        502,
        'PROVIDER_REFUND_FAILED',
        refundResult.errorMessage || 'PayU refund request failed'
      );
    }

    // Mark as refunded in database
    await PaymentRepository.markRefunded({
      transactionId: latestTxn.id,
      orderId: order.id,
      refundedAmount: amount,
      refundReason: reason,
      providerResponse: refundResult.rawResponse,
    });

    await writeAuditLog({
      userId: adminUserId,
      action: 'REFUND_SUCCESS',
      entityType: 'PAYMENT_ORDER',
      entityId: order.id,
      status: 'SUCCESS',
      newData: {
        orderId: order.id,
        merchantTransactionId: latestTxn.merchantTransactionId,
        refundedAmount: amount,
        reason,
      },
    });

    return {
      paymentOrderId: order.id,
      transactionId: latestTxn.merchantTransactionId,
      refundedAmount: amount,
      currency: order.currency,
      status: PaymentStatus.REFUNDED,
      message: `Refund of ₹${amount.toFixed(2)} processed successfully.`,
    };
  }

  // Financial aggregates for Admin Dashboard
  static async getFinancialOverview() {
    const [
      totalOrders,
      successOrders,
      refundedOrders,
      pendingOrders,
      grossAgg,
      refundAgg,
      activeBoosts,
    ] = await Promise.all([
      prisma.paymentOrder.count(),
      prisma.paymentOrder.count({ where: { status: PaymentStatus.SUCCESS } }),
      prisma.paymentOrder.count({ where: { status: PaymentStatus.REFUNDED } }),
      prisma.paymentOrder.count({
        where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.INITIATED, PaymentStatus.CREATED] } },
      }),
      prisma.paymentOrder.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
      prisma.paymentOrder.aggregate({
        where: { status: PaymentStatus.REFUNDED },
        _sum: { amount: true },
      }),
      prisma.featuredAd.count({
        where: {
          status: 'ACTIVE',
          endsAt: { gt: new Date() },
        },
      }),
    ]);

    const grossRevenueInr = Number(grossAgg._sum.amount || 0);
    const refundedAmountInr = Number(refundAgg._sum.amount || 0);

    return {
      totalOrders,
      successfulOrders: successOrders,
      refundedOrders,
      pendingOrders,
      grossRevenueInr,
      refundedAmountInr,
      activeBoosts,
      currency: 'INR',
      timestamp: new Date().toISOString(),
    };
  }

  // Paginated payment orders for Admin Finance reconciliation ledger
  static async getAdminOrders(params: {
    page?: number;
    limit?: number;
    status?: PaymentStatus | 'ALL';
    search?: string;
  }) {
    const result = await PaymentRepository.findAdminOrders(params);

    const formattedItems = result.items.map((order) => {
      const latestTxn = order.transactions[0];
      const product = PRODUCT_CATALOG[order.productId];

      return {
        id: order.id,
        merchantTransactionId: latestTxn?.merchantTransactionId || order.id,
        providerTransactionId: latestTxn?.providerTransactionId || null,
        provider: latestTxn?.provider || 'PAYU',
        paymentMethod: latestTxn?.paymentMethod || 'UPI',
        purpose: order.purpose,
        productId: order.productId,
        productName: product?.name || order.productId.replace(/_/g, ' '),
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        paidAt: latestTxn?.paidAt || null,
        customerName: order.user.profile?.name || order.user.email?.split('@')[0] || 'Customer',
        customerEmail: order.user.email || 'N/A',
        customerPhone: order.user.phoneNumber || null,
        listingTitle: order.listing?.title || null,
        listingId: order.listing?.id || null,
        invoiceId: `INV-${order.createdAt.getFullYear()}-${order.id.slice(-6).toUpperCase()}`,
      };
    });

    return {
      items: formattedItems,
      pagination: result.pagination,
    };
  }
}
