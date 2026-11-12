import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { useChatUnreadStore } from '../stores/useChatUnreadStore';
import { playNewMessageSound } from '../utils/chatSound';
import { getChatSocket } from '../services/chatSocket.service';

export function useChatNotificationListener(): void {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let isCancelled = false;

    if (!user) {
      useChatUnreadStore.getState().reset();
      return;
    }

    // Fetch initial badge count on login (skip if already on Chat page which loads inbox directly)
    if (!window.location.pathname.startsWith('/chat')) {
      void useChatUnreadStore.getState().fetchUnreadCount();
    }

    const clientBurstMap = new Map<string, { count: number; time: number }>();

    const handleConnect = () => {
      if (!window.location.pathname.startsWith('/chat')) {
        void useChatUnreadStore.getState().fetchUnreadCount();
      }
    };

    const handleMessageNew = (msg: any) => {
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
      useChatUnreadStore.getState().incrementUnread(1);

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
            navigateRef.current(clickUrl);
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
            navigateRef.current(clickUrl);
          },
        },
      });
    };

    const handleConvUpdated = () => {
      // Local badge counts are maintained by message.new and active chat read events
    };

    const handleMessageRead = () => {
      // Read receipts update status ticks without altering recipient badge count
    };

    void getChatSocket(user.id).then((sock) => {
      if (isCancelled || !sock) return;
      socketRef.current = sock;

      sock.on('connect', handleConnect);
      sock.on('message.new', handleMessageNew);
      sock.on('conversation.updated', handleConvUpdated);
      sock.on('message.read', handleMessageRead);

      if (sock.connected) {
        handleConnect();
      }
    });

    return () => {
      isCancelled = true;
      const sock = socketRef.current;
      if (sock) {
        sock.off('connect', handleConnect);
        sock.off('message.new', handleMessageNew);
        sock.off('conversation.updated', handleConvUpdated);
        sock.off('message.read', handleMessageRead);
        socketRef.current = null;
      }
    };
  }, [user?.id]);
}
