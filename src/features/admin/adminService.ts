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

export async function fetchAdminStatistics(signal?: AbortSignal): Promise<AdminStatisticsData> {
  const res = await apiRequest<ApiResponse<AdminStatisticsData>>('/admin/statistics/overview', { signal });
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

export async function fetchAdminChecklistRules(signal?: AbortSignal): Promise<AdminChecklistRuleItem[]> {
  const res = await apiRequest<ApiResponse<AdminChecklistRuleItem[]>>('/admin/checklist-rules', { signal });
  return res.data;
}

export async function fetchAdminArticles(signal?: AbortSignal): Promise<AdminArticleItem[]> {
  const res = await apiRequest<ApiResponse<{ content: AdminArticleItem[] }>>('/admin/knowledge/articles?size=50', { signal });
  return res.data?.content || [];
}

