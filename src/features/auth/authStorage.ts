export const ACCESS_TOKEN_KEY = 'access_token';

const AUTH_CHANGED_EVENT = 'mycropdiary:auth-changed';
// Keep both tokens in memory; neither survives a page reload.
let authorization: string | null = null;
let refreshCredential: string | null = null;
let sessionVersion = 0;
export interface AuthUser {
  userId: number;
  email: string;
  fullName: string;
  systemRole: string;
  phone?: string;
  avatarUrl?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

let currentUser: AuthUser | null = null;

export function getAuthUser(): AuthUser | null {
  return currentUser;
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getAccessToken(): string | null {
  return authorization;
}

export function getRefreshToken(): string | null {
  return refreshCredential;
}

// Changes on login/logout, so a late refresh cannot restore an ended session.
export function getSessionVersion(): number {
  return sessionVersion;
}

export function saveAccessToken(token: string, user: AuthUser | null = null, refreshToken: string | null = null) {
  sessionVersion++;
  authorization = token;
  refreshCredential = refreshToken;
  currentUser = user;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  notifyAuthChanged();
}

export function updateSessionTokens(session: AuthSession, expectedVersion: number): boolean {
  if (sessionVersion !== expectedVersion || !authorization) return false;
  authorization = session.accessToken;
  refreshCredential = session.refreshToken ?? refreshCredential;
  currentUser = { ...currentUser, ...session.user };
  notifyAuthChanged();
  return true;
}

export function updateAuthUser(updates: Partial<AuthUser>) {
  if (currentUser) {
    currentUser = { ...currentUser, ...updates };
    notifyAuthChanged();
  }
}

export function clearAccessToken() {
  sessionVersion++;
  authorization = null;
  refreshCredential = null;
  currentUser = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  notifyAuthChanged();
}

export function subscribeToAuthChanges(listener: () => void) {
  window.addEventListener(AUTH_CHANGED_EVENT, listener);
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
