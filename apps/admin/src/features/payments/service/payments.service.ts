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
  | 'EXTRA_LISTINGS'
  | 'FEATURED_AD'
  | 'BOOST'
  | 'SELLER_SUBSCRIPTION'
  | 'OTHER';

export interface RevenueOverviewData {
  period: string;
  days: number;
  currency: string;
  totalEarned: number;
  todayRevenue: number;
  thisWeekRevenue: number;
  thisMonthRevenue: number;
  averageDailyRevenue: number;
  grossCollection: number;
  netRevenue: number;
  platformEarnings: number;
  paymentFees: number;
  otherAdjustments: number;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  refundedPayments: number;
  pendingPayments: number;
  refundAmount: number;
  successRate: number;
  refundRate: number;
  trends: {
    gross: { change: number; trend: 'UP' | 'DOWN' | 'NEUTRAL' };
    net: { change: number; trend: 'UP' | 'DOWN' | 'NEUTRAL' };
    transactions: { change: number; trend: 'UP' | 'DOWN' | 'NEUTRAL' };
    successRate: { change: number; trend: 'UP' | 'DOWN' | 'NEUTRAL' };
  };
}

export interface RevenueTrendPoint {
  date: string;
  timestamp: string;
  grossCollection: number;
  netRevenue: number;
  refunds: number;
  paymentFees: number;
  platformEarnings: number;
  transactionCount: number;
}

export interface RevenueBreakdownItem {
  purpose: string;
  label: string;
  color: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface RefundAnalyticsData {
  totalRefunds: number;
  refundAmount: number;
  avgRefundAmount: number;
  refundRate: number;
  refundsToday: number;
  refundsThisWeek: number;
  refundsThisMonth: number;
  topReasons: Array<{ reason: string; count: number; percentage: number }>;
}

export interface PaymentPerformanceData {
  successRate: number;
  failureRate: number;
  pendingRate: number;
  refundRate: number;
  benchmarks: { today: number; thisWeek: number; thisMonth: number };
  failedReasons: Array<{ reason: string; percentage: number; count: number }>;
}

export interface RealtimeMetricsData {
  timestamp: string;
  velocity: {
    totalUsers: number;
    usersToday: number;
    usersThisWeek: number;
    userGrowthPct: number;
    totalAds: number;
    adsToday: number;
    adsThisWeek: number;
    adGrowthPct: number;
    activeAds: number;
    pendingAds: number;
  };
  todayRevenue: number;
  platformGrowthTrajectory: Array<{ date: string; users: number; listings: number }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    status: string;
    purpose: string;
    customerName: string;
    listingTitle: string;
    createdAt: string;
  }>;
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
  purpose?: string;
  paymentMethod?: string;
  search?: string;
  from?: string;
  to?: string;
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
  async getRevenueOverview(period = '30d', from?: string, to?: string): Promise<RevenueOverviewData> {
    const res = await apiClient.get<{ success: boolean; data: RevenueOverviewData }>(
      '/payments/admin/analytics/overview',
      { params: { period, from, to } }
    );
    return res.data.data;
  },

  async getRevenueTrend(range = '30d', metric = 'grossCollection', from?: string, to?: string): Promise<RevenueTrendPoint[]> {
    const res = await apiClient.get<{ success: boolean; data: RevenueTrendPoint[] }>(
      '/payments/admin/analytics/trend',
      { params: { range, metric, from, to } }
    );
    return res.data.data;
  },

  async getRevenueBreakdown(period = '30d', from?: string, to?: string): Promise<{ totalRevenue: number; breakdown: RevenueBreakdownItem[] }> {
    const res = await apiClient.get<{ success: boolean; data: { totalRevenue: number; breakdown: RevenueBreakdownItem[] } }>(
      '/payments/admin/analytics/breakdown',
      { params: { period, from, to } }
    );
    return res.data.data;
  },

  async getRefundAnalytics(period = '30d', from?: string, to?: string): Promise<RefundAnalyticsData> {
    const res = await apiClient.get<{ success: boolean; data: RefundAnalyticsData }>(
      '/payments/admin/analytics/refunds',
      { params: { period, from, to } }
    );
    return res.data.data;
  },

  async getPaymentPerformance(period = '30d', from?: string, to?: string): Promise<PaymentPerformanceData> {
    const res = await apiClient.get<{ success: boolean; data: PaymentPerformanceData }>(
      '/payments/admin/analytics/performance',
      { params: { period, from, to } }
    );
    return res.data.data;
  },

  async getRealtimeMetrics(): Promise<RealtimeMetricsData> {
    const res = await apiClient.get<{ success: boolean; data: RealtimeMetricsData }>(
      '/payments/admin/analytics/realtime'
    );
    return res.data.data;
  },

  async getAdminOrders(params?: GetAdminOrdersParams): Promise<GetAdminOrdersResponse> {
    const res = await apiClient.get<{ success: boolean; data: GetAdminOrdersResponse }>(
      '/payments/admin/orders',
      { params }
    );
    return res.data.data;
  },

  async refundPayment(id: string, reason?: string): Promise<RefundPaymentResult> {
    const res = await apiClient.post<{ success: boolean; data: RefundPaymentResult }>(
      `/payments/${id}/refund`,
      { reason }
    );
    return res.data.data;
  },

  exportCsvUrl(params?: GetAdminOrdersParams): string {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.purpose) searchParams.set('purpose', params.purpose);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    return `/api/v1/payments/admin/export?${searchParams.toString()}`;
  },
};
