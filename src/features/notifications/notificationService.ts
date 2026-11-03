import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
}

export interface NotificationListResult {
  items: NotificationItem[];
  unreadCount: number;
}

export async function fetchMyNotifications(limit = 20): Promise<NotificationListResult> {
  const res = await apiRequest<ApiResponse<NotificationListResult>>(`/notifications?limit=${limit}`);
  if (!res.success || !res.data) {
    return { items: [], unreadCount: 0 };
  }
  return res.data;
}

export async function markNotificationAsRead(notificationId: number): Promise<NotificationItem | null> {
  const res = await apiRequest<ApiResponse<NotificationItem>>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
  return res.data ?? null;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiRequest<ApiResponse<void>>('/notifications/read-all', {
    method: 'PATCH',
  });
}

