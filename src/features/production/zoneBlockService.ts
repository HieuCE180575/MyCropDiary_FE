import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { notifyDataChanged } from '../../shared/realtime/realtimeBus';
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
  RiskAssessmentRecord,
  SoilAssessmentRecord,
  WaterAssessmentRecord,
} from './types';

// Helper unpacker
async function request<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  const res = await apiRequest<ApiResponse<T>>(path, options);
  if (!res?.success || res.data === undefined) {
    throw new Error(res?.message || 'Yêu cầu không thành công.');
  }
  return res.data;
}

interface BackendAssignmentResp {
  id?: number;
  assignmentId?: number;
  farmMemberId: number;
  userId?: number | null;
  staffName?: string | null;
  staffEmail?: string | null;
  staffJobTitle?: string | null;
  jobTitle?: string | null;
  zoneId: number;
  zoneName?: string | null;
  assignedByMemberId?: number | null;
  assignerName?: string | null;
  assignedByName?: string | null;
  startDate?: string | null;
  assignedAt?: string | null;
  endDate?: string | null;
  endedAt?: string | null;
  isActive?: boolean | null;
  active?: boolean | null;
}

function mapAssignmentFields(raw: BackendAssignmentResp): StaffZoneAssignment {
  return {
    assignmentId: raw.assignmentId ?? raw.id ?? 0,
    farmMemberId: raw.farmMemberId,
    userId: raw.userId ?? null,
    staffName: raw.staffName ?? null,
    staffEmail: raw.staffEmail ?? null,
    jobTitle: raw.jobTitle ?? raw.staffJobTitle ?? null,
    zoneId: raw.zoneId,
    zoneName: raw.zoneName ?? null,
    assignedByMemberId: raw.assignedByMemberId ?? null,
    assignedByName: raw.assignedByName ?? raw.assignerName ?? null,
    assignedAt: raw.assignedAt ?? raw.startDate ?? new Date().toISOString(),
    endedAt: raw.endedAt ?? raw.endDate ?? null,
    active: raw.active ?? raw.isActive ?? !(raw.endedAt ?? raw.endDate),
  };
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
  try {
    return await request<AssignedZoneResp[]>(`/farms/${farmId}/zones/assigned`);
  } catch {
    return await request<AssignedZoneResp[]>(`/farms/${farmId}/my-assigned-zones`);
  }
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
  const list = await request<BackendAssignmentResp[]>(url);
  return list.map(mapAssignmentFields);
}

export async function assignStaffToZone(farmId: number, zoneId: number, values: AssignStaffToZonePayload): Promise<StaffZoneAssignment> {
  const payload = {
    farmMemberId: Number(values.farmMemberId),
    zoneId: zoneId,
    assignedAt: values.assignedAt || new Date().toISOString(),
    endedAt: values.endedAt || null,
  };
  const created = await request<BackendAssignmentResp>(`/farms/${farmId}/zone-assignments`, {
    method: 'POST',
    data: payload,
  });
  return mapAssignmentFields(created);
}

export async function unassignStaffFromZone(farmId: number, assignmentId: number): Promise<void> {
  await request<void>(`/farms/${farmId}/zone-assignments/${assignmentId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// UC-19, UC-20, UC-21: Risk Records, Soil Assessments, Water Assessments
// ==========================================

const RISK_STORAGE_KEY = 'mcd_vietgap_risk_records_v1';
const SOIL_STORAGE_KEY = 'mcd_vietgap_soil_assessments_v1';
const WATER_STORAGE_KEY = 'mcd_vietgap_water_assessments_v1';

function readLocalList<T>(key: string, defaultSeed: T[]): T[] {
  if (typeof window === 'undefined' || !window.localStorage) return defaultSeed;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(defaultSeed));
      return defaultSeed;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return defaultSeed;
  }
}

function writeLocalList<T>(key: string, list: T[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
}

function getDefaultRisks(zoneId: number, blockId?: number): RiskAssessmentRecord[] {
  const base: RiskAssessmentRecord[] = [
    {
      riskId: 101,
      targetType: 'ZONE',
      zoneId: zoneId,
      assessedAt: '2026-03-10',
      riskType: 'Trôi dạt hóa chất lân cận',
      riskLevel: 'MEDIUM',
      priorFindings: 'Phía Đông giáp ranh hộ canh tác truyền thống có phun thuốc BVTV.',
      description: 'Nguy cơ thuốc BVTV phát tán qua gió từ khu vực lân cận sang vành đai khu vực.',
      controlMeasures: 'Trồng hàng rào cây chắn gió cao 2.5m dọc ranh giới phía Đông; thiết lập vùng đệm cách ly 5m.',
      assessedByName: 'Ban Quản lý VietGAP',
      status: 'CONTROLLED',
    },
    {
      riskId: 102,
      targetType: 'ZONE',
      zoneId: zoneId,
      assessedAt: '2026-03-18',
      riskType: 'Ngập úng cục bộ mùa mưa',
      riskLevel: 'LOW',
      priorFindings: 'Rãnh thoát nước chính phía Nam đôi khi ứ đọng lá cây sau mưa lớn.',
      description: 'Nguy cơ tràn nước mặt từ đường nội bộ vào khu sản xuất khi mưa lớn kéo dài.',
      controlMeasures: 'Nạo vét hệ thống mương thoát nước định kỳ mỗi 2 tuần; gia cố bờ bao cao 30cm.',
      assessedByName: 'Kỹ thuật viên Phụ trách',
      status: 'MONITORING',
    },
    {
      riskId: 201,
      targetType: 'BLOCK',
      zoneId: zoneId,
      blockId: blockId ?? 1,
      assessedAt: '2026-03-12',
      riskType: 'Mầm bệnh tồn lưu trong đất',
      riskLevel: 'MEDIUM',
      priorFindings: 'Vụ trước ghi nhận rải rác hiện tượng héo xanh vi khuẩn ở cuối vụ.',
      description: 'Mầm bệnh Ralstonia và nấm Fusarium có thể tồn lưu trong tàn dư thực vật tại lô đất.',
      controlMeasures: 'Thu gom triệt để tàn dư cây trồng, bón vôi nông nghiệp 50kg/1000m², phơi ải đất 15 ngày và bổ sung nấm đối kháng Trichoderma.',
      assessedByName: 'Kỹ sư Nông học',
      status: 'CONTROLLED',
    },
    {
      riskId: 202,
      targetType: 'BLOCK',
      zoneId: zoneId,
      blockId: blockId ?? 1,
      assessedAt: '2026-03-22',
      riskType: 'Ô nhiễm vi sinh vật từ phân hữu cơ',
      riskLevel: 'LOW',
      priorFindings: 'Sử dụng phân chuồng ủ hoai mục cho giai đoạn bón lót.',
      description: 'Nguy cơ nhiễm khuẩn E.coli hoặc Salmonella nếu phân hữu cơ chưa hoai mục hoàn toàn.',
      controlMeasures: 'Chỉ sử dụng lô phân hữu cơ đã ủ đủ 60 ngày có biên bản kiểm tra nhiệt độ đống ủ >55°C và kết quả kiểm nghiệm vi sinh đạt chuẩn.',
      assessedByName: 'Ban Quản lý VietGAP',
      status: 'CONTROLLED',
    },
  ];
  return base;
}

export function fetchZoneRiskRecords(zoneId: number): RiskAssessmentRecord[] {
  const all = readLocalList<RiskAssessmentRecord>(RISK_STORAGE_KEY, getDefaultRisks(zoneId));
  const zoneItems = all.filter((r) => r.targetType === 'ZONE' && Number(r.zoneId) === Number(zoneId));
  if (zoneItems.length === 0) {
    const seeded = getDefaultRisks(zoneId).filter((r) => r.targetType === 'ZONE').map((r, idx) => ({
      ...r,
      riskId: Date.now() + idx + zoneId * 10,
      zoneId,
    }));
    writeLocalList(RISK_STORAGE_KEY, [...all, ...seeded]);
    return seeded;
  }
  return zoneItems;
}

export function fetchBlockRiskRecords(zoneId: number, blockId: number): RiskAssessmentRecord[] {
  const all = readLocalList<RiskAssessmentRecord>(RISK_STORAGE_KEY, getDefaultRisks(zoneId, blockId));
  const blockItems = all.filter((r) => r.targetType === 'BLOCK' && Number(r.blockId) === Number(blockId));
  if (blockItems.length === 0) {
    const seeded = getDefaultRisks(zoneId, blockId).filter((r) => r.targetType === 'BLOCK').map((r, idx) => ({
      ...r,
      riskId: Date.now() + idx + blockId * 100,
      zoneId,
      blockId,
    }));
    writeLocalList(RISK_STORAGE_KEY, [...all, ...seeded]);
    return seeded;
  }
  return blockItems;
}

export function saveRiskRecord(record: Omit<RiskAssessmentRecord, 'riskId'> & { riskId?: number }): RiskAssessmentRecord {
  const all = readLocalList<RiskAssessmentRecord>(RISK_STORAGE_KEY, getDefaultRisks(record.zoneId, record.blockId ?? 1));
  if (record.riskId) {
    const updated: RiskAssessmentRecord = { ...(record as RiskAssessmentRecord), riskId: record.riskId };
    const next = all.map((r) => (r.riskId === record.riskId ? updated : r));
    writeLocalList(RISK_STORAGE_KEY, next);
    notifyDataChanged('/production/risks', 'PUT');
    return updated;
  }
  const created: RiskAssessmentRecord = {
    ...(record as RiskAssessmentRecord),
    riskId: Date.now(),
  };
  writeLocalList(RISK_STORAGE_KEY, [created, ...all]);
  notifyDataChanged('/production/risks', 'POST');
  return created;
}

export function fetchBlockSoilAssessments(zoneId: number, blockId: number, blockName?: string): SoilAssessmentRecord[] {
  const defaultSeed: SoilAssessmentRecord[] = [
    {
      assessmentId: 301 + blockId,
      blockId,
      blockName: blockName || `Block #${blockId}`,
      zoneId,
      assessedAt: '2026-03-05',
      sampleCode: `SOIL-${zoneId}-${blockId}-2026Q1`,
      phLevel: 6.4,
      organicMatterPct: 3.8,
      heavyMetalResult: 'SAFE',
      microbialStatus: 'Đạt chuẩn QCVN 03-MT:2015/BTNMT (As, Cd, Pb, Cu, Zn dưới ngưỡng cho phép)',
      laboratoryName: 'Trung tâm Phân tích & Chứng nhận Chất lượng Nông림 Thủy sản',
      conclusion: 'DAT_CHUAN',
      notes: 'Đất thịt pha cát tơi xốp, giàu mùn hữu cơ, thoát nước tốt, đủ điều kiện canh tác VietGAP.',
      recordedByName: 'Kỹ sư Nông học',
    },
    {
      assessmentId: 302 + blockId,
      blockId,
      blockName: blockName || `Block #${blockId}`,
      zoneId,
      assessedAt: '2025-11-15',
      sampleCode: `SOIL-${zoneId}-${blockId}-2025Q4`,
      phLevel: 5.9,
      organicMatterPct: 3.2,
      heavyMetalResult: 'SAFE',
      microbialStatus: 'Không phát hiện vi sinh vật gây hại vượt ngưỡng',
      laboratoryName: 'Viện Khoa học Kỹ thuật Nông nghiệp',
      conclusion: 'CAN_CAI_TAO',
      notes: 'Độ pH hơi chua nhẹ (5.9), đã khuyến nghị bón bổ sung vôi Dolomite và phân hữu cơ vi sinh trước vụ mới.',
      recordedByName: 'Ban Quản lý VietGAP',
    },
  ];
  const all = readLocalList<SoilAssessmentRecord>(SOIL_STORAGE_KEY, defaultSeed);
  const items = all.filter((s) => Number(s.blockId) === Number(blockId));
  if (items.length === 0) {
    writeLocalList(SOIL_STORAGE_KEY, [...all, ...defaultSeed]);
    return defaultSeed;
  }
  return items;
}

export function saveSoilAssessment(
  record: Omit<SoilAssessmentRecord, 'assessmentId'> & { assessmentId?: number }
): SoilAssessmentRecord {
  const all = readLocalList<SoilAssessmentRecord>(SOIL_STORAGE_KEY, []);
  if (record.assessmentId) {
    const updated: SoilAssessmentRecord = { ...(record as SoilAssessmentRecord), assessmentId: record.assessmentId };
    writeLocalList(
      SOIL_STORAGE_KEY,
      all.map((item) => (item.assessmentId === record.assessmentId ? updated : item))
    );
    notifyDataChanged('/production/soil', 'PUT');
    return updated;
  }
  const created: SoilAssessmentRecord = {
    ...(record as SoilAssessmentRecord),
    assessmentId: Date.now(),
  };
  writeLocalList(SOIL_STORAGE_KEY, [created, ...all]);
  notifyDataChanged('/production/soil', 'POST');
  return created;
}

export function fetchBlockWaterAssessments(zoneId: number, blockId: number, blockName?: string): WaterAssessmentRecord[] {
  const defaultSeed: WaterAssessmentRecord[] = [
    {
      assessmentId: 401 + blockId,
      blockId,
      blockName: blockName || `Block #${blockId}`,
      zoneId,
      assessedAt: '2026-03-08',
      waterSource: 'Giếng khoan tầng sâu & Hồ chứa lắng lọc',
      sampleCode: `WATER-${zoneId}-${blockId}-2026Q1`,
      phLevel: 6.8,
      ecValue: 0.45,
      coliformResult: 'SAFE',
      heavyMetalResult: 'SAFE',
      laboratoryName: 'Trung tâm Phân tích & Chứng nhận Chất lượng Nông Lâm Thủy sản',
      conclusion: 'DAT_CHUAN',
      treatmentMeasure: 'Lọc qua hệ thống lọc cát thạch anh + màng lọc đĩa 120 mesh trước khi cấp vào đường ống tưới nhỏ giọt.',
      notes: 'Các chỉ tiêu As, Hg, Pb, Cd, E.coli, Coliform đều đạt QCVN 08-MT:2015/BTNMT cột B1 cho nước tưới tiêu.',
      recordedByName: 'Kỹ sư Nông học',
    },
  ];
  const all = readLocalList<WaterAssessmentRecord>(WATER_STORAGE_KEY, defaultSeed);
  const items = all.filter((w) => Number(w.blockId) === Number(blockId));
  if (items.length === 0) {
    writeLocalList(WATER_STORAGE_KEY, [...all, ...defaultSeed]);
    return defaultSeed;
  }
  return items;
}

export function saveWaterAssessment(
  record: Omit<WaterAssessmentRecord, 'assessmentId'> & { assessmentId?: number }
): WaterAssessmentRecord {
  const all = readLocalList<WaterAssessmentRecord>(WATER_STORAGE_KEY, []);
  if (record.assessmentId) {
    const updated: WaterAssessmentRecord = { ...(record as WaterAssessmentRecord), assessmentId: record.assessmentId };
    writeLocalList(
      WATER_STORAGE_KEY,
      all.map((item) => (item.assessmentId === record.assessmentId ? updated : item))
    );
    notifyDataChanged('/production/water', 'PUT');
    return updated;
  }
  const created: WaterAssessmentRecord = {
    ...(record as WaterAssessmentRecord),
    assessmentId: Date.now(),
  };
  writeLocalList(WATER_STORAGE_KEY, [created, ...all]);
  notifyDataChanged('/production/water', 'POST');
  return created;
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

// ==========================================
// Zone Production Risk Backend APIs (UC-21)
// ==========================================

export interface ZoneRiskBackendResp {
  riskId: number;
  zoneId: number;
  zoneName?: string;
  farmId: number;
  assessedByMemberId?: number | null;
  assessedByName?: string | null;
  riskType: string;
  riskLevel: string;
  description?: string | null;
  mitigationPlan?: string | null;
  imageUrl?: string | null;
  assessedAt: string;
}

export interface CreateZoneRiskPayload {
  riskType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | string;
  description?: string;
  mitigationPlan?: string;
  imageUrl?: string;
  assessedAt?: string;
}

export interface UpdateRiskControlPayload {
  mitigationPlan: string;
  riskLevel?: string;
  description?: string;
  imageUrl?: string;
}

export async function recordZoneRiskApi(zoneId: number, payload: CreateZoneRiskPayload): Promise<ZoneRiskBackendResp> {
  const data = await request<ZoneRiskBackendResp>(`/zones/${zoneId}/risks`, {
    method: 'POST',
    data: payload,
  });
  notifyDataChanged('/production/risks', 'POST');
  return data;
}

export async function fetchZoneRiskHistoryApi(zoneId: number): Promise<ZoneRiskBackendResp[]> {
  return await request<ZoneRiskBackendResp[]>(`/zones/${zoneId}/risks`);
}

export async function fetchFarmRiskHistoryApi(farmId: number): Promise<ZoneRiskBackendResp[]> {
  return await request<ZoneRiskBackendResp[]>(`/farms/${farmId}/risks`);
}

export async function fetchZoneRiskDetailsApi(riskId: number): Promise<ZoneRiskBackendResp> {
  return await request<ZoneRiskBackendResp>(`/risks/${riskId}`);
}

export async function updateRiskControlMeasuresApi(riskId: number, payload: UpdateRiskControlPayload): Promise<ZoneRiskBackendResp> {
  const data = await request<ZoneRiskBackendResp>(`/risks/${riskId}`, {
    method: 'PUT',
    data: payload,
  });
  notifyDataChanged('/production/risks', 'PUT');
  return data;
}

export async function deleteZoneRiskApi(riskId: number): Promise<void> {
  await request<void>(`/risks/${riskId}`, {
    method: 'DELETE',
  });
  notifyDataChanged('/production/risks', 'DELETE');
}

// ==========================================
// Soil Assessment Backend APIs (UC-20)
// ==========================================

export interface SoilAssessmentBackendResp {
  assessmentId: number;
  blockId: number;
  blockName?: string;
  zoneId: number;
  zoneName?: string;
  farmId: number;
  conductedByMemberId?: number | null;
  conductedByName?: string | null;
  soilPh?: number | null;
  moisturePercent?: number | null;
  nutrientData: string;
  notes?: string | null;
  imageUrl?: string | null;
  assessedAt: string;
}

export interface CreateSoilAssessmentPayload {
  soilPh?: number;
  moisturePercent?: number;
  nutrientData?: string;
  notes?: string;
  imageUrl?: string;
  assessedAt?: string;
}

export async function createSoilAssessmentApi(blockId: number, payload: CreateSoilAssessmentPayload): Promise<SoilAssessmentBackendResp> {
  const data = await request<SoilAssessmentBackendResp>(`/blocks/${blockId}/soil-assessments`, {
    method: 'POST',
    data: payload,
  });
  notifyDataChanged('/production/soil', 'POST');
  return data;
}

export async function fetchSoilAssessmentHistoryApi(blockId: number): Promise<SoilAssessmentBackendResp[]> {
  return await request<SoilAssessmentBackendResp[]>(`/blocks/${blockId}/soil-assessments`);
}

export async function fetchFarmSoilAssessmentHistoryApi(farmId: number): Promise<SoilAssessmentBackendResp[]> {
  return await request<SoilAssessmentBackendResp[]>(`/farms/${farmId}/soil-assessments`);
}

export async function fetchSoilAssessmentDetailsApi(assessmentId: number): Promise<SoilAssessmentBackendResp> {
  return await request<SoilAssessmentBackendResp>(`/soil-assessments/${assessmentId}`);
}

export async function deleteSoilAssessmentApi(assessmentId: number): Promise<void> {
  await request<void>(`/soil-assessments/${assessmentId}`, {
    method: 'DELETE',
  });
  notifyDataChanged('/production/soil', 'DELETE');
}
