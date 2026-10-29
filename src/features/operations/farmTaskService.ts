import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export interface TaskWorkerResp {
  workerId: number;
  workerCode?: string | null;
  fullName: string;
  phoneNumber?: string | null;
  jobTitle?: string | null;
  assignmentStatus?: string | null;
}

export interface FarmTaskResp {
  taskId: number;
  farmId: number;
  farmName?: string | null;
  cropSeasonId?: number | null;
  seasonName?: string | null;
  zoneId?: number | null;
  zoneName?: string | null;
  blockId?: number | null;
  blockName?: string | null;
  taskName: string;
  description?: string | null;
  taskType?: string | null;
  priority: 'urgent' | 'high' | 'normal' | 'low' | string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | string;
  startsAt?: string | null;
  dueAt?: string | null;
  createdByUserId?: number | null;
  createdByFullName?: string | null;
  assignees?: TaskWorkerResp[];
  createdAt?: string | null;
}

export interface CreateFarmTaskReq {
  taskName: string;
  taskType?: string;
  priority?: string;
  status?: string;
  cropSeasonId?: number | null;
  zoneId?: number | null;
  blockId?: number | null;
  assignedWorkerIds?: number[];
  startsAt?: string | null;
  dueAt?: string | null;
  description?: string | null;
}

export interface UpdateFarmTaskReq {
  taskName: string;
  taskType?: string;
  priority?: string;
  status?: string;
  cropSeasonId?: number | null;
  zoneId?: number | null;
  blockId?: number | null;
  assignedWorkerIds?: number[];
  startsAt?: string | null;
  dueAt?: string | null;
  description?: string | null;
}

export interface FarmTaskPageResp {
  items: FarmTaskResp[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export async function fetchFarmTasks(
  farmId: number,
  params?: {
    cropSeasonId?: number;
    zoneId?: number;
    status?: string;
    priority?: string;
    keyword?: string;
    page?: number;
    size?: number;
  },
  signal?: AbortSignal
): Promise<FarmTaskPageResp> {
  const query = new URLSearchParams();
  if (params?.cropSeasonId) query.append('cropSeasonId', String(params.cropSeasonId));
  if (params?.zoneId) query.append('zoneId', String(params.zoneId));
  if (params?.status && params.status !== 'all') query.append('status', params.status);
  if (params?.priority && params.priority !== 'all') query.append('priority', params.priority);
  if (params?.keyword?.trim()) query.append('keyword', params.keyword.trim());
  if (params?.page !== undefined) query.append('page', String(params.page));
  query.append('size', String(params?.size ?? 50));

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await apiRequest<ApiResponse<FarmTaskPageResp>>(`/farms/${farmId}/tasks${qs}`, { signal });
  if (!res?.success || !res.data) {
    throw new Error(res?.message || 'Không thể tải danh sách công việc.');
  }
  return res.data;
}

export async function fetchTaskDetail(taskId: number, signal?: AbortSignal): Promise<FarmTaskResp> {
  const res = await apiRequest<ApiResponse<FarmTaskResp>>(`/tasks/${taskId}`, { signal });
  if (!res?.success || !res.data) {
    throw new Error(res?.message || 'Không thể tải chi tiết công việc.');
  }
  return res.data;
}

export async function createFarmTask(
  farmId: number,
  payload: CreateFarmTaskReq,
  signal?: AbortSignal
): Promise<FarmTaskResp> {
  const res = await apiRequest<ApiResponse<FarmTaskResp>>(`/farms/${farmId}/tasks`, {
    method: 'POST',
    data: payload,
    signal,
  });
  if (!res?.success || !res.data) {
    throw new Error(res?.message || 'Không thể tạo công việc mới.');
  }
  return res.data;
}

export async function updateFarmTask(
  taskId: number,
  payload: UpdateFarmTaskReq,
  signal?: AbortSignal
): Promise<FarmTaskResp> {
  const res = await apiRequest<ApiResponse<FarmTaskResp>>(`/tasks/${taskId}`, {
    method: 'PUT',
    data: payload,
    signal,
  });
  if (!res?.success || !res.data) {
    throw new Error(res?.message || 'Không thể cập nhật công việc.');
  }
  return res.data;
}

export async function updateFarmTaskStatus(
  taskId: number,
  status: string,
  signal?: AbortSignal
): Promise<FarmTaskResp> {
  const res = await apiRequest<ApiResponse<FarmTaskResp>>(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    data: { status },
    signal,
  });
  if (!res?.success || !res.data) {
    throw new Error(res?.message || 'Không thể cập nhật trạng thái công việc.');
  }
  return res.data;
}

export async function deleteFarmTask(taskId: number, signal?: AbortSignal): Promise<void> {
  const res = await apiRequest<ApiResponse<void>>(`/tasks/${taskId}`, {
    method: 'DELETE',
    signal,
  });
  if (!res?.success) {
    throw new Error(res?.message || 'Không thể xóa công việc.');
  }
}
