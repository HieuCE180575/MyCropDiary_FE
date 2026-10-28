import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import type { PageResponse } from './api';
import type { FarmRegistration, FarmRegistrationFormValues, FarmRegistrationStatus } from './types';

export interface RegistrationResponse {
  registrationId: number;
  farmName: string;
  addressLine: string;
  description: string | null;
  status: string;
  submittedAt: string;
  handledAt: string | null;
  rejectionReason: string | null;
  applicantFullName?: string | null;
  applicantEmail?: string | null;
  handlerFullName?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  documentUrl?: string | null;
}

async function request<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  const result = await apiRequest<ApiResponse<T>>(path, options);
  if (!result?.success || result.data == null) throw new Error(result?.message || 'Không tải được hồ sơ đăng ký.');
  return result.data;
}

function toRegistration(data: RegistrationResponse): FarmRegistration {
  return {
    farmRegistrationId: String(data.registrationId),
    proposedFarmName: data.farmName,
    address: data.addressLine,
    province: data.province ?? undefined,
    district: data.district ?? undefined,
    ward: data.ward ?? undefined,
    documentUrl: data.documentUrl ?? undefined,
    description: data.description ?? undefined,
    status: data.status.toLowerCase() as FarmRegistrationStatus,
    submittedAt: data.submittedAt,
    reviewedAt: data.handledAt ?? undefined,
    reviewComment: data.status.toUpperCase() === 'REJECTED' ? data.rejectionReason ?? undefined : undefined,
  };
}

export async function fetchMyLatestRegistration(signal?: AbortSignal): Promise<FarmRegistration | null> {
  const page = await request<PageResponse<RegistrationResponse>>('/farm-registrations?page=0&size=1&sort=createdAt,desc&sort=id,desc', { signal });
  if (!Array.isArray(page.items)) throw new Error('Danh sách hồ sơ không hợp lệ.');
  if (!page.items.length) return null;
  return toRegistration(await request<RegistrationResponse>(`/farm-registrations/${page.items[0].registrationId}`, { signal }));
}

export async function submitFarmRegistration(values: FarmRegistrationFormValues): Promise<FarmRegistration> {
  return toRegistration(await request<RegistrationResponse>('/farm-registrations', {
    method: 'POST',
    data: {
      farmName: values.proposedFarmName.trim(), addressLine: values.address.trim(),
      province: values.province?.trim() || null, district: values.district?.trim() || null,
      ward: values.ward?.trim() || null, description: values.description.trim() || null,
      documentUrl: values.documentUrl?.trim() || null,
    },
  }));
}

export async function cancelFarmRegistration(registrationId: string): Promise<FarmRegistration> {
  return toRegistration(await request<RegistrationResponse>(`/farm-registrations/${registrationId}/cancel`, { method: 'PATCH' }));
}

export async function getAdminRegistrations(signal?: AbortSignal): Promise<RegistrationResponse[]> {
  const records: RegistrationResponse[] = [];
  for (let page = 0; ; page++) {
    const data = await request<PageResponse<RegistrationResponse>>(`/admin/farm-registrations?page=${page}&size=100&sort=createdAt,desc&sort=id,desc`, { signal });
    if (!Array.isArray(data.items)) throw new Error('Danh sách hồ sơ không hợp lệ.');
    records.push(...data.items);
    if (data.last || page + 1 >= data.totalPages) return records;
  }
}

export function getAdminRegistrationById(id: string, signal?: AbortSignal): Promise<RegistrationResponse> {
  return request<RegistrationResponse>(`/admin/farm-registrations/${id}`, { signal });
}

export function handleFarmRegistration(id: string, action: 'APPROVED' | 'REJECTED', reason: string) {
  if (action === 'REJECTED' && !reason.trim()) throw new Error('Vui lòng nhập lý do từ chối.');
  return request<RegistrationResponse>(`/admin/farm-registrations/${id}/handle`, {
    method: 'PUT', data: { action, rejectionReason: action === 'REJECTED' ? reason.trim() : null },
  });
}
