import { apiClient } from '../../../lib/api-client';

export interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

export class NotificationsService {
  // Fetches recent staff notifications
  static async getNotifications(): Promise<AdminNotificationItem[]> {
    const res = await apiClient.get('/notifications');
    return res.data?.data || [];
  }

  // Fetches unread notifications count
  static async getUnreadCount(): Promise<number> {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data?.count ?? 0;
  }

  // Marks all unread notifications as read
  static async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  }

  // Marks a single notification as read
  static async markOneAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  }
}
