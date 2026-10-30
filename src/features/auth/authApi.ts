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

export interface GoogleAuthRequest {
  idToken?: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

export async function authenticateWithGoogle(payload: GoogleAuthRequest): Promise<AuthSession> {
  const result = await apiRequest<ApiResponse<AuthResponse>>('/auth/google', {
    method: 'POST',
    anonymous: true,
    data: payload,
  });
  return readAuthSession(result);
}

export async function authenticate(email: string, password: string): Promise<AuthSession> {
  if (!email.trim() || !password) throw new Error('Vui lòng nhập email và mật khẩu.');
  const result = await apiRequest<ApiResponse<AuthResponse>>('/auth/login', {
    method: 'POST',
    data: { email: email.trim(), password },
    anonymous: true,
  });
  return readAuthSession(result);
}

function readAuthSession(result: ApiResponse<AuthResponse>): AuthSession {
  if (!result?.success || !result.data || typeof result.data.accessToken !== 'string'
    || !result.data.accessToken.trim() || result.data.tokenType !== 'Bearer') {
    throw new Error('Không xác minh được đăng nhập: máy chủ chưa trả về access token hợp lệ.');
  }
  const { accessToken, refreshToken, userId, email, fullName, systemRole } = result.data;
  const normalizedRole = (systemRole || 'USER').trim().toUpperCase();
  return { accessToken, refreshToken, user: { userId, email, fullName, systemRole: normalizedRole } };
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
    data: {
      ...request,
      fullName: request.fullName.trim(),
      email: request.email.trim(),
      phoneNumber: request.phoneNumber?.trim() || null,
    },
  });
  if (!result?.success) throw new Error(result?.message || 'Không đăng ký được tài khoản.');
}

export async function verifyOtp(email: string, otp: string): Promise<AuthSession> {
  const result = await apiRequest<ApiResponse<AuthResponse>>('/auth/verify-otp', {
    method: 'POST',
    anonymous: true,
    data: {
      email: email.trim(),
      otp: otp.trim(),
    },
  });
  return readAuthSession(result);
}

export async function resendOtp(email: string): Promise<void> {
  const result = await apiRequest<ApiResponse<{ email: string }>>(`/auth/resend-otp?email=${encodeURIComponent(email.trim())}`, {
    method: 'POST', anonymous: true,
  });
  if (!result?.success) throw new Error(result?.message || 'Không gửi lại được mã OTP.');
}

export async function forgotPassword(email: string): Promise<void> {
  const result = await apiRequest<ApiResponse<unknown>>('/auth/forgot-password', {
    method: 'POST', anonymous: true,
    data: { email: email.trim() },
  });
  if (!result?.success) throw new Error(result?.message || 'Không gửi được mã đặt lại mật khẩu.');
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  const result = await apiRequest<ApiResponse<unknown>>('/auth/reset-password', {
    method: 'POST', anonymous: true,
    data: { email: email.trim(), otp: otp.trim(), newPassword },
  });
  if (!result?.success) throw new Error(result?.message || 'Không đặt lại được mật khẩu.');
}

export async function refreshToken(token: string): Promise<AuthSession> {
  const result = await apiRequest<ApiResponse<AuthResponse>>('/auth/refresh-token', {
    method: 'POST',
    anonymous: true,
    data: { refreshToken: token },
  });
  return readAuthSession(result);
}

export async function logoutUser(token?: string): Promise<void> {
  if (token) {
    try {
      await apiRequest<ApiResponse<void>>('/auth/logout', {
        method: 'POST',
        anonymous: true,
        data: { refreshToken: token },
      });
    } catch {
      // ignore silent logout network errors
    }
  }
}

export interface UserProfile {
  userId: number;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  systemRole: string;
  accountStatus: string;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpdateProfileRequest {
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function getUserProfile(): Promise<UserProfile> {
  const result = await apiRequest<ApiResponse<UserProfile>>('/user/profile', {
    method: 'GET',
  });
  if (!result?.success || !result.data) {
    throw new Error(result?.message || 'Không thể tải thông tin cá nhân.');
  }
  return result.data;
}

export async function updateUserProfile(request: UpdateProfileRequest): Promise<UserProfile> {
  const result = await apiRequest<ApiResponse<UserProfile>>('/user/profile', {
    method: 'PUT',
    data: {
      fullName: request.fullName.trim(),
      phone: request.phone?.trim() || null,
      avatarUrl: request.avatarUrl?.trim() || null,
    },
  });
  if (!result?.success || !result.data) {
    throw new Error(result?.message || 'Cập nhật thông tin thất bại.');
  }
  return result.data;
}

export async function changeUserPassword(request: ChangePasswordRequest): Promise<void> {
  const result = await apiRequest<ApiResponse<void>>('/user/change-password', {
    method: 'POST',
    data: request,
  });
  if (!result?.success) {
    throw new Error(result?.message || 'Đổi mật khẩu thất bại.');
  }
}
