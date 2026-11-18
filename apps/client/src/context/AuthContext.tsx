import React, { useEffect } from 'react';
import { useAuthStore } from '../features/auth/stores/useAuthStore';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
};
