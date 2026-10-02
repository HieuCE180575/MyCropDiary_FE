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
