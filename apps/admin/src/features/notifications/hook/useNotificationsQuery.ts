import { useQuery } from '@tanstack/react-query';
import { NotificationsService, AdminNotificationItem } from '../service/notifications.service';

export const NOTIFICATIONS_QUERY_KEY = ['admin-notifications'] as const;
export const UNREAD_COUNT_QUERY_KEY = ['admin-notif-unread-count'] as const;

export function useNotificationsQuery(enabled = true) {
  return useQuery<AdminNotificationItem[]>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: NotificationsService.getNotifications,
    enabled,
    staleTime: 10000,
  });
}

export function useNotificationsUnreadCountQuery(enabled = true) {
  return useQuery<number>({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: NotificationsService.getUnreadCount,
    enabled,
    staleTime: 10000,
  });
}
