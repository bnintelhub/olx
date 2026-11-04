import { create } from 'zustand';
import { AdminUser, AdminRole } from '../types';
import { authService } from '../features/auth/service/auth.service';
import { executeSilentRefresh } from '../lib/api-client';

// Access token lifespan is 15 minutes (900 seconds)
const ACCESS_TOKEN_LIFESPAN_MS = 15 * 60 * 1000;
// Proactively refresh 1 minute before expiry (at 14 minutes)
const PREDICTIVE_BUFFER_MS = 14 * 60 * 1000;

// In-memory standing timer for predictive silent refresh
let predictiveTimerId: ReturnType<typeof setTimeout> | null = null;

function clearPredictiveTimer() {
  if (predictiveTimerId) {
    clearTimeout(predictiveTimerId);
    predictiveTimerId = null;
  }
}

// Proactively schedules a background cookie renewal 1 minute before the 15-minute access token expires
function schedulePredictiveRefresh(delayMs = PREDICTIVE_BUFFER_MS) {
  clearPredictiveTimer();

  predictiveTimerId = setTimeout(async () => {
    // Silently renew HTTP-only cookies in background
    const success = await executeSilentRefresh();
    if (success) {
      // Re-arm timer for the next cycle
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: 'ADMIN',
  isAuthenticated: false,
  isLoading: true, // starts in loading state while checking authentic server session cookie

  setAuth: (user: AdminUser) => {
    // Arm in-memory predictive timer on login (zero localStorage token usage)
    schedulePredictiveRefresh(PREDICTIVE_BUFFER_MS);

    set({
      user,
      role: user.role,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  // Allows switching active role in UI - strictly guarded so only SUPER_ADMIN can toggle dashboards
  setRole: (newRole: AdminRole) => {
    const currentUser = get().user;
    if (currentUser?.role !== 'SUPER_ADMIN') {
      // Non-super-admins cannot toggle dashboards
      return;
    }
    set({
      role: newRole,
    });
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

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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

  // Verifies existing session on application boot by querying authenticated profile.
  // Sets authenticated user state if cookie is valid, otherwise unsets session.
  checkAuth: async () => {
    set({ isLoading: true });
    try {
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
    } catch {
      // Session does not exist or refresh failed in interceptor
    }

    clearPredictiveTimer();
    set({
      user: null,
      role: 'ADMIN',
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
