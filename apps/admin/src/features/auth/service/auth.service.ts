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
    const { data } = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/admin-login', {
      username: payload.username.trim(),
      password: payload.password,
      role: payload.role || 'SUPER_ADMIN',
    });
    return data.data;
  },

  // Staff registration endpoint
  async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const { data } = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', payload);
    return data.data;
  },

  // Standard user email/password login
  async login(payload: { email: string; password?: string }): Promise<AuthResponseData> {
    const { data } = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', payload);
    return data.data;
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
    const { data } = await apiClient.get<ApiResponse<AdminUser>>('/auth/me');
    return data.data;
  },

  // Terminate session and clear HTTP-only cookies on backend
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
