import { apiClient } from '../../../lib/api-client';

export type PaymentStatus =
  | 'CREATED'
  | 'INITIATED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUND_REQUESTED'
  | 'REFUNDED';

export type PaymentPurpose =
  | 'LISTING_BOOST'
  | 'FEATURED_LISTING'
  | 'TOP_LISTING'
  | 'SELLER_SUBSCRIPTION'
  | 'OTHER';

export interface FinancialOverviewResponse {
  totalOrders: number;
  successfulOrders: number;
  refundedOrders: number;
  pendingOrders: number;
  grossRevenueInr: number;
  refundedAmountInr: number;
  activeBoosts: number;
  currency: string;
  timestamp: string;
}

export interface PaymentOrderItem {
  id: string;
  merchantTransactionId: string;
  providerTransactionId: string | null;
  provider: string;
  paymentMethod: string;
  purpose: PaymentPurpose;
  productId: string;
  productName: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  listingTitle: string | null;
  listingId: string | null;
  invoiceId: string;
}

export interface GetAdminOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface GetAdminOrdersResponse {
  items: PaymentOrderItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RefundPaymentResult {
  paymentOrderId: string;
  transactionId: string;
  refundedAmount: number;
  currency: string;
  status: PaymentStatus;
  message: string;
}

export const paymentsService = {
  // Fetches aggregated financial summary metrics for admin cards
  async getFinancialOverview(): Promise<FinancialOverviewResponse> {
    const response = await apiClient.get<{ success: boolean; data: FinancialOverviewResponse }>(
      '/payments/admin/overview'
    );
    return response.data.data;
  },

  // Fetches paginated real transaction ledger with optional search & status filter
  async getAdminOrders(params?: GetAdminOrdersParams): Promise<GetAdminOrdersResponse> {
    const response = await apiClient.get<{ success: boolean; data: GetAdminOrdersResponse }>(
      '/payments/admin/orders',
      { params }
    );
    return response.data.data;
  },

  // Submits a full refund request to PayU S2S cancellation API
  async refundPayment(id: string, reason?: string): Promise<RefundPaymentResult> {
    const response = await apiClient.post<{ success: boolean; data: RefundPaymentResult }>(
      `/payments/${id}/refund`,
      { reason }
    );
    return response.data.data;
  },
};

