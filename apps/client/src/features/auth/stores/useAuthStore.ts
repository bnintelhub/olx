import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authService } from '../service/auth.service';
import { executeSilentRefresh, getInMemoryAccessToken, setInMemoryAccessToken } from '@/lib/api-client';
import { disconnectChatSocket } from '@/features/chat/services/chatSocket.service';

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
      token: null, // Always memory-only to eliminate XSS token theft
      isAuthenticated: false,
      isLoading: true,
      isAuthModalOpen: false,
      postLoginCallback: null,

      setAuth: (user: User, token?: string) => {
        if (token) {
          setInMemoryAccessToken(token);
        }
        localStorage.setItem('olx_wishlist_user_id', user.id);

        set({
          user,
          token: token || getInMemoryAccessToken(),
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
          if (get().user) {
            set({ isLoading: false });
          }

          let activeToken = getInMemoryAccessToken();
          if (!activeToken) {
            await executeSilentRefresh();
            activeToken = getInMemoryAccessToken();
          }

          const res = await authService.getMe();
          if (res?.success && res.data) {
            set({
              user: res.data,
              token: activeToken || getInMemoryAccessToken(),
              isAuthenticated: true,
              isLoading: false,
            });
            localStorage.setItem('olx_wishlist_user_id', res.data.id);
            return;
          }
        } catch {
          // Guest user or token expired
        }

        // Reset state and clear memory token
        setInMemoryAccessToken(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      logout: async () => {
        disconnectChatSocket();
        try {
          await authService.logout();
        } catch {
          // ignore error on logout
        }
        setInMemoryAccessToken(null);
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
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
        }
      },
    }
  )
);

