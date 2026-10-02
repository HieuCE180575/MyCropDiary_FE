import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import type { AuthSession } from './authStorage';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  email: string;
  fullName: string;
  systemRole: string;
}

export async function authenticate(email: string, password: string): Promise<AuthSession> {
  if (!email.trim() || !password) throw new Error('Vui lòng nhập email và mật khẩu.');
  const result = await apiRequest<ApiResponse<AuthResponse>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
    anonymous: true,
  });
  return readAuthSession(result);
}

function readAuthSession(result: ApiResponse<AuthResponse>): AuthSession {
  if (!result?.success || !result.data || typeof result.data.accessToken !== 'string'
      || !result.data.accessToken.trim() || result.data.tokenType !== 'Bearer') {
    throw new Error('Không xác minh được đăng nhập: máy chủ chưa trả về access token hợp lệ.');
  }
  const { accessToken, userId, email, fullName, systemRole } = result.data;
  return { accessToken, user: { userId, email, fullName, systemRole } };
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
  password: string;
}

export async function registerAccount(request: RegisterRequest): Promise<void> {
  const result = await apiRequest<ApiResponse<{ email: string }>>('/auth/register', {
    method: 'POST', anonymous: true,
    body: JSON.stringify({ ...request, fullName: request.fullName.trim(), email: request.email.trim(), phoneNumber: request.phoneNumber?.trim() || null }),
  });
  if (!result?.success) throw new Error(result?.message || 'Không đăng ký được tài khoản.');
}

export async function verifyOtp(email: string, otp: string): Promise<AuthSession> {
  const result = await apiRequest<ApiResponse<AuthResponse>>('/auth/verify-otp', {
    method: 'POST', anonymous: true, body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
  });
  return readAuthSession(result);
}

export async function resendOtp(email: string): Promise<void> {
  const result = await apiRequest<ApiResponse<{ email: string }>>(`/auth/resend-otp?email=${encodeURIComponent(email.trim())}`, {
    method: 'POST', anonymous: true,
  });
  if (!result?.success) throw new Error(result?.message || 'Không gửi lại được mã OTP.');
}
