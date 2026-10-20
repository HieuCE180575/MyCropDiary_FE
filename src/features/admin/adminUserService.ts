import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import type { PageResponse } from '../farm-management/api';

export interface AdminUserResponse {
  userId: number;
  email: string;
  fullName: string;
  phone: string | null;
  systemRole: string;
  accountStatus: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

async function request<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  const result = await apiRequest<ApiResponse<T>>(path, options);
  if (!result?.success || result.data == null) throw new Error(result?.message || 'Không thể thực hiện yêu cầu.');
  return result.data;
}

export async function getAdminUsers(signal?: AbortSignal): Promise<AdminUserResponse[]> {
  const records: AdminUserResponse[] = [];
  for (let page = 0; ; page++) {
    const data = await request<PageResponse<AdminUserResponse>>(
      `/admin/users?page=${page}&size=100&sort=createdAt,desc&sort=id,desc`,
      { signal }
    );
    if (!Array.isArray(data.items)) throw new Error('Danh sách tài khoản không hợp lệ.');
    records.push(...data.items);
    if (data.last || page + 1 >= data.totalPages) return records;
  }
}

export function updateAdminUserStatus(
  userId: string | number,
  status: 'ACTIVE' | 'LOCKED' | 'PENDING' | string
): Promise<AdminUserResponse> {
  return request<AdminUserResponse>(`/admin/users/${userId}/status`, {
    method: 'PUT',
    data: { status: status.toUpperCase() },
  });
}
