import { env } from '../../../../config/env';
import { PayUHashService } from './payu.hash';
import { PayUMapper } from './payu.mapper';
import { ProviderVerificationResult, ProviderRefundResult } from '../payment-provider.interface';
import { PaymentStatus } from '../../payment.types';

export class PayUClient {
  private readonly merchantKey: string;
  private readonly merchantSalt: string;
  private readonly baseUrl: string;

  constructor(key?: string, salt?: string, baseUrl?: string) {
    this.merchantKey = key || env.PAYU_MERCHANT_KEY;
    this.merchantSalt = salt || env.PAYU_MERCHANT_SALT;
    this.baseUrl = (baseUrl || env.PAYU_BASE_URL).replace(/\/+$/, '');
  }

  // Calls PayU server-to-server verify_payment API to confirm transaction state authoritatively
  async verifyPayment(merchantTransactionId: string): Promise<ProviderVerificationResult> {
    const command = 'verify_payment';
    const hash = PayUHashService.generateApiHash(
      this.merchantKey,
      command,
      merchantTransactionId,
      this.merchantSalt
    );

    const postserviceUrl = `${this.baseUrl}/merchant/postservice?form=2`;
    const bodyParams = new URLSearchParams({
      key: this.merchantKey,
      command,
      var1: merchantTransactionId,
      hash,
    });

    try {
      const response = await fetch(postserviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(10000), // 10s strict timeout
      });

      if (!response.ok) {
        throw new Error(`PayU API returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as Record<string, any>;
      const details = data?.transaction_details?.[merchantTransactionId];

      if (!details) {
        return {
          isVerified: false,
          status: PaymentStatus.PENDING,
          amount: 0,
          currency: 'INR',
          rawResponse: PayUMapper.sanitizeResponse(data),
          errorMessage: 'Transaction not found in PayU ledger',
        };
      }

      const status = PayUMapper.toPaymentStatus(details.status, details.unmappedstatus);
      const amount = parseFloat(details.amt || details.transaction_amount || '0');

      return {
        isVerified: status === PaymentStatus.SUCCESS,
        status,
        providerTransactionId: details.mihpayid ? String(details.mihpayid) : undefined,
        providerReference: details.bank_ref_num ? String(details.bank_ref_num) : undefined,
        amount,
        currency: 'INR',
        paymentMethod: PayUMapper.toPaymentMethod(details.mode),
        rawResponse: PayUMapper.sanitizeResponse(details),
        errorMessage: details.error_Message || details.field9,
      };
    } catch (err: any) {
      // Return safe degraded verification structure so caller can handle retry
      return {
        isVerified: false,
        status: PaymentStatus.PENDING,
        amount: 0,
        currency: 'INR',
        rawResponse: {},
        errorMessage: err.message || 'Network error verifying transaction with PayU',
      };
    }
  }

  // Initiates refund via PayU cancel_refund_transaction API
  async refundPayment(params: {
    merchantTransactionId: string;
    providerTransactionId?: string;
    amount: number;
    reason?: string;
  }): Promise<ProviderRefundResult> {
    const { merchantTransactionId, providerTransactionId, amount } = params;
    const command = 'cancel_refund_transaction';
    const referenceId = providerTransactionId || merchantTransactionId;
    const formattedAmount = amount.toFixed(2);
    const refundRequestId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const hash = PayUHashService.generateApiHash(
      this.merchantKey,
      command,
      referenceId,
      this.merchantSalt
    );

    const postserviceUrl = `${this.baseUrl}/merchant/postservice?form=2`;
    const bodyParams = new URLSearchParams({
      key: this.merchantKey,
      command,
      var1: referenceId,
      var2: refundRequestId,
      var3: formattedAmount,
      hash,
    });

    try {
      const response = await fetch(postserviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(10000),
      });

      const data = (await response.json()) as Record<string, any>;
      const isSuccess = data?.status === 1 || data?.status === 'success' || data?.msg?.includes('successful');

      return {
        isSuccess: Boolean(isSuccess),
        refundTransactionId: data?.request_id || refundRequestId,
        status: isSuccess ? PaymentStatus.REFUNDED : PaymentStatus.REFUND_REQUESTED,
        rawResponse: PayUMapper.sanitizeResponse(data),
        errorMessage: isSuccess ? undefined : data?.msg || 'PayU refund request failed',
      };
    } catch (err: any) {
      return {
        isSuccess: false,
        refundTransactionId: refundRequestId,
        status: PaymentStatus.REFUND_REQUESTED,
        rawResponse: {},
        errorMessage: err.message || 'Network error dispatching refund to PayU',
      };
    }
  }
}

