export type ZoneStatus = 'active' | 'archived' | 'inactive';
export type BlockStatus = 'AVAILABLE' | 'IN_USE' | 'RESTING' | 'archived' | 'active';

/**
 * Model Zone (Phân khu / Vùng sản xuất - Cấp cao) khớp BE Entity Zone & API /zones
 */
export interface Zone {
  zoneId: number;
  farmId: number;
  zoneName: string;
  areaValue: number;
  areaUnit: string;
  description?: string | null;
  imageUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  totalBlocks?: number;
  blocks?: Block[];
  // Backward compatibility fields
  productionAreaId?: string;
  areaCode?: string;
  areaName?: string;
  areaHectares?: number;
  locationDescription?: string;
}

/**
 * Model Block (Lô / Thửa đất canh tác trong Zone - Cấp nhỏ) khớp BE Entity Block & API /blocks
 */
export interface Block {
  blockId: number;
  zoneId: number;
  zoneName?: string;
  farmId?: number;
  blockName: string;
  areaValue: number;
  areaUnit: string;
  soilType?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  boundaryGeoJson?: string | null;
  createdAt: string;
}

/**
 * Model Ghi nhận tình trạng Lô đất (UC-17.4: Record Block Condition)
 */
export interface BlockConditionObservation {
  observationId: number;
  blockId: number;
  blockName?: string;
  recordedByMemberId?: number | null;
  recorderFullName?: string | null;
  conditionType: string;
  description: string;
  imageUrl?: string | null;
  observedAt: string;
}

/**
 * Model Phân công nhân viên vào Zone (UC-35: Zone Assignment)
 */
export interface StaffZoneAssignment {
  assignmentId: number;
  farmMemberId: number;
  userId?: number | null;
  staffName?: string | null;
  staffEmail?: string | null;
  jobTitle?: string | null;
  zoneId: number;
  zoneName?: string | null;
  assignedByMemberId?: number | null;
  assignedByName?: string | null;
  assignedAt: string;
  endedAt?: string | null;
  active: boolean;
}

export interface AssignedZoneResp {
  zoneId: number;
  farmId: number;
  zoneName: string;
  areaValue: number;
  areaUnit: string;
  description?: string | null;
  status: string;
  assignmentId?: number | null;
  assignedStartDate?: string | null;
  activeBlockCount: number;
}

export interface ZoneFormValues {
  zoneName: string;
  areaValue: string;
  areaUnit: string;
  description: string;
  imageUrl: string;
}

export interface BlockFormValues {
  blockName: string;
  areaValue: string;
  areaUnit: string;
  soilType: string;
  description: string;
  imageUrl: string;
  latitude?: string;
  longitude?: string;
  status?: string;
}

export interface RecordConditionFormValues {
  conditionType: string;
  description: string;
  imageUrl: string;
  observedAt?: string;
}

export interface AssignStaffToZonePayload {
  farmMemberId: number;
  assignedAt?: string;
  endedAt?: string;
  notes?: string;
}

/**
 * Risk Assessment Record (Zone / Block Risk Records - UC-19)
 */
export interface RiskAssessmentRecord {
  riskId: number;
  targetType: 'ZONE' | 'BLOCK';
  zoneId: number;
  zoneName?: string;
  blockId?: number | null;
  blockName?: string | null;
  assessedAt: string;
  riskType: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  priorFindings?: string | null;
  description: string;
  controlMeasures: string;
  assessedByName: string;
  status: 'MONITORING' | 'CONTROLLED' | 'ACTION_REQUIRED';
}

/**
 * Soil Assessment Record (Block Soil Assessments - UC-20)
 */
export interface SoilAssessmentRecord {
  assessmentId: number;
  blockId: number;
  blockName?: string;
  zoneId: number;
  zoneName?: string;
  assessedAt: string;
  sampleCode: string;
  phLevel: number;
  organicMatterPct: number;
  heavyMetalResult: 'SAFE' | 'WARNING' | 'EXCEEDED';
  microbialStatus: string;
  laboratoryName: string;
  conclusion: 'DAT_CHUAN' | 'CAN_CAI_TAO' | 'KHONG_DAT';
  notes?: string | null;
  recordedByName: string;
}

/**
 * Water Assessment Record (Block Water Assessments - UC-21)
 */
export interface WaterAssessmentRecord {
  assessmentId: number;
  blockId: number;
  blockName?: string;
  zoneId: number;
  zoneName?: string;
  assessedAt: string;
  waterSource: string;
  sampleCode: string;
  phLevel: number;
  ecValue: number;
  coliformResult: 'SAFE' | 'EXCEEDED';
  heavyMetalResult: 'SAFE' | 'WARNING' | 'EXCEEDED';
  laboratoryName: string;
  conclusion: 'DAT_CHUAN' | 'CAN_XU_LY' | 'KHONG_DAT';
  treatmentMeasure?: string | null;
  notes?: string | null;
  recordedByName: string;
}

// Backward compatibility types for legacy components
export type ProductionArea = Zone;
export type ProductionAreaStatus = 'active' | 'archived';
export type ProductionAreaFormValues = {
  areaName: string;
  areaHectares: string;
  locationDescription: string;
};
export type ProductionAreaFormErrors = Partial<Record<keyof ProductionAreaFormValues, string>>;

export type ProductionAreaSortField = 'areaName' | 'areaHectares' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ProductionAreaQueryParams {
  search?: string;
  status?: ProductionAreaStatus | 'all';
  sortField: ProductionAreaSortField;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface StaffAreaAssignment {
  staffAreaAssignmentId: string;
  productionAreaId: string;
  farmMemberId: string;
  staffName: string;
  staffEmail: string;
  startsAt: string;
  endsAt?: string;
  notes?: string;
  createdAt?: string;
}

export interface AssignStaffFormValues {
  farmMemberId: string;
  startsAt: string;
  notes: string;
}

export type AssignStaffFormErrors = Partial<Record<keyof AssignStaffFormValues, string>>;
