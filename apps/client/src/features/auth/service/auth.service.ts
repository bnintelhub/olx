import { apiClient } from '@/lib/api-client';
import { User } from '@/types';

export interface LoginDto {
  email?: string;
  phoneNumber?: string;
  password?: string;
  otp?: string;
}

export interface RegisterDto {
  name: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
}

export const authService = {
  // Send OTP to phone or email
  async sendOtp(target: string, type: 'PHONE' | 'EMAIL' = 'PHONE') {
    const { data } = await apiClient.post('/auth/otp/send', {
      phoneNumber: target,
      target,
      type,
    });
    return data;
  },

  // Verify OTP
  async verifyOtp(target: string, code: string, sessionId?: string) {
    const { data } = await apiClient.post('/auth/otp/verify', {
      phoneNumber: target,
      target,
      otp: code,
      code,
      sessionId,
    });
    return data;
  },

  // Login with credentials or OTP
  async login(credentials: LoginDto) {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
  },

  // Register new user
  async register(userData: RegisterDto) {
    const { data } = await apiClient.post('/auth/register', userData);
    return data;
  },

  // Fetch current user session
  async getMe(): Promise<{ success: boolean; data: User }> {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  // Logout user
  async logout() {
    const { data } = await apiClient.post('/auth/logout');
    return data;
  },
};

