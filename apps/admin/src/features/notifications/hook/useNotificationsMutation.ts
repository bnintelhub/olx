import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { NotificationsService } from '../service/notifications.service';
import { NOTIFICATIONS_QUERY_KEY, UNREAD_COUNT_QUERY_KEY } from './useNotificationsQuery';

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: NotificationsService.markAllAsRead,
    onSuccess: () => {
      // Optimistically set count to zero and invalidate lists
      queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, 0);
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark notifications as read');
    },
  });
}

export function useMarkOneNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => NotificationsService.markOneAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
}
