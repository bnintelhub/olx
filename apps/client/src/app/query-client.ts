import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

