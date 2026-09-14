import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { authApi, tokenStorage } from '../../lib/api';
import type { AuthUser } from '../../types';
import { AuthContext, type AuthContextValue } from './auth-context-value';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const current = sessionStorage.getItem('pickle_token');
    return current ?? localStorage.getItem('pickle_token');
  });
  const [user, setUser] = useState<AuthUser | null>(null);

  const { isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    enabled: !!token,
    queryFn: async () => {
      if (!token) {
        return null;
      }

      try {
        const currentUser = await authApi.me();
        setUser(currentUser);
        return currentUser;
      } catch (error) {
        // The session token is invalid or expired — clear it so the user
        // is cleanly returned to the login screen instead of looping.
        tokenStorage.clear();
        setToken(null);
        setUser(null);
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      setUser,
    }),
    [isLoading, login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
