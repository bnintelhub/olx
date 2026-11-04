import { create } from 'zustand';
import { AdminUser, AdminRole } from '../types';
import { authService, AuthTokens, getTokenRemainingMs } from '../features/auth/service/auth.service';
import { executeSilentRefresh } from '../lib/api-client';

// Fallback demo user for preview and testing all 7 role views
const DEFAULT_DEMO_USER: AdminUser = {
  id: 'admin_rahul',
  name: 'Rahul Kumar',
  email: 'rahul@gmail.com',
  role: 'SUPER_ADMIN',
  permissions: ['*'],
};

// Variable holding the standing predictive refresh timeout
let predictiveTimerId: ReturnType<typeof setTimeout> | null = null;

// Clear any scheduled background token refresh
function clearPredictiveTimer() {
  if (predictiveTimerId) {
    clearTimeout(predictiveTimerId);
    predictiveTimerId = null;
  }
}

// Proactively schedules a silent refresh ~60 seconds before the access token expires
function schedulePredictiveRefresh(accessToken: string | null) {
  clearPredictiveTimer();
  if (!accessToken) return;

  const remainingMs = getTokenRemainingMs(accessToken);
  // Schedule 60 seconds before expiration, or run in 10s if already close to expiry
  const delayMs = Math.max(remainingMs - 60 * 1000, 10 * 1000);

  predictiveTimerId = setTimeout(async () => {
    // Proactively refresh the access token before any user action triggers a 401
    const freshToken = await executeSilentRefresh();
    if (freshToken) {
      schedulePredictiveRefresh(freshToken);
    }
  }, delayMs);
}

interface AuthState {
  user: AdminUser | null;
  role: AdminRole;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AdminUser, tokens?: Partial<AuthTokens>) => void;
  setTokens: (tokens: AuthTokens) => void;
  setRole: (role: AdminRole) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  silentRefresh: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: DEFAULT_DEMO_USER,
  role: 'SUPER_ADMIN',
  accessToken: localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token'),
  refreshToken: localStorage.getItem('admin_refresh_token'),
  isAuthenticated: true,
  isLoading: false,

  setAuth: (user: AdminUser, tokens?: Partial<AuthTokens>) => {
    if (tokens?.accessToken) {
      localStorage.setItem('admin_access_token', tokens.accessToken);
      localStorage.setItem('admin_token', tokens.accessToken);
    }
    if (tokens?.refreshToken) {
      localStorage.setItem('admin_refresh_token', tokens.refreshToken);
    }

    // Schedule next predictive refresh before the new token expires
    schedulePredictiveRefresh(tokens?.accessToken || null);

    set({
      user,
      role: user.role,
      accessToken: tokens?.accessToken || get().accessToken,
      refreshToken: tokens?.refreshToken || get().refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setTokens: (tokens: AuthTokens) => {
    localStorage.setItem('admin_access_token', tokens.accessToken);
    localStorage.setItem('admin_token', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('admin_refresh_token', tokens.refreshToken);
    }

    schedulePredictiveRefresh(tokens.accessToken);

    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || get().refreshToken,
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
    clearPredictiveTimer();
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');

      set({
        user: null,
        role: 'SUPER_ADMIN',
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  },

  silentRefresh: async () => {
    const freshToken = await executeSilentRefresh();
    if (freshToken) {
      schedulePredictiveRefresh(freshToken);
      set({ accessToken: freshToken });
    }
    return freshToken;
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');
      if (!token) {
        // Retain default demo user for frictionless UI preview if not logged in
        return;
      }

      // Schedule proactive refresh for stored session
      schedulePredictiveRefresh(token);

      const user = await authService.getMe();
      if (user) {
        set({
          user,
          role: user.role,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch {
      // Keep demo session active on network error to allow continuous development
    }
  },
}));
