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
  tokens: AuthTokens;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Safely decode a JWT payload without adding heavy external dependencies
export function parseJwt(token: string): { exp?: number; iat?: number; [key: string]: any } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Predict whether the access token will expire within the buffer window (default 60 seconds)
export function isTokenExpiringSoon(token: string | null, bufferSeconds = 60): boolean {
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== 'number') {
    // If token cannot be inspected, treat as expired so silent refresh resolves it
    return false;
  }
  const currentTimeSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - currentTimeSeconds <= bufferSeconds;
}

// Returns milliseconds remaining until the token expires, or 0 if already expired
export function getTokenRemainingMs(token: string | null): number {
  if (!token) return 0;
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== 'number') return 0;
  const remainingMs = payload.exp * 1000 - Date.now();
  return remainingMs > 0 ? remainingMs : 0;
}

export const authService = {
  // Primary admin authentication endpoint
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

  // Perform token refresh using raw axios to avoid interceptor recursion
  async refreshToken(refreshToken?: string): Promise<AuthTokens> {
    const tokenToSend = refreshToken || localStorage.getItem('admin_refresh_token');
    const { data } = await axios.post<ApiResponse<AuthTokens>>(
      '/api/v1/auth/refresh',
      { refreshToken: tokenToSend },
      { withCredentials: true }
    );
    return data.data;
  },

  // Fetch authenticated admin profile
  async getMe(): Promise<AdminUser> {
    const { data } = await apiClient.get<ApiResponse<AdminUser>>('/auth/me');
    return data.data;
  },

  // Terminate current session
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
