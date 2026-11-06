import { useAuthStore } from '../stores/useAuthStore';

export function useAuth() {
  const store = useAuthStore();

  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    isAuthModalOpen: store.isAuthModalOpen,
    openAuthModal: store.openAuthModal,
    closeAuthModal: store.closeAuthModal,
    loginWithTokens: (userData: any, accessToken: string, _refreshToken?: string) => {
      store.setAuth(userData, accessToken);
    },
    logout: store.logout,
    checkAuth: store.checkAuth,
  };
}

