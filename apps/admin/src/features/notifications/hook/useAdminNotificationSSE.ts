import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '../../../stores/auth.store';
import { playNotificationChime } from '../../../lib/sound';
import { NOTIFICATIONS_QUERY_KEY, UNREAD_COUNT_QUERY_KEY } from './useNotificationsQuery';

export function useAdminNotificationSSE() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);

  const connectSSE = useCallback(() => {
    if (!user || typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const stream = new EventSource('/api/v1/notifications/stream?context=admin', {
      withCredentials: true,
    });
    eventSourceRef.current = stream;

    stream.onopen = () => {
      retryCountRef.current = 0;
      void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    };

    stream.addEventListener('ready', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.unreadCount !== undefined) {
          queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, payload.unreadCount);
        }
      } catch {
        // Ignore parse error on handshake
      }
    });

    stream.addEventListener('notification', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (!data?.id) return;

        // Skip support_activity events in generic notification listener (handled exclusively by support_activity listener)
        if (data.type === 'support_activity') return;

        // Idempotency: skip already seen events
        if (seenIdsRef.current.has(data.id)) return;
        seenIdsRef.current.add(data.id);
        if (seenIdsRef.current.size > 100) {
          const firstKey = seenIdsRef.current.values().next().value;
          if (firstKey) seenIdsRef.current.delete(firstKey);
        }

        // Play crystal-clear notification chime
        playNotificationChime();

        // Invalidate notifications queries
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });

        const ticketId = data.data?.ticketId;
        if (ticketId) {
          void queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'tickets'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'ticket', ticketId] });
          void queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
        }

        const clickUrl = data.data?.clickUrl || (ticketId ? `/support?ticketId=${ticketId}` : null);

        toast(data.title, {
          id: data.id,
          description: data.message,
          duration: 6000,
          action: clickUrl
            ? {
                label: 'View',
                onClick: () => navigate(clickUrl),
              }
            : undefined,
        });
      } catch (err) {
        console.warn('[Admin SSE] Error processing notification:', err);
      }
    });

    stream.addEventListener('support_activity', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const dedupKey = `support-${data.ticketId || data.ticketNumber}-${data.type || 'EVENT'}`;

        // Idempotency check: prevent duplicate toasts for the same support ticket event
        if (seenIdsRef.current.has(dedupKey)) return;
        seenIdsRef.current.add(dedupKey);
        if (seenIdsRef.current.size > 100) {
          const firstKey = seenIdsRef.current.values().next().value;
          if (firstKey) seenIdsRef.current.delete(firstKey);
        }

        // Play chime on incoming customer support inquiry
        playNotificationChime();

        void queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'tickets'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'ticket'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'stats'] });
        void queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
        void queryClient.invalidateQueries({ queryKey: ['support-stats'] });
        void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

        const isNewTicket = data.type === 'TICKET_CREATED';
        const label = isNewTicket ? 'New Support Ticket' : 'Customer Reply';

        toast.info(`${label}: #${data.ticketNumber || ''}`, {
          id: dedupKey,
          description: data.subject || data.message || 'Customer inquiry updated',
          duration: 7000,
          action: {
            label: 'View Desk',
            onClick: () => navigate(data.ticketId ? `/support?ticketId=${data.ticketId}` : '/support'),
          },
        });
      } catch (err) {
        console.warn('[Admin SSE] Error processing support_activity:', err);
      }
    });

    stream.onerror = () => {
      if (stream.readyState === EventSource.CLOSED) {
        stream.close();
      }

      // Exponential backoff reconnect
      const delay = Math.min(2000 * Math.pow(1.5, retryCountRef.current), 30000);
      retryCountRef.current += 1;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        if (user) {
          connectSSE();
        }
      }, delay);
    };
  }, [user, navigate, queryClient]);

  useEffect(() => {
    if (user) {
      connectSSE();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user, connectSSE]);
}
