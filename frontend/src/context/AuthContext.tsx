import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  access_token?: string;
}

interface AuthContextType {
  user: User | null | undefined;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  token: null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({ id: data._id || data.id, name: data.name, email: data.email, role: data.role });
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const { data } = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password });
    setToken(data.access_token);
    setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await axios.post(`${BACKEND_URL}/api/auth/register`, { name, email, password });
    setToken(data.access_token);
    setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
  };

  const logout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`);
    } catch {}
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
}
