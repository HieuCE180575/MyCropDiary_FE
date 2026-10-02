import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import {
  clearAccessToken,
  getAccessToken,
  getAuthUser,
  type AuthSession,
  type AuthUser,
  saveAccessToken,
  subscribeToAuthChanges,
} from './authStorage';

interface AuthContextValue {
  accessToken: string | null;
  isAuthenticated: boolean;
  user: AuthUser | null;
  setSession: (session: AuthSession) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(getAccessToken);
  const [user, setUser] = useState<AuthUser | null>(getAuthUser);

  useEffect(() => subscribeToAuthChanges(() => {
    setAccessTokenState(getAccessToken());
    setUser(getAuthUser());
  }), []);

  const setSession = (session: AuthSession) => saveAccessToken(session.accessToken, session.user);
  const signOut = () => clearAccessToken();

  return (
    <AuthContext.Provider value={{ accessToken, user, isAuthenticated: Boolean(accessToken), setSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
