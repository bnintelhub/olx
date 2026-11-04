import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authService } from '../service/auth.service';
import { useAuthStore } from '../../../stores/auth.store';
import { AdminUser } from '../../../types';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

// Hook to query and cache the currently authenticated admin profile
export function useAuthQuery() {
  const { accessToken, setAuth, isAuthenticated } = useAuthStore();

  const query = useQuery<AdminUser, Error>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      return await authService.getMe();
    },
    // Only query backend when an active token exists
    enabled: Boolean(accessToken && isAuthenticated),
    staleTime: 1000 * 60 * 5, // Cache profile for 5 minutes
    retry: (failureCount, error: any) => {
      // Do not retry on 401 unauthorized errors
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  // Keep Zustand auth state synchronized whenever TanStack Query fetches fresh user data
  useEffect(() => {
    if (query.data) {
      setAuth(query.data);
    }
  }, [query.data, setAuth]);

  return query;
}
