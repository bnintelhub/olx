import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { executeSilentRefresh } from '@/lib/api-client';
import { useChatUnreadStore } from '../stores/useChatUnreadStore';
import { playNewMessageSound } from '../utils/chatSound';

export function useChatNotificationListener(): void {
  const { user, token } = useAuthStore();
  const { fetchUnreadCount, incrementUnread, reset } = useChatUnreadStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      reset();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Fetch initial badge count on login
    void fetchUnreadCount();

    const activeToken =
      token ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('olx_access_token') || localStorage.getItem('token')
        : null);

    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: activeToken || '' },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect_error', async (err) => {
      if (err.message.includes('AUTHENTICATION_REQUIRED')) {
        await executeSilentRefresh();
        const freshToken = localStorage.getItem('olx_access_token');
        if (freshToken && socketRef.current) socketRef.current.auth = { token: freshToken };
      }
    });

    // Refresh unread count on reconnecting to a server replica
    socket.on('connect', () => {
      void fetchUnreadCount();
    });

    const clientBurstMap = new Map<string, { count: number; time: number }>();

    socket.on('message.new', (msg: any) => {
      // Rule: Never notify for self-sent messages
      if (!msg || msg.senderId === user.id) return;

      // Rule: Never notify if user is actively viewing this same chat
      const currentActiveChatId = useChatUnreadStore.getState().activeConversationId;
      const isActivelyViewingChat =
        (currentActiveChatId === msg.conversationId && document.visibilityState === 'visible') ||
        (window.location.pathname.startsWith('/chat') &&
          document.visibilityState === 'visible' &&
          (window.location.search.includes(msg.conversationId) ||
            window.location.pathname.includes(msg.conversationId)));

      if (isActivelyViewingChat) {
        return; // User is already inside this conversation; suppress push and toast
      }

      playNewMessageSound();
      incrementUnread(1);

      const senderName = msg.sender?.profile?.name || 'New Message';
      const text = msg.content || (msg.attachmentUrl ? '📷 Photo' : 'Sent an attachment');
      const clickUrl = `/chat?conversationId=${msg.conversationId}`;

      // Bundling: Track rapid messages within 10 seconds
      const now = Date.now();
      const prevBurst = clientBurstMap.get(msg.conversationId);
      const burstCount = prevBurst && now - prevBurst.time < 10000 ? prevBurst.count + 1 : 1;
      clientBurstMap.set(msg.conversationId, { count: burstCount, time: now });

      const notificationBody =
        burstCount > 1 ? `${burstCount} new messages: "${text.slice(0, 50)}"` : text;

      // 1. Browser Native Notification (WhatsApp style)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const options: any = {
            body: notificationBody,
            icon: msg.sender?.profile?.avatarUrl || '/icon-192.svg',
            badge: '/icon-192.svg',
            tag: `conv_${msg.conversationId}`,
            renotify: true,
          };
          const notif = new Notification(senderName, options);
          notif.onclick = () => {
            window.focus();
            window.location.href = clickUrl;
          };
        } catch (e) {
          console.warn('[Notification] Native push display error:', e);
        }
      }

      // 2. In-App Toast
      toast(senderName, {
        description: notificationBody,
        duration: 4000,
        action: {
          label: 'Reply',
          onClick: () => {
            window.location.href = clickUrl;
          },
        },
      });
    });

    socket.on('conversation.updated', () => {
      void fetchUnreadCount();
    });

    socket.on('message.read', () => {
      void fetchUnreadCount();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, token, fetchUnreadCount, incrementUnread, reset]);
}

