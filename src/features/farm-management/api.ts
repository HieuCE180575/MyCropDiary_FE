import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export interface FarmSummary {
  id: number;
  farmCode: string;
  farmName: string;
  province: string | null;
  district: string | null;
  totalAreaM2: number | null;
  currentUserRole: string | null;
  status: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export async function getFarms(signal?: AbortSignal, page = 0) {
  const result = await apiRequest<ApiResponse<PageResponse<FarmSummary>>>(`/farms?page=${page}&size=12`, { signal });
  if (!result?.success || !Array.isArray(result.data?.items)) throw new Error('Không tải được danh sách trang trại.');
  return result.data;
}

export async function getModules(signal?: AbortSignal) {
  const result = await apiRequest<ApiResponse<string[]>>('/modules', { signal });
  if (!result.success || !Array.isArray(result.data)) throw new Error('Không tải được danh sách module.');
  return result.data;
}

export interface FarmDetail {
  id: number;
  farmName: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  boundaryCoordinates?: string | null;
  coverImageUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  currentUserRole: string | null;
}

export interface CreateFarmPayload {
  farmName: string;
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  boundaryCoordinates?: string | null;
  coverImageUrl?: string;
}

export interface UpdateFarmPayload {
  farmName?: string;
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  boundaryCoordinates?: string | null;
  coverImageUrl?: string;
  status?: string;
}

export interface FarmMemberItem {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  role: string;
  farmRole?: string;
  jobTitle?: string | null;
  status: string;
  joinedAt: string;
  activeAssignmentCount?: number;
}

export interface ZoneItem {
  zoneId: number;
  farmId: number;
  zoneName: string;
  areaValue: number | null;
  areaUnit: string | null;
  description: string | null;
  imageUrl: string | null;
  status: string;
  createdAt: string;
}

export async function getFarmById(farmId: number, signal?: AbortSignal): Promise<FarmDetail> {
  const result = await apiRequest<ApiResponse<FarmDetail>>(`/farms/${farmId}`, { signal });
  if (!result?.success || !result.data) throw new Error('Không lấy được thông tin chi tiết trang trại.');
  return result.data;
}

export async function createFarm(payload: CreateFarmPayload): Promise<FarmDetail> {
  const result = await apiRequest<ApiResponse<FarmDetail>>('/farms', {
    method: 'POST',
    data: payload,
  });
  if (!result?.success || !result.data) throw new Error(result?.message || 'Không tạo được trang trại mới.');
  return result.data;
}

export async function updateFarm(farmId: number, payload: UpdateFarmPayload): Promise<FarmDetail> {
  const result = await apiRequest<ApiResponse<FarmDetail>>(`/farms/${farmId}`, {
    method: 'PUT',
    data: payload,
  });
  if (!result?.success || !result.data) throw new Error(result?.message || 'Không cập nhật được thông tin trang trại.');
  return result.data;
}

export async function getFarmMembers(farmId: number): Promise<FarmMemberItem[]> {
  const result = await apiRequest<ApiResponse<FarmMemberItem[]>>(`/farms/${farmId}/members/staff?status=active`).catch(
    () => apiRequest<ApiResponse<FarmMemberItem[]>>(`/farms/${farmId}/members`)
  );
  const items = result?.data ?? [];
  return items.map((m) => ({
    ...m,
    role: m.jobTitle || (m.farmRole?.toUpperCase() === 'OWNER' ? 'Chủ trang trại' : m.role || 'Nhân viên kỹ thuật'),
  }));
}

export async function addFarmMember(farmId: number, payload: { email: string; role: string }): Promise<FarmMemberItem> {
  const result = await apiRequest<ApiResponse<FarmMemberItem>>(`/farms/${farmId}/members/staff`, {
    method: 'POST',
    data: {
      email: payload.email,
      farmRole: payload.role?.toLowerCase() === 'owner' ? 'owner' : 'staff',
      jobTitle: payload.role,
    },
  });
  if (!result?.success || !result.data) throw new Error(result?.message || 'Không thêm được thành viên.');
  return result.data;
}

export async function removeFarmMember(farmId: number, memberId: number): Promise<void> {
  await apiRequest<ApiResponse<void>>(`/farms/${farmId}/members/${memberId}/deactivate`, {
    method: 'PATCH',
  });
}

export async function getFarmZones(farmId: number): Promise<ZoneItem[]> {
  const result = await apiRequest<ApiResponse<ZoneItem[]>>(`/farms/${farmId}/zones`);
  return result?.data ?? [];
}

export async function createFarmZone(farmId: number, payload: { zoneName: string; areaValue?: number; areaUnit?: string; description?: string }): Promise<ZoneItem> {
  const result = await apiRequest<ApiResponse<ZoneItem>>(`/farms/${farmId}/zones`, {
    method: 'POST',
    data: payload,
  });
  if (!result?.success || !result.data) throw new Error(result?.message || 'Không tạo được vùng sản xuất mới.');
  return result.data;
}
