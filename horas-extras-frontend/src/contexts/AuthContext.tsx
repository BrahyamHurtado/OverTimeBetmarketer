import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { config } from '@/config';
import { setApiToken } from '@/shared/apiClient';
import type { UsuarioSesion } from '@/shared/types';

interface AuthState {
  token: string | null;
  usuario: UsuarioSesion | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, usuario: UsuarioSesion) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const readStored = (): AuthState => {
  try {
    const token = localStorage.getItem(config.TOKEN_STORAGE_KEY);
    const userRaw = localStorage.getItem(config.USER_STORAGE_KEY);
    const usuario = userRaw ? (JSON.parse(userRaw) as UsuarioSesion) : null;
    return { token, usuario };
  } catch {
    return { token: null, usuario: null };
  }
};

if (typeof window !== 'undefined') {
  setApiToken(readStored().token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => readStored());
  const logoutRef = useRef<() => void>(() => {});

  const login = useCallback((token: string, usuario: UsuarioSesion) => {
    localStorage.setItem(config.TOKEN_STORAGE_KEY, token);
    localStorage.setItem(config.USER_STORAGE_KEY, JSON.stringify(usuario));
    setApiToken(token);
    setState({ token, usuario });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(config.TOKEN_STORAGE_KEY);
    localStorage.removeItem(config.USER_STORAGE_KEY);
    setApiToken(null);
    setState({ token: null, usuario: null });
  }, []);

  logoutRef.current = logout;

  useEffect(() => {
    const handler = () => logoutRef.current();
    window.addEventListener('he:unauthorized', handler);
    return () => window.removeEventListener('he:unauthorized', handler);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: !!state.token && !!state.usuario,
      login,
      logout,
    }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
