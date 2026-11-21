import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { apiClient } from '@/lib/api-client';
import { playNotificationSound } from '@/lib/soundService';

export interface SSENotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  unreadCount?: number;
  createdAt: string;
}

export function useNotificationSSE() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Set of recently handled notification IDs for duplicate prevention / idempotency
  const seenIdsRef = useRef<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);

  // Sync latest notifications and unread count from REST API (used on mount & reconnect)
  const syncMissedNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiClient.get('/notifications/unread-count');
      const count = response.data?.count ?? 0;
      setUnreadCount(count);
      queryClient.setQueryData(['notifications-unread-count', user.id], { count });
      queryClient.setQueryData(['notifications-unread-count'], { count });
      // Invalidate queries so UI reflects latest state without refresh
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user.id] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      void queryClient.invalidateQueries({ queryKey: ['client', 'support', 'tickets'] });
      void queryClient.invalidateQueries({ queryKey: ['client', 'support', 'ticket'] });
      void queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    } catch {
      // Background sync silently catches error
    }
  }, [user, queryClient]);

  // Connects to SSE stream
  const connectSSE = useCallback(() => {
    if (!user || typeof window === 'undefined') return;

    // Clean up existing instance before creating a new one
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const streamUrl = `/api/v1/notifications/stream`;
    const es = new EventSource(streamUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      retryCountRef.current = 0;
      // Fetch any notifications missed while offline
      void syncMissedNotifications();
    };

    // Ready handshake event from backend
    es.addEventListener('ready', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.unreadCount !== undefined) {
          setUnreadCount(payload.unreadCount);
          queryClient.setQueryData(['notifications-unread-count', user.id], { count: payload.unreadCount });
          queryClient.setQueryData(['notifications-unread-count'], { count: payload.unreadCount });
        }
      } catch {
        // Ignore JSON parse errors on handshake
      }
    });

    // Multi-tab unread count sync event (e.g. when Tab A marks one or all as read)
    es.addEventListener('unread_sync', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.unreadCount !== undefined) {
          setUnreadCount(payload.unreadCount);
          queryClient.setQueryData(['notifications-unread-count', user.id], { count: payload.unreadCount });
          queryClient.setQueryData(['notifications-unread-count'], { count: payload.unreadCount });
          void queryClient.invalidateQueries({ queryKey: ['notifications'] });
          void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        }
      } catch {
        // Ignore JSON parse errors
      }
    });

    // Real-time notification event
    es.addEventListener('notification', (event: MessageEvent) => {
      try {
        const data: SSENotificationPayload = JSON.parse(event.data);
        if (!data?.id || data.type === 'CHAT_MESSAGE') return;

        // Idempotency check: ignore already processed notification IDs
        if (seenIdsRef.current.has(data.id)) {
          return;
        }

        // Store up to 100 recent IDs to prevent unbounded memory growth
        seenIdsRef.current.add(data.id);
        if (seenIdsRef.current.size > 100) {
          const firstKey = seenIdsRef.current.values().next().value;
          if (firstKey) seenIdsRef.current.delete(firstKey);
        }

        // Update unread count badge directly from authoritative payload
        if (data.unreadCount !== undefined) {
          setUnreadCount(data.unreadCount);
        } else {
          setUnreadCount((prev) => prev + 1);
        }

        // Invalidate queries so lists and badges update live across tabs
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });

        if (data.data?.ticketId) {
          void queryClient.invalidateQueries({ queryKey: ['client', 'support', 'tickets'] });
          void queryClient.invalidateQueries({ queryKey: ['client', 'support', 'ticket', data.data.ticketId] });
          void queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
          void queryClient.invalidateQueries({ queryKey: ['support-ticket', data.data.ticketId] });
        }

        // Multi-tab sound & toast coordination:
        // Only one tab (the active one, or first to claim within 2s) renders the toast and plays audio
        const tabCoordinationKey = `blx_toast_handled_${data.id}`;
        let alreadyHandledBySiblingTab = false;
        try {
          alreadyHandledBySiblingTab = Boolean(localStorage.getItem(tabCoordinationKey));
          if (!alreadyHandledBySiblingTab) {
            localStorage.setItem(tabCoordinationKey, `${Date.now()}`);
            setTimeout(() => {
              try { localStorage.removeItem(tabCoordinationKey); } catch {}
            }, 8000);
          }
        } catch {
          // Fallback if localStorage is unavailable
        }

        if (alreadyHandledBySiblingTab) {
          return;
        }

        // Play audio chime
        playNotificationSound();

        // Display in-app Sonner toast with deep-linking & deterministic dedup ID
        const ticketId = data.data?.ticketId;
        const targetUrl = ticketId ? `/support?ticketId=${ticketId}` : (data.data?.clickUrl || null);

        const handleToastAction = () => {
          // Immediately mark read on click
          void apiClient.patch(`/notifications/${data.id}/read`).finally(() => {
            void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
          });
          if (ticketId) {
            void queryClient.invalidateQueries({ queryKey: ['client', 'support', 'ticket', ticketId] });
            void queryClient.invalidateQueries({ queryKey: ['client', 'support', 'tickets'] });
          }
          if (targetUrl) {
            navigate(targetUrl);
          }
        };

        toast(data.title, {
          id: data.id, // Stable event ID prevents duplicate Sonner toasts across renders
          description: data.message,
          duration: 6000,
          action: targetUrl
            ? {
                label: 'View',
                onClick: handleToastAction,
              }
            : undefined,
        });
      } catch (err) {
        console.warn('[SSE] Error handling incoming notification event:', err);
      }
    });

    // Stream error / disconnect handler with exponential backoff reconnect
    es.onerror = () => {
      setIsConnected(false);
      if (es.readyState === EventSource.CLOSED) {
        es.close();
      }

      // Exponential backoff: min 2s, max 30s
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
  }, [user, navigate, queryClient, syncMissedNotifications]);

  // Establish SSE connection when logged in; disconnect on logout/unmount
  useEffect(() => {
    if (user) {
      connectSSE();
    } else {
      setIsConnected(false);
      setUnreadCount(0);
      seenIdsRef.current.clear();
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

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setUnreadCount(0);
      queryClient.setQueryData(['notifications-unread-count'], { count: 0 });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  }, [queryClient]);

  return {
    isConnected,
    unreadCount,
    markAllAsRead,
    refreshUnreadCount: syncMissedNotifications,
  };
}
