import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { playNewMessageSound } from '@/features/chat/utils/chatSound';
import {
  requestAndRegisterPushToken,
  setupForegroundPushListener,
} from './firebaseMessaging';

export function usePushNotifications() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  // Auto-sync token if permission is already granted for logged-in user
  useEffect(() => {
    if (!user || permission !== 'granted') return;
    void requestAndRegisterPushToken();
  }, [user, permission]);

  // Handle foreground notifications with WhatsApp-like toast banner & chime
  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | null = null;
    void setupForegroundPushListener((payload) => {
      playNewMessageSound();

      const title = payload.notification?.title || payload.data?.title || payload.data?.senderName || 'New Message';
      const body = payload.notification?.body || payload.data?.body || payload.data?.messageText || 'Sent a new message';
      const conversationId = payload.data?.conversationId;

      toast(title, {
        description: body,
        duration: 5000,
        action: conversationId
          ? {
              label: 'View',
              onClick: () => {
                navigateRef.current(`/chat?conversationId=${conversationId}`);
              },
            }
          : undefined,
      });
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const enablePush = useCallback(async () => {
    if (permission === 'unsupported') return false;
    setIsRegistering(true);
    try {
      await requestAndRegisterPushToken();
      const currentPerm =
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
      setPermission(currentPerm);

      if (currentPerm === 'granted') {
        try {
          new Notification('OLX Notifications Active', {
            body: 'WhatsApp-style chat alerts enabled! You will be notified of new messages.',
            icon: '/icon-192.svg',
          });
        } catch {}
      }
      return currentPerm === 'granted';
    } finally {
      setIsRegistering(false);
    }
  }, [permission]);

  const sendTestNotification = useCallback(async () => {
    try {
      const res = await apiClient.post('/notifications/test-push', {});
      return res.data?.success ?? false;
    } catch (err) {
      console.error('Failed sending test push:', err);
      return false;
    }
  }, []);

  return {
    permission,
    isRegistering,
    enablePush,
    sendTestNotification,
  };
}

