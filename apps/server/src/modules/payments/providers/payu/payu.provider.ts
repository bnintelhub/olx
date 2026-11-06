import { env } from '../../../../config/env';
import {
  PaymentProvider,
  ProviderCreatePaymentInput,
  ProviderCreatePaymentResult,
  ProviderVerificationResult,
  ProviderRefundInput,
  ProviderRefundResult,
} from '../payment-provider.interface';
import { PayUHashService } from './payu.hash';
import { PayUClient } from './payu.client';
import { PayUWebhookService } from './payu.webhook';

export class PayUProvider implements PaymentProvider {
  private readonly client: PayUClient;
  private readonly merchantKey: string;
  private readonly merchantSalt: string;
  private readonly baseUrl: string;

  constructor() {
    this.merchantKey = env.PAYU_MERCHANT_KEY;
    this.merchantSalt = env.PAYU_MERCHANT_SALT;
    this.baseUrl = env.PAYU_BASE_URL.replace(/\/+$/, '');
    this.client = new PayUClient(this.merchantKey, this.merchantSalt, this.baseUrl);
  }

  // Prepares PayU Hosted Checkout parameters and cryptographic signature
  async createPayment(input: ProviderCreatePaymentInput): Promise<ProviderCreatePaymentResult> {
    const formattedAmount = input.amount.toFixed(2);
    const checkoutUrl = `${this.baseUrl}/_payment`;

    const paymentHash = PayUHashService.generatePaymentHash({
      key: this.merchantKey,
      txnid: input.merchantTransactionId,
      amount: formattedAmount,
      productinfo: input.productInfo,
      firstname: input.customerName || 'Customer',
      email: input.customerEmail || 'customer@marketplace.local',
      udf1: input.udf1 || '',
      udf2: input.udf2 || '',
      udf3: input.udf3 || '',
      udf4: input.udf4 || '',
      udf5: input.udf5 || '',
      salt: this.merchantSalt,
    });

    const checkoutParams: Record<string, string> = {
      key: this.merchantKey,
      txnid: input.merchantTransactionId,
      amount: formattedAmount,
      productinfo: input.productInfo,
      firstname: input.customerName || 'Customer',
      email: input.customerEmail || 'customer@marketplace.local',
      phone: input.customerPhone || '9999999999',
      surl: input.successUrl,
      furl: input.failureUrl,
      hash: paymentHash,
      udf1: input.udf1 || '',
      udf2: input.udf2 || '',
      udf3: input.udf3 || '',
      udf4: input.udf4 || '',
      udf5: input.udf5 || '',
    };

    return {
      checkoutUrl,
      checkoutParams,
      paymentHash,
    };
  }

  // Verifies transaction directly with PayU servers
  async verifyPayment(merchantTransactionId: string): Promise<ProviderVerificationResult> {
    return this.client.verifyPayment(merchantTransactionId);
  }

  // Initiates refund with PayU
  async refundPayment(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    return this.client.refundPayment({
      merchantTransactionId: input.merchantTransactionId,
      providerTransactionId: input.providerTransactionId,
      amount: input.amount,
      reason: input.reason,
    });
  }

  // Validates incoming webhook signature
  verifyWebhookSignature(payload: Record<string, any>): boolean {
    return PayUWebhookService.validateSignature(payload);
  }
}

