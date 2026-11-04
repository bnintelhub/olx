import { create } from 'zustand';
import { AdminUser, AdminRole } from '../types';
import { apiClient } from '../lib/api-client';

// Fallback demo user for preview and testing all role views
const DEFAULT_DEMO_USER: AdminUser = {
  id: 'admin_1',
  name: 'Rahul Kumar',
  email: 'rahul.kumar@olx.in',
  role: 'SUPER_ADMIN',
  permissions: ['*'],
};

interface AuthState {
  user: AdminUser | null;
  role: AdminRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AdminUser, token?: string) => void;
  setRole: (role: AdminRole) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: DEFAULT_DEMO_USER,
  role: 'SUPER_ADMIN',
  isAuthenticated: true,
  isLoading: false,

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

  // Allows switching active role in UI for multi-role operations & testing
  setRole: (newRole: AdminRole) => {
    set((state) => ({
      role: newRole,
      user: state.user
        ? { ...state.user, role: newRole }
        : { ...DEFAULT_DEMO_USER, role: newRole },
    }));
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
        role: 'SUPER_ADMIN',
        isAuthenticated: false,
        isLoading: false,
      });
      window.location.href = '/login';
    }
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        // Retain default demo user for frictionless UI preview if not logged in
        return;
      }
      const { data } = await apiClient.get('/auth/me');
      if (data.success && data.data) {
        set({
          user: data.data,
          role: data.data.role,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch {
      // Keep demo session active on network error to allow continuous development
    }
  },
}));
