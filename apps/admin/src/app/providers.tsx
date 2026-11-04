import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './query-client';
import { Toaster } from 'sonner';
import { useAuthStore } from '../stores/auth.store';
import { ThemeProvider } from './theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check authentic session exactly once on application mount
    useAuthStore.getState().checkAuth();
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="olx-admin-theme">
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" richColors />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
