import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: (onSuccess?: () => void) => void;
  closeAuthModal: () => void;
  loginWithTokens: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('olx_access_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [postLoginCallback, setPostLoginCallback] = useState<(() => void) | null>(null);

  // Fetch current user on mount if token exists
  useEffect(() => {
    const fetchMe = async () => {
      const savedToken = localStorage.getItem('olx_access_token') || localStorage.getItem('token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.data);
          setToken(savedToken);
          localStorage.setItem('olx_access_token', savedToken);
          localStorage.setItem('token', savedToken);
          localStorage.setItem('olx_wishlist_user_id', data.data.id);
        } else {
          // Token expired or invalid
          localStorage.removeItem('olx_access_token');
          localStorage.removeItem('token');
          localStorage.removeItem('olx_refresh_token');
          localStorage.removeItem('olx_wishlist_user_id');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMe();
  }, []);

  const loginWithTokens = (userData: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem('olx_access_token', accessToken);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('olx_refresh_token', refreshToken);
    localStorage.setItem('olx_wishlist_user_id', userData.id);
    setUser(userData);
    setToken(accessToken);
    setIsAuthModalOpen(false);

    if (postLoginCallback) {
      const cb = postLoginCallback;
      setPostLoginCallback(null);
      setTimeout(() => {
        cb();
      }, 100);
    }
  };

  const logout = async () => {
    const savedToken = localStorage.getItem('olx_access_token') || localStorage.getItem('token');
    if (savedToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${savedToken}` },
        });
      } catch (_) {}
    }
    localStorage.removeItem('olx_access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('olx_refresh_token');
    localStorage.removeItem('olx_wishlist_user_id');
    setUser(null);
    setToken(null);
  };

  const openAuthModal = (onSuccess?: (() => void) | unknown) => {
    if (typeof onSuccess === 'function') {
      setPostLoginCallback(() => onSuccess as () => void);
    } else {
      setPostLoginCallback(null);
    }
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setPostLoginCallback(null);
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        loginWithTokens,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
