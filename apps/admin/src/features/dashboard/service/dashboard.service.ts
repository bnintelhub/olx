import { apiClient } from '../../../lib/api-client';

export interface AdminStatsResponse {
  role?: string;
  totalUsers?: number;
  totalAds?: number;
  pendingAds?: number;
  activeAds?: number;
  soldAds?: number;
  rejectedAds?: number;
  expiredAds?: number;
  openReports?: number;
  totalBoosts?: number;
  activeBoosts?: number;
  suspendedUsers?: number;
  verifiedUsers?: number;
  grossRevenueInr?: number;
  conversionRate?: number;
  pendingReviews?: number;
  highRiskItems?: number;
  reviewedToday?: number;
  openTickets?: number;
  urgentTickets?: number;
  resolvedToday?: number;
  activeBanners?: number;
  totalCategories?: number;
  activePromotions?: number;
  totalTransactions?: number;
  currency?: string;
  operationalStatus?: string;
  statusDistribution?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface PendingAdItem {
  id: string;
  title: string;
  description: string;
  price: string | number;
  status: string;
  createdAt: string;
  category?: { id: string; name: string; slug: string };
  location?: { id: string; name: string; slug: string };
  images?: Array<{ id: string; originalUrl: string }>;
  reports?: Array<{ id: string; reason: string; details?: string }>;
  user?: {
    id: string;
    phoneNumber?: string;
    role: string;
    profile?: { name?: string; ratingAverage?: number };
  };
}

export interface AdminUserItem {
  id: string;
  phoneNumber?: string;
  email?: string;
  role: string;
  status: string;
  createdAt: string;
  profile?: {
    name?: string;
    accountType?: string;
  };
  _count?: {
    ads: number;
    reports: number;
  };
}

export interface ModerationReportItem {
  id: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  ad?: {
    id: string;
    title: string;
    status: string;
    price: string | number;
  };
  reporter?: {
    id: string;
    phoneNumber?: string;
    profile?: { name?: string };
  };
  reported?: {
    id: string;
    phoneNumber?: string;
    status: string;
    profile?: { name?: string };
  };
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  role?: string;
}

export interface GetUsersResponse {
  users: AdminUserItem[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
}

export interface ReviewAdPayload {
  id: string;
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export interface UserActionPayload {
  id: string;
  action: 'ACTIVATE' | 'SUSPEND' | 'BAN' | 'CHANGE_ROLE';
  role?: string;
  reason?: string;
}

export interface ResolveReportPayload {
  id: string;
  status: 'RESOLVED' | 'DISMISSED';
  resolutionReason: string;
}

export const dashboardService = {
  // 1. Single smart KPI endpoint for stats by role
  async getStats(role?: string): Promise<AdminStatsResponse> {
    const res = await apiClient.get('/admin/stats', {
      params: role ? { role } : undefined,
    });
    return (res.data?.data || {}) as AdminStatsResponse;
  },

  // 2. Pending ads moderation queue
  async getPendingAds(): Promise<PendingAdItem[]> {
    const res = await apiClient.get('/moderation/pending');
    return (res.data?.data?.ads || []) as PendingAdItem[];
  },

  // Approve or reject pending ad
  async reviewAd({ id, action, rejectionReason }: ReviewAdPayload) {
    const res = await apiClient.patch(`/moderation/ads/${id}/review`, {
      action,
      rejectionReason,
    });
    return res.data;
  },

  // 3. User management table list with pagination and search
  async getUsers(params: GetUsersParams): Promise<GetUsersResponse> {
    const res = await apiClient.get('/admin/users', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        q: params.q || undefined,
        status: params.status || undefined,
        role: params.role || undefined,
      },
    });
    return res.data?.data as GetUsersResponse;
  },

  // User moderation action (suspend, ban, activate, change role)
  async userAction({ id, action, role, reason }: UserActionPayload) {
    const res = await apiClient.patch(`/admin/users/${id}/action`, {
      action,
      role,
      reason,
    });
    return res.data;
  },

  // 4. Moderation / safety reports queue
  async getModerationReports(status?: string): Promise<ModerationReportItem[]> {
    const res = await apiClient.get('/moderation/reports', {
      params: status && status !== 'ALL' ? { status } : undefined,
    });
    return (res.data?.data?.reports || []) as ModerationReportItem[];
  },

  // Resolve or dismiss safety report
  async resolveReport({ id, status, resolutionReason }: ResolveReportPayload) {
    const res = await apiClient.patch(`/moderation/reports/${id}`, {
      status,
      resolutionReason,
    });
    return res.data;
  },

  // 5. Financial metrics overview
  async getFinancialOverview() {
    const res = await apiClient.get('/payments/admin/overview');
    return res.data?.data;
  },

  // 6. Category taxonomy list
  async getCategoriesList(): Promise<Array<{ id: string; name: string; slug: string }>> {
    const res = await apiClient.get('/categories');
    return (res.data?.data || []) as Array<{ id: string; name: string; slug: string }>;
  },
};