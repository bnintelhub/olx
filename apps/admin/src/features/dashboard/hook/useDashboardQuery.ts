import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dashboardService,
  AdminStatsResponse,
  PendingAdItem,
  ModerationReportItem,
  GetUsersParams,
  GetUsersResponse,
} from '../service/dashboard.service';
import { connectAdminEvents } from '../../../lib/sse';

// Query keys for dashboard caching
export const DASHBOARD_QUERY_KEYS = {
  stats: (role?: string) => ['admin-stats', role || 'ALL'] as const,
  pendingAds: ['moderation-pending'] as const,
  users: (params: GetUsersParams) => [
    'admin-users',
    params.page ?? 1,
    params.limit ?? 10,
    params.q ?? '',
    params.status ?? '',
    params.role ?? '',
  ] as const,
  reports: (status?: string) => ['moderation-reports', status || 'ALL'] as const,
  financialOverview: ['financial-overview'] as const,
  categories: ['categories-list'] as const,
};

// 1. Single smart KPI endpoint query hook with a reconnecting Server-Sent Events stream.
export function useDashboardStats(role = 'SUPER_ADMIN', enableRealtime = true) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastSocketUpdate, setLastSocketUpdate] = useState<Date | null>(null);

  const query = useQuery<AdminStatsResponse>({
    queryKey: DASHBOARD_QUERY_KEYS.stats(role),
    queryFn: () => dashboardService.getStats(role),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!enableRealtime) return;

    const disconnect = connectAdminEvents(
      role,
      (event) => {
        if (event.type === 'dashboard_stats') {
          const newStats = event.data as AdminStatsResponse;
        queryClient.setQueryData(DASHBOARD_QUERY_KEYS.stats(role), (oldData: AdminStatsResponse | undefined) => {
          return {
            ...oldData,
            ...newStats,
          };
        });
        setLastSocketUpdate(new Date());
        }
      },
      setIsConnected,
    );

    return disconnect;
  }, [role, enableRealtime, queryClient]);

  const refreshViaSocket = () => {
    void query.refetch();
  };

  return {
    ...query,
    isConnected,
    lastSocketUpdate,
    refreshViaSocket,
  };
}

// 2. Pending ads moderation queue hook
export function usePendingAds() {
  return useQuery<PendingAdItem[]>({
    queryKey: DASHBOARD_QUERY_KEYS.pendingAds,
    queryFn: () => dashboardService.getPendingAds(),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

// 3. User management table list hook with pagination and search
export function useAdminUsers(params: GetUsersParams) {
  return useQuery<GetUsersResponse>({
    queryKey: DASHBOARD_QUERY_KEYS.users(params),
    queryFn: () => dashboardService.getUsers(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

// 4. Moderation / safety reports queue hook
export function useModerationReports(status?: string) {
  return useQuery<ModerationReportItem[]>({
    queryKey: DASHBOARD_QUERY_KEYS.reports(status),
    queryFn: () => dashboardService.getModerationReports(status),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

// 5. Financial metrics overview hook
export function useFinancialOverview() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.financialOverview,
    queryFn: () => dashboardService.getFinancialOverview(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

// 6. Category taxonomy list hook
export function useCategoriesList() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.categories,
    queryFn: () => dashboardService.getCategoriesList(),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });
}

