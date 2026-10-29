import {
  clearAccessToken, getAccessToken, getRefreshToken, getSessionVersion, updateSessionTokens,
} from '../../features/auth/authStorage';
import axios, { AxiosHeaders, type AxiosRequestConfig, type AxiosResponse, type RawAxiosHeaders } from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');
const httpClient = axios.create({ baseURL: API_BASE_URL, headers: { Accept: 'application/json' } });

export type ApiRequestOptions = Pick<AxiosRequestConfig, 'method' | 'data' | 'signal'> & {
  headers?: AxiosHeaders | RawAxiosHeaders;
  anonymous?: boolean;
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const sessionExpired = () => new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
let pendingRefresh: { version: number; promise: Promise<void> } | null = null;

function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return false; // Let the backend validate unreadable tokens.
  }
}

async function renewSession(rejectedToken: string, version: number): Promise<void> {
  if (getSessionVersion() !== version) throw sessionExpired();
  // Another request may already have refreshed this token.
  if (getAccessToken() !== rejectedToken) return;
  if (pendingRefresh?.version === version) return pendingRefresh.promise;
  const credential = getRefreshToken();
  if (!credential) {
    clearAccessToken();
    throw sessionExpired();
  }

  const promise = (async () => {
    try {
      // This API is anonymous, so its failure cannot start another refresh.
      // Load lazily because authApi also uses this HTTP client.
      const { refreshToken } = await import('../../features/auth/authApi');
      const session = await refreshToken(credential);
      if (!updateSessionTokens(session, version)) throw sessionExpired();
    } catch (error) {
      // Temporary network/server errors leave the session available for a later retry.
      if (getSessionVersion() === version
        && (!(error instanceof ApiError) || (error.status > 0 && error.status < 500))) {
        clearAccessToken();
      }
      throw error;
    }
  })();
  const pending = { version, promise };
  pendingRefresh = pending;
  try {
    await promise;
  } finally {
    if (pendingRefresh === pending) pendingRefresh = null;
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return sendRequest<T>(path, options, false, getSessionVersion());
}

async function sendRequest<T>(path: string, options: ApiRequestOptions, retried: boolean, version: number): Promise<T> {
  const { anonymous = false, ...init } = options;
  const headers = new AxiosHeaders(init.headers);
  const token = anonymous ? null : getAccessToken();
  const managedAuth = Boolean(token) && !headers.has('Authorization');

  if (init.signal?.aborted) throw new axios.CanceledError();
  // The backend may return 403 for expired JWTs: renew known expired tokens first.
  if (!retried && managedAuth && token && tokenExpired(token)) {
    await renewSession(token, version);
    return sendRequest<T>(path, options, true, version);
  }
  if (init.data != null && !(init.data instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (getSessionVersion() !== version && !anonymous) throw sessionExpired();
  if (managedAuth) headers.set('Authorization', `Bearer ${token}`);
  let response: AxiosResponse<string>;
  try {
    response = await httpClient.request<string>({
      ...init, url: path, headers, responseType: 'text',
      transformResponse: [(data) => data], validateStatus: () => true,
    });
  } catch (error) {
    if (init.signal?.aborted || axios.isCancel(error)) throw error;
    throw new ApiError(0, 'Không kết nối được máy chủ. Hãy kiểm tra backend và kết nối mạng.');
  }

  if (response.status === 401 && managedAuth && token) {
    if (!retried) {
      await renewSession(token, version);
      // Reuse the same request handling, with refresh disabled on the retry.
      return sendRequest<T>(path, options, true, version);
    }
    if (getSessionVersion() === version && getAccessToken() === token) clearAccessToken();
  }

  const responseOk = response.status >= 200 && response.status < 300;
  let data: unknown;
  try { data = response.data ? JSON.parse(response.data) : undefined; } catch {
    if (responseOk) throw new ApiError(response.status, 'Máy chủ trả về dữ liệu không hợp lệ.');
  }
  if (!responseOk) {
    const serverMessage = data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? data.message : undefined;
    const message = serverMessage || (response.status === 401 ? 'Email hoặc mật khẩu không đúng, hoặc phiên đăng nhập đã hết hạn.'
      : response.status === 403 ? 'Bạn không có quyền truy cập dữ liệu này.'
      : response.status >= 500 ? 'Máy chủ gặp lỗi. Vui lòng thử lại sau.'
      : `Yêu cầu không thành công (${response.status}).`);
    throw new ApiError(response.status, message);
  }

  const methodUpper = (init.method ?? 'GET').toUpperCase();
  if (
    (methodUpper === 'POST' || methodUpper === 'PUT' || methodUpper === 'PATCH' || methodUpper === 'DELETE') &&
    !/^\/?auth\b/i.test(path)
  ) {
    const isSuccessPayload = !data || typeof data !== 'object' || !('success' in data) || Boolean((data as { success?: boolean }).success);
    if (isSuccessPayload && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('mycropdiary:data-changed'));
    }
  }

  return data as T;
}
