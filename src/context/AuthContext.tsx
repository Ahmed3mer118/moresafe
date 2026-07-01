import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient } from '../core/ApiClient';
import { authService } from '../services';
import type { User } from '../types';
import { ROLE_DASHBOARD } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiClient.setToken(token);
      authService
        .me()
        .then(({ user }) => setUser(user))
        .catch(() => {
          localStorage.removeItem('token');
          apiClient.setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user, dashboard } = await authService.login(email, password);
    localStorage.setItem('token', token);
    apiClient.setToken(token);
    setUser(user);
    return dashboard || ROLE_DASHBOARD[user.role as keyof typeof ROLE_DASHBOARD];
  };

  const logout = () => {
    localStorage.removeItem('token');
    apiClient.setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const { user } = await authService.me();
    setUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
