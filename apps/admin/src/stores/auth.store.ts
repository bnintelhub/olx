import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AdminUser, AdminRole } from '../types';
import { authService } from '../features/auth/service/auth.service';
import { executeSilentRefresh } from '../lib/api-client';

// Clean up any legacy localStorage key to ensure no tokens remain in client storage
try {
  localStorage.removeItem('olx-admin-auth');
} catch {
  // Ignore in non-browser environments
}

// Access token lifespan for admin sessions is 24 hours (86,400,000 ms)
// Proactively schedule silent refresh 1 hour before expiry
const PREDICTIVE_BUFFER_MS = 23 * 60 * 60 * 1000;

// In-memory standing timer for predictive silent refresh
let predictiveTimerId: ReturnType<typeof setTimeout> | null = null;

function clearPredictiveTimer() {
  if (predictiveTimerId) {
    clearTimeout(predictiveTimerId);
    predictiveTimerId = null;
  }
}

function schedulePredictiveRefresh(delayMs = PREDICTIVE_BUFFER_MS) {
  clearPredictiveTimer();

  predictiveTimerId = setTimeout(async () => {
    // Silently renew HTTP-only cookies in background
    const success = await executeSilentRefresh();
    if (success) {
      schedulePredictiveRefresh(PREDICTIVE_BUFFER_MS);
    }
  }, delayMs);
}

interface AuthState {
  user: AdminUser | null;
  role: AdminRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AdminUser) => void;
  setRole: (role: AdminRole) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  silentRefresh: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: 'ADMIN',
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user: AdminUser) => {
        schedulePredictiveRefresh(PREDICTIVE_BUFFER_MS);

        set({
          user,
          role: user.role,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setRole: (newRole: AdminRole) => {
        const currentUser = get().user;
        if (currentUser?.role !== 'SUPER_ADMIN') {
          return;
        }
        set({ role: newRole });
      },

      logout: async () => {
        clearPredictiveTimer();
        try {
          await authService.logout();
        } catch {
          // Ignore network errors on logout
        } finally {
          set({
            user: null,
            role: 'ADMIN',
            isAuthenticated: false,
            isLoading: false,
          });

          try {
            localStorage.removeItem('olx-admin-user');
          } catch {
            // ignore
          }

          const loginPath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/login';
          if (window.location.pathname !== loginPath) {
            window.location.href = loginPath;
          }
        }
      },

      silentRefresh: async () => {
        const success = await executeSilentRefresh();
        if (success) {
          schedulePredictiveRefresh(PREDICTIVE_BUFFER_MS);
        }
        return success;
      },

      checkAuth: async () => {
        const currentUser = get().user;
        if (!currentUser) {
          set({ isLoading: true });
        }

        try {
          // Authenticate against server using secure HTTP-only cookies
          const user = await authService.getMe();
          if (user) {
            schedulePredictiveRefresh(PREDICTIVE_BUFFER_MS);
            set({
              user,
              role: user.role,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }
        } catch (err: any) {
          // If server explicitly returns 401 and silent refresh failed, reset session
          if (err?.response?.status === 401) {
            await get().logout();
            return;
          }
          // On network errors or server reboot, preserve existing cached profile
        }

        set({ isLoading: false });
      },
    }),
    {
      name: 'olx-admin-user',
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive user profile data for immediate UI rendering
      // NO tokens are ever persisted to localStorage (100% HTTP-only cookies)
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          state.isLoading = false;
        }
      },
    }
  )
);
