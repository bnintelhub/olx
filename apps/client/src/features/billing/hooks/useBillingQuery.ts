import { useQuery } from '@tanstack/react-query';
import { billingService, BillingHistoryParams } from '../services/billing.service';

export function useBillingHistory(params: BillingHistoryParams, enabled = true) {
  return useQuery({
    queryKey: ['user-billing-history', params],
    queryFn: () => billingService.getHistory(params),
    enabled,
    staleTime: 30_000,
  });
}
