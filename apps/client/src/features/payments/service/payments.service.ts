import { apiClient } from '@/lib/api-client';

export interface CreateOrderParams {
  productId: string;
  purpose: 'OTHER' | 'SELLER_SUBSCRIPTION' | 'LISTING_BOOST' | 'FEATURED_LISTING' | 'TOP_LISTING';
  listingId?: string;
  returnUrl?: string;
}

export interface PaymentOrderResponse {
  paymentOrderId: string;
  transactionId: string;
  purpose: string;
  productId: string;
  amount: number;
  currency: string;
  status: string;
  checkoutUrl: string;
  checkoutParams: Record<string, string>;
  expiresAt: string;
}

export interface VerifyPaymentResponse {
  paymentOrderId: string;
  transactionId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amount: number;
  currency: string;
  isFulfilled: boolean;
  message: string;
}

export const paymentsService = {
  // Initiates PayU payment order on backend
  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResponse> {
    const { data } = await apiClient.post('/payments/orders', params);
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to create payment order');
    }
    return data.data;
  },

  // Verifies payment status and completes fulfillment
  async verifyPayment(orderIdOrTxnId: string): Promise<VerifyPaymentResponse> {
    const { data } = await apiClient.post(`/payments/${orderIdOrTxnId}/verify`);
    if (!data.success) {
      throw new Error(data.error?.message || 'Payment verification failed');
    }
    return data.data;
  },

  // Submits PayU Hosted Checkout form directly to PayU gateway
  submitPayUForm(checkoutUrl: string, checkoutParams: Record<string, string>) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = checkoutUrl;
    form.style.display = 'none';

    Object.entries(checkoutParams).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  },
};

