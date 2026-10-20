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
  try {
    const params = new URLSearchParams();
    if (keyword?.trim()) params.append('keyword', keyword.trim());
    if (status && status !== 'all') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';

    const list = await request<Zone[]>(`/farms/${farmId}/zones${query}`);
    return list.map(mapZoneFields);
  } catch {
    return getMockZones(farmId);
  }
}

export async function fetchAssignedZones(farmId: number): Promise<AssignedZoneResp[]> {
  try {
    return await request<AssignedZoneResp[]>(`/farms/${farmId}/zones/assigned`);
  } catch {
    return [];
  }
}

export async function fetchZoneById(zoneId: number): Promise<Zone> {
  try {
    const zone = await request<Zone>(`/zones/${zoneId}`);
    return mapZoneFields(zone);
  } catch {
    const mock = getMockZones(1).find((z) => z.zoneId === zoneId) || getMockZones(1)[0];
    return mapZoneFields(mock);
  }
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
  try {
    const params = new URLSearchParams();
    params.append('farmId', String(farmId));
    if (zoneId) params.append('zoneId', String(zoneId));
    if (status && status !== 'all') params.append('status', status);
    if (keyword?.trim()) params.append('keyword', keyword.trim());

    return await request<Block[]>(`/blocks?${params.toString()}`);
  } catch {
    return getMockBlocks(zoneId);
  }
}

export async function fetchBlockById(blockId: number): Promise<Block> {
  return await request<Block>(`/blocks/${blockId}`);
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
  try {
    return await request<BlockConditionObservation[]>(`/blocks/${blockId}/conditions`);
  } catch {
    return getMockConditions(blockId);
  }
}

// ==========================================
// UC-35: Phân công nhân viên vào Zone
// ==========================================

export async function fetchZoneAssignments(farmId: number, zoneId?: number): Promise<StaffZoneAssignment[]> {
  try {
    const url = zoneId ? `/farms/${farmId}/zone-assignments?zoneId=${zoneId}` : `/farms/${farmId}/zone-assignments`;
    return await request<StaffZoneAssignment[]>(url);
  } catch {
    return [];
  }
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

// --- Helper Functions & Fallbacks ---

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

function getMockZones(farmId: number): Zone[] {
  return [
    {
      zoneId: 1,
      farmId: farmId || 1,
      zoneName: 'Phân khu A - Dưa lưới công nghệ cao',
      areaValue: 8500,
      areaUnit: 'm2',
      description: 'Nhà màng kính thông minh Israel, hệ thống tưới nhỏ giọt tự động bù áp.',
      imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=600&q=80',
      status: 'active',
      createdAt: '2026-01-10T08:00:00Z',
      totalBlocks: 3,
    },
    {
      zoneId: 2,
      farmId: farmId || 1,
      zoneName: 'Phân khu B - Cà chua bi Cherry Nova',
      areaValue: 6200,
      areaUnit: 'm2',
      description: 'Khu trồng rau quả VietGAP hướng hữu cơ, sử dụng giá thể xơ dừa lên men vi sinh.',
      imageUrl: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=600&q=80',
      status: 'active',
      createdAt: '2026-02-15T09:30:00Z',
      totalBlocks: 2,
    },
    {
      zoneId: 3,
      farmId: farmId || 1,
      zoneName: 'Phân khu C - Rau thủy canh & Cây gia vị',
      areaValue: 4000,
      areaUnit: 'm2',
      description: 'Hệ thống giàn NFT tuần hoàn khép kín, kiểm soát dinh dưỡng EC và pH tự động.',
      imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
      status: 'active',
      createdAt: '2026-03-01T10:00:00Z',
      totalBlocks: 2,
    },
  ];
}

function getMockBlocks(zoneId?: number): Block[] {
  const allBlocks: Block[] = [
    {
      blockId: 101,
      zoneId: 1,
      zoneName: 'Phân khu A - Dưa lưới công nghệ cao',
      blockName: 'Lô A1 - Thửa đất giàn 1',
      areaValue: 2800,
      areaUnit: 'm2',
      soilType: 'Đất phù sa bồi tụ',
      description: 'Lô thử nghiệm giống dưa lưới Inthanon RZ chuẩn GlobalGAP.',
      imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=500&q=80',
      status: 'AVAILABLE',
      latitude: 10.762622,
      longitude: 106.660172,
      createdAt: '2026-01-12T08:00:00Z',
    },
    {
      blockId: 102,
      zoneId: 1,
      zoneName: 'Phân khu A - Dưa lưới công nghệ cao',
      blockName: 'Lô A2 - Thửa đất giàn 2',
      areaValue: 3000,
      areaUnit: 'm2',
      soilType: 'Giá thể xơ dừa cao cấp',
      description: 'Lô chính sản xuất phục vụ thị trường siêu thị TP.HCM.',
      imageUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=500&q=80',
      status: 'AVAILABLE',
      latitude: 10.763100,
      longitude: 106.660900,
      createdAt: '2026-01-12T08:30:00Z',
    },
    {
      blockId: 103,
      zoneId: 1,
      zoneName: 'Phân khu A - Dưa lưới công nghệ cao',
      blockName: 'Lô A3 - Vườn ươm cây con',
      areaValue: 2700,
      areaUnit: 'm2',
      soilType: 'Mụn dừa trộn phân trùn quế',
      description: 'Khu vực ươm hạt giống và nuôi cây non 14 ngày đầu.',
      imageUrl: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=500&q=80',
      status: 'AVAILABLE',
      createdAt: '2026-01-15T09:00:00Z',
    },
    {
      blockId: 201,
      zoneId: 2,
      zoneName: 'Phân khu B - Cà chua bi Cherry Nova',
      blockName: 'Lô B1 - Thửa đất ngoài trời phủ bạt',
      areaValue: 3200,
      areaUnit: 'm2',
      soilType: 'Đất thịt pha cát hữu cơ',
      description: 'Cà chua Nova giống F1 chống chịu bệnh héo xanh.',
      imageUrl: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=500&q=80',
      status: 'AVAILABLE',
      createdAt: '2026-02-16T10:00:00Z',
    },
    {
      blockId: 202,
      zoneId: 2,
      zoneName: 'Phân khu B - Cà chua bi Cherry Nova',
      blockName: 'Lô B2 - Thửa đất nhà lưới',
      areaValue: 3000,
      areaUnit: 'm2',
      soilType: 'Đất phù sa màu mỡ',
      description: 'Khu vực ứng dụng phân bón lá sinh học Neem Chitosan.',
      imageUrl: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=500&q=80',
      status: 'AVAILABLE',
      createdAt: '2026-02-18T11:00:00Z',
    },
  ];

  return zoneId ? allBlocks.filter((b) => b.zoneId === zoneId) : allBlocks;
}

function getMockConditions(blockId: number): BlockConditionObservation[] {
  return [
    {
      observationId: 1,
      blockId: blockId,
      conditionType: 'Cây sinh trưởng tốt',
      description: 'Cây phát triển đồng đều, chiều cao đạt 45cm, bộ rễ khỏe mạnh không có biểu hiện sâu đục thân.',
      imageUrl: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=500&q=80',
      observedAt: '2026-03-20T08:30:00Z',
      recorderFullName: 'Nguyễn Văn Kỹ Thuật',
    },
    {
      observationId: 2,
      blockId: blockId,
      conditionType: 'Độ ẩm thấp / Khô hạn',
      description: 'Thời tiết nắng nóng kéo dài, độ ẩm đất giảm xuống dưới 55%. Đã tăng cường chu kỳ tưới nhỏ giọt thêm 15 phút vào buổi chiều.',
      imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=500&q=80',
      observedAt: '2026-03-18T14:15:00Z',
      recorderFullName: 'Trần Thị Nông Học',
    },
  ];
}
