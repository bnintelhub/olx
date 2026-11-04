import { apiClient } from '../../../lib/api-client';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'BUSINESS_SELLER'
  | 'PRO_DEALER'
  | 'VERIFIED_USER'
  | 'BUYER'
  | string;

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  city: string;
  state: string;
  kycVerified: boolean;
  activeAds: number;
  totalDeals: number;
  status: UserStatus;
  joinedDate: string;
  lastActive: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  role?: string;
}

export interface GetUsersResponse {
  users: UserRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UpdateUserStatusPayload {
  id: string;
  status: UserStatus;
  reason?: string;
}

export const usersService = {
  // Fetch paginated user records with search, status, and role filters
  async getUsers(params: GetUsersParams): Promise<GetUsersResponse> {
    const res = await apiClient.get('/admin/users', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        q: params.q || undefined,
        status: params.status && params.status !== 'ALL' ? params.status : undefined,
        role: params.role && params.role !== 'ALL' ? params.role : undefined,
      },
    });
    return res.data?.data as GetUsersResponse;
  },

  // Update user account lifecycle status (ACTIVE, SUSPENDED, BANNED, DELETED)
  async updateUserStatus({ id, status, reason }: UpdateUserStatusPayload) {
    const res = await apiClient.patch(`/admin/users/${id}/status`, {
      status,
      reason,
    });
    return res.data;
  },

  // Fetch full user profile details by ID
  async getUserDetail(id: string) {
    const res = await apiClient.get(`/admin/users/${id}`);
    return res.data?.data;
  },
};

