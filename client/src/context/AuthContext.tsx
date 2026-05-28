import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import api from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        sessionStorage.setItem('arcade_token', urlToken);
        window.history.replaceState({}, '', window.location.pathname);
      }
      const token = sessionStorage.getItem('arcade_token');
      if (token) {
        try {
          const res = await api.get<User>('/auth/me');
          setUser(res.data);
        } catch {
          sessionStorage.removeItem('arcade_token');
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  function logout() {
    sessionStorage.removeItem('arcade_token');
    setUser(null);
    api.post('/auth/logout').catch(() => {});
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
