import axios from 'axios';
import { apiClient } from '../../../lib/api-client';
import { AdminUser, AdminRole } from '../../../types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface AdminLoginPayload {
  username: string;
  password?: string;
  role?: AdminRole;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
  phoneNumber?: string;
}

export interface AuthResponseData {
  user: AdminUser;
  tokens?: AuthTokens;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface StaffInvitationItem {
  id: string;
  email: string;
  role: AdminRole;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  invitedBy?: {
    id: string;
    email?: string;
    profile?: { name?: string | null };
  };
}

export interface InvitationDetails {
  email: string;
  role: AdminRole;
  invitedBy: string;
  expiresAt: string;
}

export const authService = {
  // Primary admin authentication endpoint - sets secure HTTP-only cookies on reply
  async adminLogin(payload: AdminLoginPayload): Promise<AuthResponseData> {
    const { data } = await apiClient.post<ApiResponse<any>>('/auth/admin-login', {
      username: payload.username.trim(),
      password: payload.password,
      role: payload.role || 'ADMIN',
    });
    const rawUser = data.data.user;
    const user: AdminUser = {
      id: rawUser.id,
      email: rawUser.email,
      phoneNumber: rawUser.phoneNumber,
      role: rawUser.role,
      name: rawUser.name || rawUser.profile?.name || rawUser.email?.split('@')[0] || 'Admin',
      permissions: rawUser.permissions || [],
    };
    return { user, tokens: data.data.tokens };
  },

  // Staff registration endpoint
  async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const { data } = await apiClient.post<ApiResponse<any>>('/auth/register', payload);
    const rawUser = data.data.user;
    const user: AdminUser = {
      id: rawUser.id,
      email: rawUser.email,
      phoneNumber: rawUser.phoneNumber,
      role: rawUser.role,
      name: rawUser.name || rawUser.profile?.name || rawUser.email?.split('@')[0] || 'Staff',
      permissions: rawUser.permissions || [],
    };
    return { user, tokens: data.data.tokens };
  },

  // Standard user email/password login
  async login(payload: { email: string; password?: string }): Promise<AuthResponseData> {
    const { data } = await apiClient.post<ApiResponse<any>>('/auth/login', payload);
    const rawUser = data.data.user;
    const user: AdminUser = {
      id: rawUser.id,
      email: rawUser.email,
      phoneNumber: rawUser.phoneNumber,
      role: rawUser.role,
      name: rawUser.name || rawUser.profile?.name || rawUser.email?.split('@')[0] || 'User',
      permissions: rawUser.permissions || [],
    };
    return { user, tokens: data.data.tokens };
  },

  // Silent refresh via HTTP-only cookie.
  // Fastify reads 'refresh_token' cookie automatically and issues fresh cookies on reply.
  async refreshToken(): Promise<AuthTokens> {
    const { data } = await axios.post<ApiResponse<AuthTokens>>(
      '/api/v1/auth/refresh',
      {},
      { withCredentials: true }
    );
    return data.data;
  },

  // Fetch authenticated admin profile using HTTP-only session cookie
  async getMe(): Promise<AdminUser> {
    const { data } = await apiClient.get<ApiResponse<any>>('/auth/me');
    const rawUser = data.data;
    return {
      id: rawUser.id,
      email: rawUser.email,
      phoneNumber: rawUser.phoneNumber,
      role: rawUser.role,
      name: rawUser.name || rawUser.profile?.name || rawUser.email?.split('@')[0] || 'Admin',
      permissions: rawUser.permissions || [],
    };
  },

  // Terminate session and clear HTTP-only cookies on backend
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  // ==========================================
  // STAFF INVITATIONS (Super Admin Actions)
  // ==========================================

  async createStaffInvitation(payload: { email: string; role: AdminRole }): Promise<{ invitation: StaffInvitationItem; inviteLink: string }> {
    const { data } = await apiClient.post<ApiResponse<{ invitation: StaffInvitationItem; inviteLink: string }>>('/admin/invitations', payload);
    return data.data;
  },

  async getStaffInvitations(): Promise<StaffInvitationItem[]> {
    const { data } = await apiClient.get<ApiResponse<StaffInvitationItem[]>>('/admin/invitations');
    return data.data;
  },

  async revokeStaffInvitation(id: string): Promise<StaffInvitationItem> {
    const { data } = await apiClient.delete<ApiResponse<StaffInvitationItem>>(`/admin/invitations/${id}`);
    return data.data;
  },

  // ==========================================
  // STAFF INVITATION ACCEPTANCE (Public Flow)
  // ==========================================

  async getInvitationDetails(token: string): Promise<InvitationDetails> {
    const { data } = await apiClient.get<ApiResponse<InvitationDetails>>(`/auth/invitation/${token}`);
    return data.data;
  },

  async acceptStaffInvitation(payload: { token: string; name: string; password: string; phoneNumber?: string }): Promise<AuthResponseData> {
    const { data } = await apiClient.post<ApiResponse<any>>('/auth/accept-invitation', payload);
    const rawUser = data.data.user;
    const user: AdminUser = {
      id: rawUser.id,
      email: rawUser.email,
      phoneNumber: rawUser.phoneNumber,
      role: rawUser.role,
      name: rawUser.name || rawUser.profile?.name || 'Staff Member',
      permissions: rawUser.permissions || [],
    };
    return { user, tokens: data.data.tokens };
  },
};
