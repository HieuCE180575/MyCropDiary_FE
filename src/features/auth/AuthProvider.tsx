import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import {
  clearAccessToken,
  getAccessToken,
  getAuthUser,
  getRefreshToken,
  type AuthSession,
  type AuthUser,
  saveAccessToken,
  subscribeToAuthChanges,
  updateAuthUser,
} from './authStorage';
import { logoutUser } from './authApi';

interface AuthContextValue {
  accessToken: string | null;
  isAuthenticated: boolean;
  user: AuthUser | null;
  setSession: (session: AuthSession) => void;
  signOut: () => void;
  switchRole: (role: 'ADMIN' | 'USER') => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(getAccessToken);
  const [user, setUser] = useState<AuthUser | null>(getAuthUser);

  useEffect(() => subscribeToAuthChanges(() => {
    setAccessTokenState(getAccessToken());
    setUser(getAuthUser());
  }), []);

  const setSession = (session: AuthSession) => saveAccessToken(session.accessToken, session.user, session.refreshToken);
  const signOut = () => {
    const token = getRefreshToken();
    clearAccessToken();
    void logoutUser(token ?? undefined);
  };
  const updateUser = (updates: Partial<AuthUser>) => updateAuthUser(updates);
  const switchRole = (role: 'ADMIN' | 'USER') => {
    const current = user || getAuthUser();
    const updatedUser: AuthUser = {
      userId: current?.userId || (role === 'ADMIN' ? 99 : 1),
      email: current?.email || (role === 'ADMIN' ? 'admin@mycropdiary.vn' : 'farmer@mycropdiary.vn'),
      fullName: current?.fullName || (role === 'ADMIN' ? 'Quản trị viên Hệ thống' : 'Nguyễn Nông Dân'),
      systemRole: role,
    };
    saveAccessToken(accessToken || 'test-session-token', updatedUser);
  };

  return (
    <AuthContext.Provider value={{ accessToken, user, isAuthenticated: Boolean(accessToken), setSession, signOut, switchRole, updateUser }}>
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
