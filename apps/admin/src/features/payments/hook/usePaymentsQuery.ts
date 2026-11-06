import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  paymentsService,
  GetAdminOrdersParams,
  GetAdminOrdersResponse,
  FinancialOverviewResponse,
} from '../service/payments.service';

export const PAYMENT_QUERY_KEYS = {
  all: ['admin-payments'] as const,
  overview: ['admin-payments', 'overview'] as const,
  orders: (params: GetAdminOrdersParams) => [
    'admin-payments',
    'orders',
    params.page ?? 1,
    params.limit ?? 20,
    params.status ?? 'ALL',
    params.search ?? '',
  ] as const,
};

// Hook for financial overview cards
export function usePaymentOverviewQuery() {
  return useQuery<FinancialOverviewResponse>({
    queryKey: PAYMENT_QUERY_KEYS.overview,
    queryFn: () => paymentsService.getFinancialOverview(),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

// Hook for paginated ledger table with server-side search and status filters
export function usePaymentOrdersQuery(params: GetAdminOrdersParams) {
  return useQuery<GetAdminOrdersResponse>({
    queryKey: PAYMENT_QUERY_KEYS.orders(params),
    queryFn: () => paymentsService.getAdminOrders(params),
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });
}

// Hook for executing a PayU refund
export function useRefundPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      paymentsService.refundPayment(id, reason),
    onSuccess: (data) => {
      toast.success(data.message || 'Refund successfully processed with PayU.');
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to process refund';
      toast.error(msg);
    },
  });
}

