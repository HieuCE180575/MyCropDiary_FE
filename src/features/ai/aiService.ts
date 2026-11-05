import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export interface AIMessageItem {
  messageId: number;
  conversationId: number;
  senderType: 'user' | 'assistant' | 'system';
  messageText: string;
  modelName?: string | null;
  createdAt: string;
  sources?: string[];
}

export interface AIConversationItem {
  conversationId: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageSnippet: string;
}

export interface AIConversationDetail {
  conversationId: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: AIMessageItem[];
}

export interface AIFeedbackItem {
  feedbackId: number;
  messageId?: number | null;
  aiResponseSnippet: string;
  rating: number;
  feedbackText: string;
  createdAt: string;
  replies: string[];
}

export async function fetchMyAIConversations(keyword?: string): Promise<AIConversationItem[]> {
  const query = keyword?.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : '';
  const res = await apiRequest<ApiResponse<AIConversationItem[]>>(`/ai/conversations${query}`);
  return res.data ?? [];
}

export async function fetchAIConversationDetail(conversationId: number): Promise<AIConversationDetail> {
  const res = await apiRequest<ApiResponse<AIConversationDetail>>(`/ai/conversations/${conversationId}`);
  if (!res.data) throw new Error(res.message || 'Không tải được chi tiết hội thoại AI.');
  return res.data;
}

export async function createAIConversation(title: string, farmId?: number): Promise<AIConversationItem> {
  const res = await apiRequest<ApiResponse<AIConversationItem>>('/ai/conversations', {
    method: 'POST',
    data: { title, farmId },
  });
  if (!res.data) throw new Error(res.message || 'Không thể tạo phiên hội thoại mới.');
  return res.data;
}

export async function askAIInConversation(conversationId: number, question: string, farmId?: number): Promise<AIMessageItem> {
  const res = await apiRequest<ApiResponse<AIMessageItem>>(`/ai/conversations/${conversationId}/messages`, {
    method: 'POST',
    data: { question, farmId },
  });
  if (!res.data) throw new Error(res.message || 'Không nhận được câu trả lời từ AI.');
  return res.data;
}

export async function askAIQuick(question: string, farmId?: number): Promise<AIMessageItem> {
  const res = await apiRequest<ApiResponse<AIMessageItem>>('/ai/ask', {
    method: 'POST',
    data: { question, farmId },
  });
  if (!res.data) throw new Error(res.message || 'Không nhận được câu trả lời từ AI.');
  return res.data;
}

export async function reportAIMessage(messageId: number, rating: number, reason: string): Promise<AIFeedbackItem> {
  const res = await apiRequest<ApiResponse<AIFeedbackItem>>(`/ai/messages/${messageId}/report`, {
    method: 'POST',
    data: { rating, reason },
  });
  if (!res.data) throw new Error(res.message || 'Không thể gửi báo cáo phản hồi.');
  return res.data;
}

export async function fetchMyAIFeedbackHistory(): Promise<AIFeedbackItem[]> {
  const res = await apiRequest<ApiResponse<AIFeedbackItem[]>>('/ai/feedback/my-history');
  return res.data ?? [];
}

export async function deleteAIConversation(conversationId: number): Promise<void> {
  await apiRequest<ApiResponse<null>>(`/ai/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}

export async function updateAIFeedback(feedbackId: number, rating: number, reason: string): Promise<AIFeedbackItem> {
  const res = await apiRequest<ApiResponse<AIFeedbackItem>>(`/ai/feedback/${feedbackId}`, {
    method: 'PUT',
    data: { rating, reason },
  });
  if (!res.data) throw new Error(res.message || 'Không thể cập nhật phản hồi.');
  return res.data;
}

