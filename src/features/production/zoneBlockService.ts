import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import type {
  Zone,
  Block,
  BlockConditionObservation,
  StaffZoneAssignment,
  AssignedZoneResp,
  ZoneFormValues,
  BlockFormValues,
  RecordConditionFormValues,
  AssignStaffToZonePayload,
} from './types';

// Helper unpacker
async function request<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  const res = await apiRequest<ApiResponse<T>>(path, options);
  if (!res?.success || res.data === undefined) {
    throw new Error(res?.message || 'Yêu cầu không thành công.');
  }
  return res.data;
}

// ==========================================
// UC-16: Quản lý Phân khu (Zone)
// ==========================================

export async function fetchZonesByFarm(farmId: number, keyword?: string, status?: string): Promise<Zone[]> {
  const params = new URLSearchParams();
  if (keyword?.trim()) params.append('keyword', keyword.trim());
  if (status && status !== 'all') params.append('status', status);
  const query = params.toString() ? `?${params.toString()}` : '';
  const list = await request<Zone[]>(`/farms/${farmId}/zones${query}`);
  return list.map(mapZoneFields);
}

export async function fetchAssignedZones(farmId: number): Promise<AssignedZoneResp[]> {
  return request<AssignedZoneResp[]>(`/farms/${farmId}/zones/assigned`);
}

export async function fetchZoneById(zoneId: number): Promise<Zone> {
  const zone = await request<Zone>(`/zones/${zoneId}`);
  return mapZoneFields(zone);
}

export async function createZone(farmId: number, values: ZoneFormValues): Promise<Zone> {
  const payload = {
    zoneName: values.zoneName.trim(),
    areaValue: parseFloat(values.areaValue) || 0,
    areaUnit: values.areaUnit || 'm2',
    description: values.description?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
  };
  const created = await request<Zone>(`/farms/${farmId}/zones`, {
    method: 'POST',
    data: payload,
  });
  return mapZoneFields(created);
}

export async function updateZone(zoneId: number, values: ZoneFormValues): Promise<Zone> {
  const payload = {
    zoneName: values.zoneName.trim(),
    areaValue: parseFloat(values.areaValue) || 0,
    areaUnit: values.areaUnit || 'm2',
    description: values.description?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
  };
  const updated = await request<Zone>(`/zones/${zoneId}`, {
    method: 'PUT',
    data: payload,
  });
  return mapZoneFields(updated);
}

export async function deleteZone(zoneId: number): Promise<void> {
  await request<void>(`/zones/${zoneId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// UC-17: Quản lý Lô / Thửa đất (Block)
// ==========================================

export async function fetchBlocks(farmId: number, zoneId?: number, status?: string, keyword?: string): Promise<Block[]> {
  const params = new URLSearchParams();
  params.append('farmId', String(farmId));
  if (zoneId) params.append('zoneId', String(zoneId));
  if (status && status !== 'all') params.append('status', status);
  if (keyword?.trim()) params.append('keyword', keyword.trim());
  return request<Block[]>(`/blocks?${params.toString()}`);
}

export async function fetchBlockById(blockId: number, signal?: AbortSignal): Promise<Block> {
  return await request<Block>(`/blocks/${blockId}`, { signal });
}

export async function createBlock(zoneId: number, values: BlockFormValues): Promise<Block> {
  const payload = {
    blockName: values.blockName.trim(),
    areaValue: parseFloat(values.areaValue) || 0,
    areaUnit: values.areaUnit || 'm2',
    soilType: values.soilType?.trim() || null,
    description: values.description?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
    latitude: values.latitude ? parseFloat(values.latitude) : null,
    longitude: values.longitude ? parseFloat(values.longitude) : null,
    status: values.status || 'AVAILABLE',
  };
  return await request<Block>(`/zones/${zoneId}/blocks`, {
    method: 'POST',
    data: payload,
  });
}

export async function updateBlock(blockId: number, values: BlockFormValues): Promise<Block> {
  const payload = {
    blockName: values.blockName.trim(),
    areaValue: parseFloat(values.areaValue) || 0,
    areaUnit: values.areaUnit || 'm2',
    soilType: values.soilType?.trim() || null,
    description: values.description?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
    latitude: values.latitude ? parseFloat(values.latitude) : null,
    longitude: values.longitude ? parseFloat(values.longitude) : null,
    status: values.status || 'AVAILABLE',
  };
  return await request<Block>(`/blocks/${blockId}`, {
    method: 'PUT',
    data: payload,
  });
}

export async function deleteBlock(blockId: number): Promise<void> {
  await request<void>(`/blocks/${blockId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// UC-17.4: Ghi nhận tình trạng lô đất (Record Block Condition)
// ==========================================

export async function recordBlockCondition(blockId: number, values: RecordConditionFormValues): Promise<BlockConditionObservation> {
  const payload = {
    conditionType: values.conditionType.trim(),
    description: values.description.trim(),
    imageUrl: values.imageUrl?.trim() || null,
    observedAt: values.observedAt || new Date().toISOString(),
  };
  return await request<BlockConditionObservation>(`/blocks/${blockId}/conditions`, {
    method: 'POST',
    data: payload,
  });
}

export async function fetchBlockConditions(blockId: number): Promise<BlockConditionObservation[]> {
  return request<BlockConditionObservation[]>(`/blocks/${blockId}/conditions`);
}

// ==========================================
// UC-35: Phân công nhân viên vào Zone
// ==========================================

export async function fetchZoneAssignments(farmId: number, zoneId?: number): Promise<StaffZoneAssignment[]> {
  const url = zoneId ? `/farms/${farmId}/zone-assignments?zoneId=${zoneId}` : `/farms/${farmId}/zone-assignments`;
  return request<StaffZoneAssignment[]>(url);
}

export async function assignStaffToZone(farmId: number, zoneId: number, values: AssignStaffToZonePayload): Promise<StaffZoneAssignment> {
  const payload = {
    farmMemberId: Number(values.farmMemberId),
    zoneId: zoneId,
    assignedAt: values.assignedAt || new Date().toISOString(),
    endedAt: values.endedAt || null,
  };
  return await request<StaffZoneAssignment>(`/farms/${farmId}/zone-assignments`, {
    method: 'POST',
    data: payload,
  });
}

export async function unassignStaffFromZone(farmId: number, assignmentId: number): Promise<void> {
  await request<void>(`/farms/${farmId}/zone-assignments/${assignmentId}`, {
    method: 'DELETE',
  });
}

// --- Mapping for the existing production-area components ---

function mapZoneFields(z: Zone): Zone {
  return {
    ...z,
    productionAreaId: String(z.zoneId),
    areaCode: `ZN-${String(z.zoneId).padStart(3, '0')}`,
    areaName: z.zoneName,
    areaHectares: z.areaUnit === 'ha' ? z.areaValue : Number((z.areaValue / 10000).toFixed(2)),
    locationDescription: z.description || undefined,
  };
}
