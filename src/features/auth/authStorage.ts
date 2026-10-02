export const ACCESS_TOKEN_KEY = 'access_token';

const AUTH_CHANGED_EVENT = 'mycropdiary:auth-changed';
// Keep the JWT in memory; passwords and refresh tokens are never persisted.
let authorization: string | null = null;
export interface AuthUser {
  userId: number;
  email: string;
  fullName: string;
  systemRole: string;
}

export interface AuthSession {
  accessToken: string;
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

export function saveAccessToken(token: string, user: AuthUser | null = null) {
  authorization = token;
  currentUser = user;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  notifyAuthChanged();
}

export function clearAccessToken() {
  authorization = null;
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
