import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  paymentsService,
  GetAdminOrdersParams,
  GetAdminOrdersResponse,
  RevenueOverviewData,
  RevenueTrendPoint,
  RevenueBreakdownItem,
  RefundAnalyticsData,
  PaymentPerformanceData,
  RealtimeMetricsData,
} from '../service/payments.service';

export const PAYMENT_QUERY_KEYS = {
  all: ['admin-payments'] as const,
  overview: (period: string, from?: string, to?: string) => ['admin-payments', 'overview', period, from, to] as const,
  trend: (range: string, metric: string, from?: string, to?: string) => ['admin-payments', 'trend', range, metric, from, to] as const,
  breakdown: (period: string, from?: string, to?: string) => ['admin-payments', 'breakdown', period, from, to] as const,
  refunds: (period: string, from?: string, to?: string) => ['admin-payments', 'refunds', period, from, to] as const,
  performance: (period: string, from?: string, to?: string) => ['admin-payments', 'performance', period, from, to] as const,
  realtime: ['admin-payments', 'realtime'] as const,
  orders: (params: GetAdminOrdersParams) => [
    'admin-payments',
    'orders',
    params.page ?? 1,
    params.limit ?? 15,
    params.status ?? 'ALL',
    params.purpose ?? 'ALL',
    params.search ?? '',
    params.from ?? '',
    params.to ?? '',
  ] as const,
};

export function useRevenueOverviewQuery(period = '30d', from?: string, to?: string) {
  return useQuery<RevenueOverviewData>({
    queryKey: PAYMENT_QUERY_KEYS.overview(period, from, to),
    queryFn: () => paymentsService.getRevenueOverview(period, from, to),
    staleTime: 30000,
  });
}

export function useRevenueTrendQuery(range = '30d', metric = 'grossCollection', from?: string, to?: string) {
  return useQuery<RevenueTrendPoint[]>({
    queryKey: PAYMENT_QUERY_KEYS.trend(range, metric, from, to),
    queryFn: () => paymentsService.getRevenueTrend(range, metric, from, to),
    staleTime: 30000,
  });
}

export function useRevenueBreakdownQuery(period = '30d', from?: string, to?: string) {
  return useQuery<{ totalRevenue: number; breakdown: RevenueBreakdownItem[] }>({
    queryKey: PAYMENT_QUERY_KEYS.breakdown(period, from, to),
    queryFn: () => paymentsService.getRevenueBreakdown(period, from, to),
    staleTime: 30000,
  });
}

export function useRefundAnalyticsQuery(period = '30d', from?: string, to?: string) {
  return useQuery<RefundAnalyticsData>({
    queryKey: PAYMENT_QUERY_KEYS.refunds(period, from, to),
    queryFn: () => paymentsService.getRefundAnalytics(period, from, to),
    staleTime: 30000,
  });
}

export function usePaymentPerformanceQuery(period = '30d', from?: string, to?: string) {
  return useQuery<PaymentPerformanceData>({
    queryKey: PAYMENT_QUERY_KEYS.performance(period, from, to),
    queryFn: () => paymentsService.getPaymentPerformance(period, from, to),
    staleTime: 30000,
  });
}

export function useRealtimeMetricsQuery() {
  return useQuery<RealtimeMetricsData>({
    queryKey: PAYMENT_QUERY_KEYS.realtime,
    queryFn: () => paymentsService.getRealtimeMetrics(),
    refetchInterval: 15000,
  });
}

export function usePaymentOrdersQuery(params: GetAdminOrdersParams) {
  return useQuery<GetAdminOrdersResponse>({
    queryKey: PAYMENT_QUERY_KEYS.orders(params),
    queryFn: () => paymentsService.getAdminOrders(params),
    staleTime: 10000,
  });
}

export function useRefundPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      paymentsService.refundPayment(id, reason),
    onSuccess: (data) => {
      toast.success(data.message || 'Refund successfully processed.');
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to process refund';
      toast.error(msg);
    },
  });
}
