import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authService } from '../service/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  postLoginCallback: (() => void) | null;
  setAuth: (user: User, token?: string) => void;
  setUser: (user: User | null) => void;
  openAuthModal: (onSuccess?: () => void) => void;
  closeAuthModal: () => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: typeof window !== 'undefined' ? localStorage.getItem('olx_access_token') : null,
      isAuthenticated: false,
      isLoading: true,
      isAuthModalOpen: false,
      postLoginCallback: null,

      setAuth: (user: User, token?: string) => {
        if (token) {
          localStorage.setItem('olx_access_token', token);
          localStorage.setItem('token', token);
        }
        localStorage.setItem('olx_wishlist_user_id', user.id);

        set({
          user,
          token: token || get().token,
          isAuthenticated: true,
          isLoading: false,
          isAuthModalOpen: false,
        });

        const cb = get().postLoginCallback;
        if (cb) {
          set({ postLoginCallback: null });
          setTimeout(() => cb(), 100);
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: Boolean(user) });
      },

      openAuthModal: (onSuccess?: () => void) => {
        set({
          isAuthModalOpen: true,
          postLoginCallback: onSuccess || null,
        });
      },

      closeAuthModal: () => {
        set({
          isAuthModalOpen: false,
          postLoginCallback: null,
        });
      },

      checkAuth: async () => {
        try {
          const res = await authService.getMe();
          if (res?.success && res.data) {
            set({
              user: res.data,
              isAuthenticated: true,
              isLoading: false,
            });
            localStorage.setItem('olx_wishlist_user_id', res.data.id);
            return;
          }
        } catch {
          // Guest user or token expired
        }

        // Reset state and clear stale storage tokens on unauthenticated status
        localStorage.removeItem('olx_access_token');
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // ignore error on logout
        }
        localStorage.removeItem('olx_access_token');
        localStorage.removeItem('token');
        localStorage.removeItem('olx_refresh_token');
        localStorage.removeItem('olx_wishlist_user_id');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'olx-client-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

