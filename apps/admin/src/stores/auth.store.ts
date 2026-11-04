import { create } from 'zustand';
import { AdminUser, AdminRole } from '../types';
import { apiClient } from '../lib/api-client';

interface AuthState {
  user: AdminUser | null;
  role: AdminRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AdminUser, token?: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user: AdminUser, token?: string) => {
    if (token) {
      localStorage.setItem('admin_token', token);
    }
    set({
      user,
      role: user.role,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('admin_token');
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      });
      window.location.href = '/login';
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const { data } = await apiClient.get('/auth/me');
      if (data.success && data.data) {
        set({
          user: data.data,
          role: data.data.role,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ user: null, role: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, role: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
