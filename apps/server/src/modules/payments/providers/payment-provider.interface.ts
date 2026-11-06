import { PaymentStatus } from '../payment.types';

export interface ProviderCreatePaymentInput {
  merchantTransactionId: string;
  amount: number; // in INR
  currency: string;
  productInfo: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  successUrl: string;
  failureUrl: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

export interface ProviderCreatePaymentResult {
  checkoutUrl: string;
  checkoutParams: Record<string, string>;
  paymentHash: string;
}

export interface ProviderVerificationResult {
  isVerified: boolean;
  status: PaymentStatus;
  providerTransactionId?: string;
  providerReference?: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  rawResponse: Record<string, any>;
  errorMessage?: string;
}

export interface ProviderRefundInput {
  merchantTransactionId: string;
  providerTransactionId?: string;
  amount: number;
  reason?: string;
}

export interface ProviderRefundResult {
  isSuccess: boolean;
  refundTransactionId: string;
  status: PaymentStatus;
  rawResponse: Record<string, any>;
  errorMessage?: string;
}

export interface PaymentProvider {
  createPayment(input: ProviderCreatePaymentInput): Promise<ProviderCreatePaymentResult>;
  verifyPayment(merchantTransactionId: string): Promise<ProviderVerificationResult>;
  refundPayment(input: ProviderRefundInput): Promise<ProviderRefundResult>;
  verifyWebhookSignature(payload: Record<string, any>): boolean;
}

