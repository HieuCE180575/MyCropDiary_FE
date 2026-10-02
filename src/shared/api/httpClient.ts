import { clearAccessToken, getAccessToken } from '../../features/auth/authStorage';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, options: RequestInit & { anonymous?: boolean } = {}): Promise<T> {
  const { anonymous = false, ...init } = options;
  const token = anonymous ? null : getAccessToken();
  // This backend can return 403 for expired JWTs; detect expiry before sending.
  let expired = false;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      expired = typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch { /* Let the backend validate tokens with an unreadable payload. */ }
  }
  if (expired) {
    clearAccessToken();
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, 'Không kết nối được máy chủ. Hãy kiểm tra backend và kết nối mạng.');
  }

  if (response.status === 401) {
    if (token && headers.get('Authorization') === `Bearer ${token}` && getAccessToken() === token) clearAccessToken();
  }

  const body = await response.text();
  let data: unknown;
  try { data = body ? JSON.parse(body) : undefined; } catch {
    if (response.ok) throw new ApiError(response.status, 'Máy chủ trả về dữ liệu không hợp lệ.');
  }
  if (!response.ok) {
    const serverMessage = data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? data.message : undefined;
    const message = (response.status < 500 && serverMessage) || (response.status === 401 ? 'Email hoặc mật khẩu không đúng, hoặc phiên đăng nhập đã hết hạn.'
      : response.status === 403 ? 'Bạn không có quyền truy cập dữ liệu này.'
      : response.status >= 500 ? 'Máy chủ gặp lỗi. Vui lòng thử lại sau.'
      : `Yêu cầu không thành công (${response.status}).`);
    throw new ApiError(response.status, message);
  }
  return data as T;
}
