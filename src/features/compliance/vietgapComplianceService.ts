import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

// Checklist Types
export interface ChecklistResultItemResp {
  resultId: number;
  runId: number;
  checkedByMemberId?: number | null;
  checkedByName?: string | null;
  resultStatus: string; // 'pass', 'fail', 'not_applicable'
  notes?: string | null;
  evidenceImageUrl?: string | null;
  isMissingEvidence?: boolean;
  checkedAt?: string | null;
}

export interface ChecklistRunResp {
  runId: number;
  checklistRuleId: number;
  ruleName?: string | null;
  ruleCategory?: string | null;
  farmId: number;
  cropSeasonId?: number | null;
  seasonName?: string | null;
  blockId?: number | null;
  blockName?: string | null;
  assignedToMemberId?: number | null;
  assignedToName?: string | null;
  runStatus: string; // 'open', 'in_progress', 'completed', 'cancelled'
  scheduledAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  totalItems: number;
  passedItems: number;
  failedItems: number;
  missingEvidenceCount: number;
  results?: ChecklistResultItemResp[];
}

export interface RunChecklistPayload {
  checklistRuleId: number;
  cropSeasonId?: number;
  blockId?: number;
  assignedToMemberId?: number;
  scheduledAt?: string;
  notes?: string;
  items?: {
    resultStatus: string;
    notes?: string;
    evidenceImageUrl?: string;
  }[];
}

// Internal Assessment Types
export interface InternalAssessmentItemResp {
  internalAssessmentItemId: number;
  assessmentCriterionId: number;
  criterionCode?: string | null;
  criterionName?: string | null;
  criterionCategory?: string | null;
  evaluationMethod?: string | null;
  maxScore?: number | null;
  score: number;
  resultNotes?: string | null;
  evidenceImageUrl?: string | null;
  isEvidenceAttached?: boolean;
}

export interface InternalAssessmentResp {
  internalAssessmentId: number;
  farmId: number;
  cropSeasonId?: number | null;
  seasonName?: string | null;
  zoneId?: number | null;
  zoneName?: string | null;
  assessedByMemberId?: number | null;
  assessedByName?: string | null;
  assessmentTitle: string;
  assessedAt: string;
  notes?: string | null;
  evidenceImageUrl?: string | null;
  totalScore: number;
  maxPossibleScore: number;
  scorePercentage: number;
  complianceStatus: 'COMPLIANT' | 'CONDITIONALLY_COMPLIANT' | 'NON_COMPLIANT' | string;
  totalCriteria: number;
  criteriaWithEvidence: number;
  items?: InternalAssessmentItemResp[];
}

export interface ConductInternalAssessmentPayload {
  assessmentTitle: string;
  cropSeasonId?: number;
  zoneId?: number;
  assessedAt?: string;
  notes?: string;
  evidenceImageUrl?: string;
  items: {
    assessmentCriterionId: number;
    score: number;
    resultNotes?: string;
    evidenceImageUrl?: string;
  }[];
}

export interface VietGapCriterionResp {
  criterionId: number;
  farmId?: number | null;
  criterionCode: string;
  criterionName: string;
  category: string;
  description?: string | null;
  evaluationMethod?: string | null;
  maxScore: number;
  isActive: boolean;
}

// API Functions
export async function fetchChecklistHistoryApi(
  farmId: number,
  params?: { cropSeasonId?: number; runStatus?: string }
): Promise<ChecklistRunResp[]> {
  const query = new URLSearchParams();
  if (params?.cropSeasonId) query.set('cropSeasonId', String(params.cropSeasonId));
  if (params?.runStatus) query.set('runStatus', params.runStatus);

  const qs = query.toString();
  const res = await apiRequest<ApiResponse<ChecklistRunResp[]>>(`/farms/${farmId}/checklist-runs${qs ? `?${qs}` : ''}`);
  return res.data || [];
}

export async function fetchChecklistResultApi(runId: number): Promise<ChecklistRunResp> {
  const res = await apiRequest<ApiResponse<ChecklistRunResp>>(`/checklist-runs/${runId}`);
  return res.data;
}

export async function fetchChecklistItemDetailsApi(runId: number): Promise<ChecklistResultItemResp[]> {
  const res = await apiRequest<ApiResponse<ChecklistResultItemResp[]>>(`/checklist-runs/${runId}/items`);
  return res.data || [];
}

export async function runChecklistApi(farmId: number, payload: RunChecklistPayload): Promise<ChecklistRunResp> {
  const res = await apiRequest<ApiResponse<ChecklistRunResp>>(`/farms/${farmId}/checklist-runs`, {
    method: 'POST',
    data: payload,
  });
  return res.data;
}

export async function fetchInternalAssessmentHistoryApi(
  farmId: number,
  params?: { cropSeasonId?: number; zoneId?: number }
): Promise<InternalAssessmentResp[]> {
  const query = new URLSearchParams();
  if (params?.cropSeasonId) query.set('cropSeasonId', String(params.cropSeasonId));
  if (params?.zoneId) query.set('zoneId', String(params.zoneId));

  const qs = query.toString();
  const res = await apiRequest<ApiResponse<InternalAssessmentResp[]>>(`/farms/${farmId}/internal-assessments${qs ? `?${qs}` : ''}`);
  return res.data || [];
}

export async function fetchInternalAssessmentDetailsApi(assessmentId: number): Promise<InternalAssessmentResp> {
  const res = await apiRequest<ApiResponse<InternalAssessmentResp>>(`/internal-assessments/${assessmentId}`);
  return res.data;
}

export async function conductInternalAssessmentApi(
  farmId: number,
  payload: ConductInternalAssessmentPayload
): Promise<InternalAssessmentResp> {
  const res = await apiRequest<ApiResponse<InternalAssessmentResp>>(`/farms/${farmId}/internal-assessments`, {
    method: 'POST',
    data: payload,
  });
  return res.data;
}

export async function fetchVietGapCriteriaApi(
  farmId: number,
  params?: { isActiveOnly?: boolean; keyword?: string }
): Promise<VietGapCriterionResp[]> {
  const query = new URLSearchParams();
  if (params?.isActiveOnly !== undefined) query.set('isActiveOnly', String(params.isActiveOnly));
  if (params?.keyword) query.set('keyword', params.keyword);

  const qs = query.toString();
  const res = await apiRequest<ApiResponse<VietGapCriterionResp[]>>(`/farms/${farmId}/vietgap-criteria${qs ? `?${qs}` : ''}`);
  return res.data || [];
}

