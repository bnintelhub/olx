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
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      toast.error('Your browser does not support push notifications.');
      return false;
    }

    setIsRegistering(true);
    try {
      // 1. Direct browser notification permission request
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('WhatsApp-style chat notifications enabled!');

        // Instant audio & desktop notification confirmation
        try {
          playNewMessageSound();
          new Notification('BLX Orbit — Chat Alerts Active', {
            body: 'WhatsApp-style instant notifications enabled! You will be notified of new messages.',
            icon: '/icon-192.svg',
            badge: '/icon-192.svg',
          });
        } catch (e) {
          console.warn('[Push] Welcome notification skipped:', e);
        }

        // 2. Register FCM push token if available
        try {
          await requestAndRegisterPushToken();
        } catch (fcmErr) {
          console.warn('[FCM] Token registration skipped:', fcmErr);
        }

        return true;
      }

      if (result === 'denied') {
        toast.error('Notifications are blocked in your browser. Please allow notifications in your site settings.');
        return false;
      }

      return false;
    } catch (err: any) {
      console.error('[Push] Failed to request notification permission:', err);
      toast.error('Failed to enable notifications.');
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, []);

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

