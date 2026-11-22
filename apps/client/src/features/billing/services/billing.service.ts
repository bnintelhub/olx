import { apiClient } from '@/lib/api-client';

export interface BillingTransaction {
  id: string;
  invoiceNumber: string;
  purpose: string;
  productId: string;
  productName: string;
  amount: number;
  currency: string;
  status: 'CREATED' | 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'REFUND_REQUESTED' | 'REFUNDED';
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  merchantTransactionId: string | null;
  providerTransactionId: string | null;
  provider: string;
  paymentMethod: string | null;
  refundedAmount: number | null;
  refundReason: string | null;
  listing: {
    id: string;
    title: string;
    price: number;
    coverImage: string | null;
  } | null;
}

export interface BillingHistoryResponse {
  items: BillingTransaction[];
  metrics: {
    totalSpent: number;
    successfulOrdersCount: number;
    statusCounts: Record<string, number>;
  };
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BillingHistoryParams {
  page?: number;
  limit?: number;
  status?: string;
  purpose?: string;
}

export const billingService = {
  // Fetches paginated billing transactions and account-level financial summary
  async getHistory(params?: BillingHistoryParams): Promise<BillingHistoryResponse> {
    const { data } = await apiClient.get('/payments/history', {
      params,
    });
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to fetch billing history');
    }
    return data.data;
  },
};
