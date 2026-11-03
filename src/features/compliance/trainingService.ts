import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export interface TrainingAttendeeResp {
  farmWorkerId: number | null;
  workerCode: string | null;
  fullName: string | null;
  jobTitle: string | null;
  attendanceStatus: string | null;
  notes: string | null;
}

export interface TrainingRecordResp {
  trainingRecordId: number;
  farmId: number;
  farmName: string;
  organizedByMemberId: number | null;
  organizerName: string | null;
  trainingTitle: string;
  description: string | null;
  trainingDate: string;
  imageUrl: string | null;
  attendeeCount: number;
  attendees?: TrainingAttendeeResp[];
  createdAt: string;
}

export interface CreateTrainingRecordPayload {
  trainingTitle: string;
  description?: string;
  trainingDate: string;
  imageUrl?: string;
  organizedByMemberId?: number;
  attendees?: {
    farmWorkerId: number;
    attendanceStatus?: string;
    notes?: string;
  }[];
}

export interface TrainingPageResp {
  items: TrainingRecordResp[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function fetchTrainingHistoryApi(
  farmId: number,
  params?: { keyword?: string; fromDate?: string; toDate?: string; page?: number; size?: number }
): Promise<TrainingPageResp> {
  const query = new URLSearchParams();
  if (params?.keyword) query.set('keyword', params.keyword);
  if (params?.fromDate) query.set('fromDate', params.fromDate);
  if (params?.toDate) query.set('toDate', params.toDate);
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.size !== undefined) query.set('size', String(params.size));

  const qs = query.toString();
  const url = `/farms/${farmId}/training-records${qs ? `?${qs}` : ''}`;
  const res = await apiRequest<ApiResponse<TrainingPageResp>>(url);
  return res.data;
}

export async function fetchTrainingDetailsApi(id: number): Promise<TrainingRecordResp> {
  const res = await apiRequest<ApiResponse<TrainingRecordResp>>(`/training-records/${id}`);
  return res.data;
}

export async function createTrainingRecordApi(
  farmId: number,
  payload: CreateTrainingRecordPayload
): Promise<TrainingRecordResp> {
  const res = await apiRequest<ApiResponse<TrainingRecordResp>>(`/farms/${farmId}/training-records`, {
    method: 'POST',
    data: payload,
  });
  return res.data;
}

export async function deleteTrainingRecordApi(id: number): Promise<void> {
  await apiRequest<ApiResponse<void>>(`/training-records/${id}`, {
    method: 'DELETE',
  });
}

