import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export interface AdminStatisticsData {
  accounts: {
    totalUsers: number;
    activeUsers: number;
    lockedUsers: number;
    ownerCount: number;
    staffCount: number;
  };
  registrations: {
    totalRegistrations: number;
    pendingRegistrations: number;
    approvedRegistrations: number;
    rejectedRegistrations: number;
  };
  farms: {
    totalFarms: number;
    activeFarms: number;
  };
  seasons: {
    totalSeasons: number;
    activeSeasons: number;
    completedSeasons: number;
  };
  aiFeedback: {
    totalFeedbacks: number;
    openFeedbacks: number;
    resolvedFeedbacks: number;
    averageRating: number;
  };
}

export interface AdminAIFeedbackItem {
  feedbackId: number;
  messageId: number | null;
  messageText: string | null;
  userQuestion: string | null;
  userId: number | null;
  senderName: string;
  senderEmail: string | null;
  rating: number | null;
  feedbackText: string;
  status: string;
  createdAt: string;
  replies: Array<{
    replyId: number;
    replyText: string;
    replierName: string;
    createdAt: string;
  }>;
}

export interface AdminCropCategoryItem {
  id: number;
  categoryName: string;
  description: string;
  imageUrl?: string;
}

export interface AdminChecklistRuleItem {
  ruleId: number;
  ruleName: string;
  description: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminArticleItem {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  coverImageUrl?: string;
  tags?: string[];
  status: string;
  publishedAt?: string;
  authorName: string;
}

export interface AdminFarmDirectoryItem {
  id: number;
  farmId: number;
  farmCode: string;
  farmName: string;
  description: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  boundaryCoordinates?: string | null;
  status: string;
  ownerId?: number | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  zoneCount: number;
  blockCount: number;
  memberCount: number;
  staffCount: number;
  staffSummary: string;
  zoneSummary: string;
  scaleSummary: string;
}

export interface AdminZoneDirectoryItem {
  id: number;
  zoneId: number;
  zoneCode: string;
  zoneName: string;
  description: string;
  areaValue?: number | string | null;
  areaUnit: string;
  areaDisplay: string;
  status: string;
  farmId?: number | null;
  farmCode: string;
  farmName: string;
  farmAddress: string;
  ownerId?: number | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  assignedStaff: string;
  blockCount: number;
  blocksSummary: string;
}

export interface AdminBlockDirectoryItem {
  id: number;
  blockId: number;
  blockCode: string;
  blockName: string;
  description: string;
  areaValue?: number | string | null;
  areaUnit: string;
  areaDisplay: string;
  soilType: string;
  status: string;
  zoneId?: number | null;
  zoneCode: string;
  zoneName: string;
  farmId?: number | null;
  farmCode: string;
  farmName: string;
  ownerId?: number | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  assignedStaff: string;
}

export interface AdminComplianceDirectoryItem {
  id: number;
  seasonId: number;
  seasonCode: string;
  seasonName: string;
  cropName: string;
  farmId?: number | null;
  farmCode: string;
  farmName: string;
  zoneBlock: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  assignedStaff: string;
  checklistProgress: string;
  phiStatus: string;
  expectedYield: string;
  traceabilityCode: string;
  assessmentNote: string;
  status: string;
}

export async function fetchAdminStatistics(signal?: AbortSignal): Promise<AdminStatisticsData> {
  const res = await apiRequest<ApiResponse<AdminStatisticsData>>('/admin/statistics/overview', { signal });
  return res.data;
}

export async function fetchAdminFarms(signal?: AbortSignal): Promise<AdminFarmDirectoryItem[]> {
  const res = await apiRequest<ApiResponse<AdminFarmDirectoryItem[]>>('/admin/farms', { signal });
  return res.data || [];
}

export async function updateAdminFarm(
  id: number | string,
  payload: Record<string, unknown>,
): Promise<AdminFarmDirectoryItem> {
  const res = await apiRequest<ApiResponse<AdminFarmDirectoryItem>>(`/admin/farms/${id}`, {
    method: 'PUT',
    data: payload,
  });
  return res.data;
}

export async function fetchAdminZones(signal?: AbortSignal): Promise<AdminZoneDirectoryItem[]> {
  const res = await apiRequest<ApiResponse<AdminZoneDirectoryItem[]>>('/admin/zones', { signal });
  return res.data || [];
}

export async function createAdminZone(payload: Record<string, unknown>): Promise<AdminZoneDirectoryItem> {
  const res = await apiRequest<ApiResponse<AdminZoneDirectoryItem>>('/admin/zones', {
    method: 'POST',
    data: payload,
  });
  return res.data;
}

export async function updateAdminZone(
  id: number | string,
  payload: Record<string, unknown>,
): Promise<AdminZoneDirectoryItem> {
  const res = await apiRequest<ApiResponse<AdminZoneDirectoryItem>>(`/admin/zones/${id}`, {
    method: 'PUT',
    data: payload,
  });
  return res.data;
}

export async function fetchAdminBlocks(signal?: AbortSignal): Promise<AdminBlockDirectoryItem[]> {
  const res = await apiRequest<ApiResponse<AdminBlockDirectoryItem[]>>('/admin/blocks', { signal });
  return res.data || [];
}

export async function createAdminBlock(payload: Record<string, unknown>): Promise<AdminBlockDirectoryItem> {
  const res = await apiRequest<ApiResponse<AdminBlockDirectoryItem>>('/admin/blocks', {
    method: 'POST',
    data: payload,
  });
  return res.data;
}

export async function updateAdminBlock(
  id: number | string,
  payload: Record<string, unknown>,
): Promise<AdminBlockDirectoryItem> {
  const res = await apiRequest<ApiResponse<AdminBlockDirectoryItem>>(`/admin/blocks/${id}`, {
    method: 'PUT',
    data: payload,
  });
  return res.data;
}

export async function fetchAdminCompliance(signal?: AbortSignal): Promise<AdminComplianceDirectoryItem[]> {
  const res = await apiRequest<ApiResponse<AdminComplianceDirectoryItem[]>>('/admin/compliance', { signal });
  return res.data || [];
}

export async function createAdminCompliance(payload: Record<string, unknown>): Promise<AdminComplianceDirectoryItem> {
  const res = await apiRequest<ApiResponse<AdminComplianceDirectoryItem>>('/admin/compliance', {
    method: 'POST',
    data: payload,
  });
  return res.data;
}

export async function updateAdminCompliance(
  id: number | string,
  payload: Record<string, unknown>,
): Promise<AdminComplianceDirectoryItem> {
  const res = await apiRequest<ApiResponse<AdminComplianceDirectoryItem>>(`/admin/compliance/${id}`, {
    method: 'PUT',
    data: payload,
  });
  return res.data;
}

export async function fetchAdminAIFeedbacks(params?: { status?: string; rating?: number }, signal?: AbortSignal): Promise<AdminAIFeedbackItem[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.rating) query.append('rating', String(params.rating));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await apiRequest<ApiResponse<AdminAIFeedbackItem[]>>(`/admin/ai-feedback${qs}`, { signal });
  return res.data;
}

export async function fetchAdminAIFeedbackById(id: number | string, signal?: AbortSignal): Promise<AdminAIFeedbackItem> {
  const res = await apiRequest<ApiResponse<AdminAIFeedbackItem>>(`/admin/ai-feedback/${id}`, { signal });
  return res.data;
}

export async function replyAdminAIFeedback(id: number | string, replyText: string): Promise<AdminAIFeedbackItem> {
  const res = await apiRequest<ApiResponse<AdminAIFeedbackItem>>(`/admin/ai-feedback/${id}/reply`, {
    method: 'POST',
    data: { replyText },
  });
  return res.data;
}

export async function updateAdminAIFeedbackStatus(id: number | string, status: string): Promise<AdminAIFeedbackItem> {
  const res = await apiRequest<ApiResponse<AdminAIFeedbackItem>>(`/admin/ai-feedback/${id}/status`, {
    method: 'PATCH',
    data: { status },
  });
  return res.data;
}

export async function fetchAdminCropCategories(signal?: AbortSignal): Promise<AdminCropCategoryItem[]> {
  const res = await apiRequest<ApiResponse<AdminCropCategoryItem[]>>('/admin/crop-categories', { signal });
  return res.data;
}

export async function createAdminCropCategory(payload: { categoryName: string; description: string }): Promise<AdminCropCategoryItem> {
  const res = await apiRequest<ApiResponse<AdminCropCategoryItem>>('/admin/crop-categories', {
    method: 'POST',
    data: payload,
  });
  return res.data;
}

export async function updateAdminCropCategory(
  id: number | string,
  payload: { categoryName: string; description: string },
): Promise<AdminCropCategoryItem> {
  const res = await apiRequest<ApiResponse<AdminCropCategoryItem>>(`/admin/crop-categories/${id}`, {
    method: 'PUT',
    data: payload,
  });
  return res.data;
}

export async function fetchAdminChecklistRules(signal?: AbortSignal): Promise<AdminChecklistRuleItem[]> {
  const res = await apiRequest<ApiResponse<AdminChecklistRuleItem[]>>('/admin/checklist-rules', { signal });
  return res.data;
}

export async function createAdminChecklistRule(payload: {
  ruleName: string;
  description: string;
  category: string;
  isActive?: boolean;
}): Promise<AdminChecklistRuleItem> {
  const res = await apiRequest<ApiResponse<AdminChecklistRuleItem>>('/admin/checklist-rules', {
    method: 'POST',
    data: payload,
  });
  return res.data;
}

export async function updateAdminChecklistRule(
  id: number | string,
  payload: { ruleName?: string; description?: string; category?: string; isActive?: boolean },
): Promise<AdminChecklistRuleItem> {
  const res = await apiRequest<ApiResponse<AdminChecklistRuleItem>>(`/admin/checklist-rules/${id}`, {
    method: 'PUT',
    data: payload,
  });
  return res.data;
}

export async function fetchAdminArticles(signal?: AbortSignal): Promise<AdminArticleItem[]> {
  const res = await apiRequest<ApiResponse<{ content: AdminArticleItem[] }>>('/admin/knowledge/articles?size=50', { signal });
  return res.data?.content || [];
}

export async function createAdminArticle(payload: {
  title: string;
  category: string;
  sourceUrl?: string;
  summary?: string;
  body: string;
  status?: string;
}): Promise<AdminArticleItem> {
  const res = await apiRequest<ApiResponse<AdminArticleItem>>('/admin/knowledge/articles', {
    method: 'POST',
    data: payload,
  });
  return res.data;
}

export async function updateAdminArticle(
  id: number | string,
  payload: { title: string; category: string; sourceUrl?: string; summary?: string; body: string; status?: string },
): Promise<AdminArticleItem> {
  const res = await apiRequest<ApiResponse<AdminArticleItem>>(`/admin/knowledge/articles/${id}`, {
    method: 'PUT',
    data: payload,
  });
  return res.data;
}

export async function updateAdminArticleStatus(id: number | string, status: string): Promise<AdminArticleItem> {
  const mappedStatus = status === 'APPROVED' ? 'published' : status.toLowerCase();
  const res = await apiRequest<ApiResponse<AdminArticleItem>>(`/admin/knowledge/articles/${id}/status`, {
    method: 'PATCH',
    data: { status: mappedStatus },
  });
  return res.data;
}
