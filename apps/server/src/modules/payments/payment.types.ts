import { PaymentPurpose, PaymentStatus, PaymentOrder, PaymentTransaction } from '@prisma/client';

export { PaymentPurpose, PaymentStatus };
export type { PaymentOrder, PaymentTransaction };

// Immutable server-side catalogue product configuration
export interface CatalogProduct {
  productId: string;
  name: string;
  purpose: PaymentPurpose;
  durationDays: number;
  amount: number; // In INR (e.g. 99 for ₹99.00)
  currency: 'INR';
  description: string;
  boostType?: 'FEATURED' | 'URGENT' | 'HOME_SPOTLIGHT';
  adsCount?: number;
  subscriptionTier?: string;
}

// Order creation input from client — amount is intentionally omitted to prevent tampering
export interface CreatePaymentOrderInput {
  purpose: PaymentPurpose;
  listingId?: string;
  productId: string;
  returnUrl?: string; // Optional client deep-link or custom redirect
}

export interface PaymentOrderResult {
  paymentOrderId: string;
  transactionId: string;
  purpose: PaymentPurpose;
  productId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl: string;
  checkoutParams: Record<string, string>;
  expiresAt: Date;
}

export interface VerifyPaymentResult {
  paymentOrderId: string;
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  isFulfilled: boolean;
  message: string;
}

export interface RefundResult {
  paymentOrderId: string;
  transactionId: string;
  refundedAmount: number;
  currency: string;
  status: PaymentStatus;
  message: string;
}

export interface PayUCallbackPayload {
  key?: string;
  txnid?: string;
  amount?: string;
  productinfo?: string;
  firstname?: string;
  email?: string;
  phone?: string;
  status?: string;
  hash?: string;
  unmappedstatus?: string;
  mode?: string;
  bank_ref_num?: string;
  bankcode?: string;
  error?: string;
  errorMessage?: string;
  mihpayid?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  additionalCharges?: string;
  [key: string]: any;
}
