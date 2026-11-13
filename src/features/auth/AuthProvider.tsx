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
import { logoutUser, authenticateWithGoogle } from './authApi';

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

  // Bắt token nếu người dùng được redirect từ Google OAuth
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
      const params = new URLSearchParams(hash);
      const googleToken = params.get('access_token');
      if (googleToken) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        void (async () => {
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${googleToken}` },
            });
            if (userInfoRes.ok) {
              const profile = (await userInfoRes.json()) as { email?: string; name?: string; picture?: string };
              if (profile.email) {
                const session = await authenticateWithGoogle({
                  email: profile.email,
                  fullName: profile.name,
                  avatarUrl: profile.picture,
                });
                setSession(session);
              }
            }
          } catch (e) {
            console.error('Lỗi nhận diện Google token từ URL hash:', e);
          }
        })();
      }
    }
  }, []);

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
