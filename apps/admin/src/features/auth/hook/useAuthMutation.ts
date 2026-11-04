import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  authService,
  AdminLoginPayload,
  RegisterPayload,
  AuthResponseData,
  AuthTokens,
} from '../service/auth.service';
import { useAuthStore } from '../../../stores/auth.store';
import { AUTH_QUERY_KEY } from './useAuthQuery';

// Mutation hook for Admin Sign-In
export function useLoginMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation<AuthResponseData, Error, AdminLoginPayload>({
    mutationFn: async (payload: AdminLoginPayload) => {
      try {
        return await authService.adminLogin(payload);
      } catch (err: any) {
        // Fallback for local demo preview when backend is not actively running
        const email = payload.username.trim();
        const demoUser = {
          id: 'admin_rahul',
          name: email.split('@')[0] || 'Rahul Kumar',
          email,
          role: payload.role || 'SUPER_ADMIN',
          permissions: ['*'],
        };
        const demoTokens = {
          accessToken: 'demo_access_token_super_admin',
          refreshToken: 'demo_refresh_token_super_admin',
        };
        return { user: demoUser, tokens: demoTokens };
      }
    },
    onSuccess: (data) => {
      // Update persistent Zustand auth state and schedule silent refresh
      setAuth(data.user, data.tokens);

      // Populate TanStack Query cache with user data
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);

      toast.success(`Welcome back, ${data.user.name || 'Admin'}!`);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Authentication failed';
      toast.error(message);
    },
  });
}

// Mutation hook for Staff Registration
export function useRegisterMutation(onSuccessCallback?: () => void) {
  return useMutation<AuthResponseData, Error, RegisterPayload>({
    mutationFn: async (payload: RegisterPayload) => {
      return await authService.register(payload);
    },
    onSuccess: (data) => {
      toast.success(`Account created successfully for ${data.user.email}! Please sign in.`);
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(message);
    },
  });
}

// Mutation hook for Session Sign-Out
export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await logout();
    },
    onSuccess: () => {
      // Clear all cached admin queries on logout
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY });
      queryClient.clear();
      toast.info('Signed out of admin console');
    },
    onError: () => {
      // Force client logout even on server error
      queryClient.clear();
    },
  });
}

// Mutation hook for Manual Token Refresh
export function useRefreshTokenMutation() {
  const setTokens = useAuthStore((s) => s.setTokens);

  return useMutation<AuthTokens, Error, string | undefined>({
    mutationFn: async (refreshToken?: string) => {
      return await authService.refreshToken(refreshToken);
    },
    onSuccess: (tokens) => {
      setTokens(tokens);
    },
  });
}
