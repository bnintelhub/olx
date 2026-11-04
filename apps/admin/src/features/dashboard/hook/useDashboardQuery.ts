import { useQuery } from '@tanstack/react-query';
import {
  dashboardService,
  AdminStatsResponse,
  PendingAdItem,
  ModerationReportItem,
  GetUsersParams,
  GetUsersResponse,
} from '../service/dashboard.service';

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

// 1. Single smart KPI endpoint query hook for stats by role
export function useDashboardStats(role?: string) {
  return useQuery<AdminStatsResponse>({
    queryKey: DASHBOARD_QUERY_KEYS.stats(role),
    queryFn: () => dashboardService.getStats(role),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
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

