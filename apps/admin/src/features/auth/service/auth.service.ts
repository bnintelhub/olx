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
};
