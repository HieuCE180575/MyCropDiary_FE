export const ACCESS_TOKEN_KEY = 'access_token';
export const AUTH_SESSION_KEY = 'mycropdiary:auth-session';

const AUTH_CHANGED_EVENT = 'mycropdiary:auth-changed';
// Restore synchronously so protected routes can recognize the session on reload.
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

try {
  const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
  if (raw) {
    const session = JSON.parse(raw);
    const user = session?.user;
    if (typeof session?.accessToken !== 'string' || !session.accessToken.trim()
      || (session.refreshToken != null && (typeof session.refreshToken !== 'string' || !session.refreshToken.trim()))
      || (user != null && (typeof user.userId !== 'number' || typeof user.email !== 'string'
        || typeof user.fullName !== 'string' || typeof user.systemRole !== 'string'))) {
      throw new Error('Invalid saved session');
    }
    authorization = session.accessToken;
    refreshCredential = session.refreshToken ?? null;
    currentUser = user ?? null;
  }
} catch {
  // Storage may be unavailable or contain invalid data; keep the app usable.
  try { sessionStorage.removeItem(AUTH_SESSION_KEY); } catch { /* Storage blocked. */ }
}

function persistSession() {
  try {
    if (authorization) {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
        accessToken: authorization, refreshToken: refreshCredential, user: currentUser,
      }));
    } else {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch { /* Keep the in-memory session usable when storage is blocked. */ }
  try { localStorage.removeItem(ACCESS_TOKEN_KEY); } catch { /* Storage blocked. */ }
}

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
  persistSession();
  notifyAuthChanged();
}

export function updateSessionTokens(session: AuthSession, expectedVersion: number): boolean {
  if (sessionVersion !== expectedVersion || !authorization) return false;
  authorization = session.accessToken;
  refreshCredential = session.refreshToken ?? refreshCredential;
  currentUser = { ...currentUser, ...session.user };
  persistSession();
  notifyAuthChanged();
  return true;
}

export function updateAuthUser(updates: Partial<AuthUser>) {
  if (currentUser) {
    currentUser = { ...currentUser, ...updates };
    persistSession();
    notifyAuthChanged();
  }
}

export function clearAccessToken() {
  sessionVersion++;
  authorization = null;
  refreshCredential = null;
  currentUser = null;
  persistSession();
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
