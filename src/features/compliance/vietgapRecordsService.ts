import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

// ==========================================
// UC-46: Farm Equipment & Maintenance (Mục 4.9)
// ==========================================

export interface FarmEquipmentResp {
  equipmentId: number;
  farmId: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentType: 'sprayer' | 'scale' | 'irrigation' | 'machinery' | 'other' | string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | string;
  notes?: string | null;
  createdAt?: string;
}

export interface FarmEquipmentReq {
  equipmentCode: string;
  equipmentName: string;
  equipmentType: string;
  status?: string;
  notes?: string;
}

export interface EquipmentMaintenanceResp {
  maintenanceId: number;
  farmId: number;
  equipmentId?: number | null;
  equipmentCode?: string | null;
  equipmentName: string;
  actionType: 'rinse_cleaning' | 'maintenance_repair' | 'calibration' | string;
  actionDate: string;
  performerName: string;
  rinseWaterHandling: 'holding_tank' | 'diluted_field' | 'special_pit' | string;
  isSafeForUse: boolean;
  notes?: string | null;
  createdAt?: string;
}

export interface EquipmentMaintenanceReq {
  equipmentId?: number | null;
  equipmentCode?: string;
  equipmentName?: string;
  actionType: string;
  actionDate: string;
  performerName: string;
  rinseWaterHandling: string;
  isSafeForUse: boolean;
  notes?: string;
}

export async function fetchFarmEquipmentsApi(farmId: number): Promise<FarmEquipmentResp[]> {
  const res = await apiRequest<ApiResponse<FarmEquipmentResp[]>>(`/farms/${farmId}/equipments`);
  return res?.data ?? [];
}

export async function createFarmEquipmentApi(farmId: number, payload: FarmEquipmentReq): Promise<FarmEquipmentResp> {
  const res = await apiRequest<ApiResponse<FarmEquipmentResp>>(`/farms/${farmId}/equipments`, {
    method: 'POST',
    data: payload,
  });
  if (!res?.success || !res.data) throw new Error(res?.message || 'Không thể thêm thiết bị.');
  return res.data;
}

export async function updateFarmEquipmentApi(equipmentId: number, payload: FarmEquipmentReq): Promise<FarmEquipmentResp> {
  const res = await apiRequest<ApiResponse<FarmEquipmentResp>>(`/equipments/${equipmentId}`, {
    method: 'PUT',
    data: payload,
  });
  if (!res?.success || !res.data) throw new Error(res?.message || 'Không thể cập nhật thiết bị.');
  return res.data;
}

export async function deleteFarmEquipmentApi(equipmentId: number): Promise<void> {
  await apiRequest<ApiResponse<void>>(`/equipments/${equipmentId}`, { method: 'DELETE' });
}

export async function fetchEquipmentMaintenancesApi(farmId: number): Promise<EquipmentMaintenanceResp[]> {
  const res = await apiRequest<ApiResponse<EquipmentMaintenanceResp[]>>(`/farms/${farmId}/equipment-maintenances`);
  return res?.data ?? [];
}

export async function recordEquipmentMaintenanceApi(
  farmId: number,
  payload: EquipmentMaintenanceReq,
): Promise<EquipmentMaintenanceResp> {
  const res = await apiRequest<ApiResponse<EquipmentMaintenanceResp>>(`/farms/${farmId}/equipment-maintenances`, {
    method: 'POST',
    data: payload,
  });
  if (!res?.success || !res.data) throw new Error(res?.message || 'Không thể ghi nhận nhật ký thiết bị.');
  return res.data;
}

export async function deleteEquipmentMaintenanceApi(maintenanceId: number): Promise<void> {
  await apiRequest<ApiResponse<void>>(`/equipment-maintenances/${maintenanceId}`, { method: 'DELETE' });
}

// ==========================================
// UC-47: Hazardous Waste Records (Mục 4.8)
// ==========================================

export interface HazardousWasteResp {
  wasteLogId: number;
  farmId: number;
  wasteType: 'pesticide_bottle' | 'fertilizer_pack' | 'medical' | 'other' | string;
  quantity: number;
  unit: string;
  collectionDate: string;
  disposalMethod: 'transfer_contractor' | 'incinerate_farm' | 'store_holding' | string;
  contractorName?: string | null;
  handoverReceiptNo?: string | null;
  collectorName: string;
  notes?: string | null;
  createdAt?: string;
}

export interface HazardousWasteReq {
  wasteType: string;
  quantity: number;
  unit: string;
  collectionDate: string;
  disposalMethod: string;
  contractorName?: string;
  handoverReceiptNo?: string;
  collectorName: string;
  notes?: string;
}

export async function fetchHazardousWastesApi(farmId: number): Promise<HazardousWasteResp[]> {
  const res = await apiRequest<ApiResponse<HazardousWasteResp[]>>(`/farms/${farmId}/waste-records`);
  return res?.data ?? [];
}

export async function createHazardousWasteApi(farmId: number, payload: HazardousWasteReq): Promise<HazardousWasteResp> {
  const res = await apiRequest<ApiResponse<HazardousWasteResp>>(`/farms/${farmId}/waste-records`, {
    method: 'POST',
    data: payload,
  });
  if (!res?.success || !res.data) throw new Error(res?.message || 'Không thể ghi nhận rác thải nguy hại.');
  return res.data;
}

export async function updateHazardousWasteApi(wasteLogId: number, payload: HazardousWasteReq): Promise<HazardousWasteResp> {
  const res = await apiRequest<ApiResponse<HazardousWasteResp>>(`/waste-records/${wasteLogId}`, {
    method: 'PUT',
    data: payload,
  });
  if (!res?.success || !res.data) throw new Error(res?.message || 'Không thể cập nhật nhật ký rác thải.');
  return res.data;
}

export async function deleteHazardousWasteApi(wasteLogId: number): Promise<void> {
  await apiRequest<ApiResponse<void>>(`/waste-records/${wasteLogId}`, { method: 'DELETE' });
}

// ==========================================
// UC-48: Customer Complaints & Product Recall (Mục 4.10)
// ==========================================

export interface CustomerComplaintResp {
  complaintId: number;
  farmId: number;
  harvestRecordId?: number | null;
  lotCode?: string | null;
  harvestedQuantity?: number | null;
  harvestedUnit?: string | null;
  customerName: string;
  customerPhone?: string | null;
  receivedDate: string;
  issueType: 'quality_defect' | 'chemical_residue_suspect' | 'packaging_damage' | 'other' | string;
  issueDescription: string;
  severity: 'low' | 'medium' | 'critical' | string;
  status: 'received' | 'investigating' | 'resolved' | 'recalled' | string;
  resolutionNotes?: string | null;
  isRecallRequired: boolean;
  recalledQuantity?: number | null;
  createdAt?: string;
}

export interface CreateComplaintReq {
  harvestRecordId?: number | null;
  lotCode?: string;
  customerName: string;
  customerPhone?: string;
  receivedDate: string;
  issueType: string;
  issueDescription: string;
  severity: string;
}

export interface ResolveComplaintReq {
  status: 'investigating' | 'resolved';
  resolutionNotes: string;
}

export interface RecallProductReq {
  recalledQuantity: number;
  resolutionNotes: string;
}

export async function fetchCustomerComplaintsApi(farmId: number): Promise<CustomerComplaintResp[]> {
  const res = await apiRequest<ApiResponse<CustomerComplaintResp[]>>(`/farms/${farmId}/complaints`);
  return res?.data ?? [];
}

export async function createCustomerComplaintApi(
  farmId: number,
  payload: CreateComplaintReq,
): Promise<CustomerComplaintResp> {
  const res = await apiRequest<ApiResponse<CustomerComplaintResp>>(`/farms/${farmId}/complaints`, {
    method: 'POST',
    data: payload,
  });
  if (!res?.success || !res.data) throw new Error(res?.message || 'Không thể ghi nhận khiếu nại.');
  return res.data;
}

export async function resolveCustomerComplaintApi(
  complaintId: number,
  payload: ResolveComplaintReq,
): Promise<CustomerComplaintResp> {
  const res = await apiRequest<ApiResponse<CustomerComplaintResp>>(`/complaints/${complaintId}/resolve`, {
    method: 'PUT',
    data: payload,
  });
  if (!res?.success || !res.data) throw new Error(res?.message || 'Không thể cập nhật phương án giải quyết.');
  return res.data;
}

export async function recordProductRecallApi(
  complaintId: number,
  payload: RecallProductReq,
): Promise<CustomerComplaintResp> {
  const res = await apiRequest<ApiResponse<CustomerComplaintResp>>(`/complaints/${complaintId}/recall`, {
    method: 'PUT',
    data: payload,
  });
  if (!res?.success || !res.data) throw new Error(res?.message || 'Không thể ghi nhận thu hồi sản phẩm.');
  return res.data;
}

export async function deleteCustomerComplaintApi(complaintId: number): Promise<void> {
  await apiRequest<ApiResponse<void>>(`/complaints/${complaintId}`, { method: 'DELETE' });
}
