import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
import { ArrowLeft, ShieldCheck, AlertCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient, getInMemoryAccessToken } from '@/lib/api-client';
import { ChatConversationList, ConversationItem } from '../components/ChatConversationList';
import { ChatMessageThread, MessageItem } from '../components/ChatMessageThread';
import { ChatErrorBoundary } from '../components/ChatErrorBoundary';
import { ChatAuthRequired } from '../components/ChatAuthRequired';
import { playNewMessageSound } from '../utils/chatSound';
import { useChatUnreadStore } from '../stores/useChatUnreadStore';
import { getChatSocket } from '../services/chatSocket.service';

function sortConversationsDesc(list: ConversationItem[]): ConversationItem[] {
  return [...list].sort((a, b) => {
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });
}

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { conversationId: routeConvId } = useParams();
  const targetConvIdParam = searchParams.get('conversationId') || routeConvId || null;
  const targetAdId = searchParams.get('adId');

  const { user, token, openAuthModal, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const getActiveToken = (): string | null => token || getInMemoryAccessToken();
  const hasSession = Boolean(userId || getActiveToken());

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(() => targetConvIdParam);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatAlert, setChatAlert] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [activeConvDetails, setActiveConvDetails] = useState<ConversationItem | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const lastSentRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const socketRef = useRef<Socket | null>(null);
  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = activeConvId;
  const readConversationsRef = useRef<Set<string>>(new Set());
  const lastFetchedConvIdRef = useRef<string | null>(null);
  const isFetchingInboxRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<any>(null);
  const fetchConversationMessagesRef = useRef<((id: string) => void) | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior });
  };

  // 1. Subscribe to shared Socket.IO connection
  useEffect(() => {
    if (!user?.id) return;

    let socket: Socket | null = null;
    let isMounted = true;

    const handleConnect = () => {
      if (activeConvIdRef.current) {
        socket?.emit('conversation.join', { conversationId: activeConvIdRef.current });
        fetchConversationMessagesRef.current?.(activeConvIdRef.current);
      }
    };

    const handleChatReady = () => {
      if (activeConvIdRef.current) socket?.emit('conversation.join', { conversationId: activeConvIdRef.current });
    };

    const handleMessageNew = (msg: MessageItem) => {
      const currentActiveId = activeConvIdRef.current;
      const isCurrentActive = msg.conversationId === currentActiveId;
      const isFromMe = msg.senderId === user?.id;

      if (!isFromMe) {
        playNewMessageSound();
      }

      if (isCurrentActive) {
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) =>
              m.id === msg.id ||
              ((m as any).clientMessageId && (m as any).clientMessageId === (msg as any).clientMessageId) ||
              (m.id.startsWith('temp-') && m.content === msg.content && m.senderId === msg.senderId)
          );
          if (idx !== -1) {
            const existing = prev[idx];
            const next = [...prev];
            next[idx] = {
              ...msg,
              attachmentUrl: (existing as any).localPreviewUrl || (existing.attachmentUrl?.startsWith('blob:') ? existing.attachmentUrl : msg.attachmentUrl),
              localPreviewUrl: (existing as any).localPreviewUrl,
            };
            return next;
          }
          // Prevent duplicate message if already in state
          if (prev.some((m) => m.id === msg.id)) {
            return prev;
          }
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom('smooth'), 50);
        if (!isFromMe) {
          socket?.emit('message.read', { conversationId: currentActiveId });
          void apiClient.patch(`/chat/conversations/${currentActiveId}/read`).catch(() => {});
          useChatUnreadStore.getState().fetchUnreadCount();
        }
      }

      const msgTime = typeof msg.createdAt === 'string' ? msg.createdAt : new Date(msg.createdAt).toISOString();
      const msgText = msg.content || (msg.attachmentUrl ? 'Photo' : 'New message');

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === msg.conversationId);
        if (!exists) {
          void fetchInbox(false);
          return prev;
        }
        const updated = prev.map((c) => {
          if (c.id !== msg.conversationId) return c;
          return {
            ...c,
            lastMessageText: msgText,
            lastMessageAt: msgTime,
            // Only increment unread count if message is from the other person AND we're not actively inside this conversation
            unreadCount: (isCurrentActive || isFromMe) ? 0 : c.unreadCount + 1,
          };
        });
        return sortConversationsDesc(updated);
      });
    };

    const handleConvUpdated = (data: { conversationId: string; lastMessageText: string; lastMessageAt: string; senderId?: string }) => {
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== data.conversationId) return c;
          return {
            ...c,
            lastMessageText: data.lastMessageText,
            lastMessageAt: data.lastMessageAt,
          };
        });
        return sortConversationsDesc(updated);
      });
    };

    const handleMessageSent = (data: { messageId: string; clientMessageId?: string; status: string }) => {
      if (data.clientMessageId) {
        setMessages((prev) =>
          prev.map((m) => {
            if ((m as any).clientMessageId === data.clientMessageId) {
              return { ...m, id: data.messageId, status: (data.status as any) || m.status || 'SENT' };
            }
            return m;
          })
        );
      }
    };

    const handleMessageRead = (data: { conversationId: string; readerId: string }) => {
      if (data.conversationId === activeConvIdRef.current && data.readerId !== user?.id) {
        setMessages((prev) => prev.map((m) => (m.senderId === user?.id ? { ...m, status: 'READ' } : m)));
      }
    };

    const handleMessageDelivered = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === activeConvIdRef.current) {
        setMessages((prev) => prev.map((m) => (m.id === data.messageId && m.status === 'SENT' ? { ...m, status: 'DELIVERED' } : m)));
      }
    };

    const handleTypingStart = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConvIdRef.current && data.userId !== user?.id) setIsOtherTyping(true);
    };

    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConvIdRef.current && data.userId !== user?.id) setIsOtherTyping(false);
    };

    const handlePresenceUpdate = (data: { userId: string; isOnline: boolean }) => {
      setConversations((prev) => prev.map((c) => (c.otherParty.id === data.userId ? { ...c, otherParty: { ...c.otherParty, isOnline: data.isOnline } } : c)));
    };

    void getChatSocket(user.id).then((sock) => {
      if (!isMounted || !sock) return;
      socket = sock;
      socketRef.current = sock;

      sock.on('connect', handleConnect);
      sock.on('chat:ready', handleChatReady);
      sock.on('message.new', handleMessageNew);
      sock.on('conversation.updated', handleConvUpdated);
      sock.on('message.sent', handleMessageSent);
      sock.on('message.read', handleMessageRead);
      sock.on('message.delivered', handleMessageDelivered);
      sock.on('typing.start', handleTypingStart);
      sock.on('typing.stop', handleTypingStop);
      sock.on('presence.update', handlePresenceUpdate);

      if (sock.connected) {
        handleConnect();
      }
    });

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('chat:ready', handleChatReady);
        socket.off('message.new', handleMessageNew);
        socket.off('conversation.updated', handleConvUpdated);
        socket.off('message.sent', handleMessageSent);
        socket.off('message.read', handleMessageRead);
        socket.off('message.delivered', handleMessageDelivered);
        socket.off('typing.start', handleTypingStart);
        socket.off('typing.stop', handleTypingStop);
        socket.off('presence.update', handlePresenceUpdate);
      }
    };
  }, [user?.id]);

  // 2. Room membership join when active conversation switches
  useEffect(() => {
    useChatUnreadStore.getState().setActiveConversationId(activeConvId);
    if (!activeConvId) return;

    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/chat')) {
      const currentParam = new URLSearchParams(window.location.search).get('conversationId');
      if (currentParam !== activeConvId) {
        window.history.replaceState(null, '', `/chat?conversationId=${activeConvId}`);
      }
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('conversation.join', { conversationId: activeConvId });
    }

    return () => {
      useChatUnreadStore.getState().setActiveConversationId(null);
      socketRef.current?.emit('conversation.leave', { conversationId: activeConvId });
    };
  }, [activeConvId]);

  // Sync unread count on ChatPage unmount
  useEffect(() => {
    return () => {
      useChatUnreadStore.getState().setActiveConversationId(null);
      void useChatUnreadStore.getState().fetchUnreadCount();
    };
  }, []);

  // Optimized mark as read: updates local badge and notifies backend + socket
  const markConversationAsRead = React.useCallback((convId: string) => {
    if (!convId) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit('message.read', { conversationId: convId });
    }
    void apiClient.patch(`/chat/conversations/${convId}/read`).catch(() => {});

    setConversations((prev) => {
      const target = prev.find((c) => c.id === convId);
      const unread = target?.unreadCount || 0;

      if (unread > 0) {
        useChatUnreadStore.getState().decrementUnread(unread);
      }

      if (unread === 0 && readConversationsRef.current.has(convId)) {
        return prev;
      }
      readConversationsRef.current.add(convId);

      return prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c));
    });
  }, []);

  // 3. Fetch conversations inbox in parallel without waiting for serial auth waterfall
  const fetchInbox = React.useCallback(async (isInitial = false) => {
    if (!hasSession || isFetchingInboxRef.current) return;
    isFetchingInboxRef.current = true;
    if (isInitial) setLoading(true);
    try {
      let targetConvId: string | null = null;
      let targetConvItem: ConversationItem | null = null;
      if (targetAdId) {
        try {
          const startRes = await apiClient.post('/chat/conversations', { adId: targetAdId });
          if (startRes.data?.success && startRes.data.data?.id) {
            targetConvId = startRes.data.data.id;
            targetConvItem = startRes.data.data;
            setActiveConvDetails(startRes.data.data);
            setActiveConvId(targetConvId);
            setMobileShowThread(true);
          }
        } catch (err: any) {
          const errMsg = err.response?.data?.message;
          if (errMsg) setChatAlert(errMsg);
        }
      }

      const res = await apiClient.get('/chat/conversations');
      let convList: ConversationItem[] = res.data?.data?.conversations || (Array.isArray(res.data?.data) ? res.data.data : []);
      if (targetConvItem && !convList.some((c) => c.id === targetConvItem!.id)) {
        convList = [targetConvItem, ...convList];
      }
      convList = sortConversationsDesc(convList);

      const initialActiveId = targetConvId || targetConvIdParam || (convList.length > 0 && !activeConvIdRef.current ? convList[0].id : activeConvIdRef.current);

      // Immediately sync store with all other conversations' unread count (excluding active chat)
      const otherUnreadTotal = convList
        .filter((c) => c.id !== initialActiveId)
        .reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0);
      useChatUnreadStore.getState().setUnreadCount(otherUnreadTotal);

      if (initialActiveId) {
        const activeItem = convList.find((c) => c.id === initialActiveId);
        if (activeItem && activeItem.unreadCount > 0) {
          if (socketRef.current?.connected) {
            socketRef.current.emit('message.read', { conversationId: initialActiveId });
          }
          void apiClient.patch(`/chat/conversations/${initialActiveId}/read`).catch(() => {});
        }
        convList = convList.map((c) => (c.id === initialActiveId ? { ...c, unreadCount: 0 } : c));
      }
      setConversations(convList);

      // Prioritize explicit target conversation from param, route, or ad click
      const selectedId = targetConvId || targetConvIdParam || (!activeConvIdRef.current && convList.length > 0 ? convList[0].id : null);
      if (selectedId) {
        if (selectedId !== activeConvIdRef.current) {
          setActiveConvId(selectedId);
        }
        markConversationAsRead(selectedId);
        if (targetConvId || targetConvIdParam) setMobileShowThread(true);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      isFetchingInboxRef.current = false;
      if (isInitial) setLoading(false);
    }
  }, [hasSession, targetAdId, targetConvIdParam, markConversationAsRead]);

  useEffect(() => {
    if (hasSession) {
      void fetchInbox(true);
    }
  }, [hasSession, targetAdId, targetConvIdParam, fetchInbox]);

  // 4. Load active conversation messages concurrently without blocking UI
  const fetchConversationMessages = React.useCallback(async (convId: string, force = false) => {
    if (!convId || !hasSession) return;
    if (!force && lastFetchedConvIdRef.current === convId) return;
    lastFetchedConvIdRef.current = convId;
    try {
      const res = await apiClient.get(`/chat/conversations/${convId}/messages?limit=30`);
      if (res.data?.success && res.data.data?.messages) {
        setMessages(res.data.data.messages);
        setNextCursor(res.data.data.nextCursor || null);
        if (res.data.data.conversation) {
          const fetchedConv = res.data.data.conversation;
          setActiveConvDetails(fetchedConv);
          setConversations((prev) => {
            if (!prev.some((c) => c.id === convId)) {
              return sortConversationsDesc([fetchedConv, ...prev]);
            }
            return prev;
          });
        }
        setTimeout(() => scrollToBottom('auto'), 50);
        markConversationAsRead(convId);
      }
    } catch (err: any) {
      console.error('Failed to fetch messages', err);
      const errMsg = err.response?.data?.message;
      if (errMsg && errMsg.includes('Access denied')) {
        setChatAlert('Access denied to this conversation. You are not a participant in this chat.');
      }
    }
  }, [hasSession, markConversationAsRead]);
  fetchConversationMessagesRef.current = fetchConversationMessages;

  useEffect(() => {
    if (activeConvId) void fetchConversationMessages(activeConvId);
  }, [activeConvId, fetchConversationMessages]);

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (activeConvId && socketRef.current) {
      socketRef.current.emit('typing.start', { conversationId: activeConvId });
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit('typing.stop', { conversationId: activeConvId });
      }, 2000);
    }
  };

  const handleSendMessage = async (customText?: string, attachmentUrl?: string, localPreviewUrl?: string) => {
    const textToSend = (customText || inputText).trim();
    if ((!textToSend && !attachmentUrl) || !activeConvId || isSendingRef.current || isSending) return;

    // Deduplicate rapid identical submissions within 2 seconds
    const now = Date.now();
    if (textToSend && lastSentRef.current.text === textToSend && now - lastSentRef.current.time < 2000) {
      return;
    }
    lastSentRef.current = { text: textToSend, time: now };
    isSendingRef.current = true;
    setIsSending(true);

    const clientMessageId = crypto.randomUUID();
    const tempId = `temp-${now}`;
    const payload = {
      conversationId: activeConvId,
      content: textToSend,
      attachmentUrl,
      clientMessageId,
    };

    // Optimistic message append
    const optimisticMsg: MessageItem = {
      id: tempId,
      conversationId: activeConvId,
      senderId: user!.id,
      content: textToSend,
      attachmentUrl: localPreviewUrl || attachmentUrl || null,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };
    (optimisticMsg as any).localPreviewUrl = localPreviewUrl;
    (optimisticMsg as any).clientMessageId = clientMessageId;
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom('smooth'), 50);
    setInputText('');
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === activeConvId
          ? { ...c, lastMessageText: textToSend || 'Photo', lastMessageAt: new Date().toISOString(), unreadCount: 0 }
          : c
      );
      return sortConversationsDesc(updated);
    });

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('message.send', payload, (res: any) => {
          if (res?.success && res.data) {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === tempId || (m as any).clientMessageId === clientMessageId) {
                  return {
                    ...res.data,
                    attachmentUrl: (m as any).localPreviewUrl || (m.attachmentUrl?.startsWith('blob:') ? m.attachmentUrl : res.data.attachmentUrl),
                    localPreviewUrl: (m as any).localPreviewUrl,
                    status: res.data.status || 'SENT',
                    isDeleted: false,
                  };
                }
                return m;
              })
            );
            if (res.safetyNotice) setChatAlert(res.safetyNotice);
          } else if (res?.error) {
            setChatAlert(res.error);
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          }
        });
      } else {
        try {
          const res = await apiClient.post(`/chat/conversations/${activeConvId}/messages`, payload);
          if (res.data?.success && res.data.data) {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? {
              ...res.data.data,
              attachmentUrl: (m as any).localPreviewUrl || (m.attachmentUrl?.startsWith('blob:') ? m.attachmentUrl : res.data.data.attachmentUrl),
              localPreviewUrl: (m as any).localPreviewUrl,
              isDeleted: false
            } : m)));
            if (res.data.safetyNotice) setChatAlert(res.data.safetyNotice);
          } else {
            setChatAlert(res.data?.message || 'Unable to send message');
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          }
        } catch (postErr: any) {
          setChatAlert(postErr.response?.data?.message || 'Unable to send message');
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setTimeout(() => {
        isSendingRef.current = false;
        setIsSending(false);
      }, 350);
    }
  };

  const handleLoadOlder = async () => {
    if (!activeConvId || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await apiClient.get(`/chat/conversations/${activeConvId}/messages?cursor=${nextCursor}&limit=30`);
      if (res.data?.success && res.data.data?.messages) {
        setMessages((prev) => [...res.data.data.messages, ...prev]);
        setNextCursor(res.data.data.nextCursor || null);
      }
    } catch (err) { console.error('Failed loading older messages', err); } finally { setLoadingOlder(false); }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await apiClient.delete(`/chat/messages/${messageId}`);
      if (res.data?.success) setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: 'This message was deleted', isDeleted: true } : m)));
    } catch (err) { console.error('Failed to delete message', err); }
  };

  const handleBlockUser = async (targetUserId: string) => {
    try {
      const res = await apiClient.post('/chat/users/block', { targetUserId });
      if (res.data?.success) {
        setConversations((prev) => prev.map((c) => (c.otherParty.id === targetUserId ? { ...c, isBlocked: true } : c)));
        setChatAlert('User blocked. Messaging is restricted.');
      }
    } catch (err) { console.error('Failed to block user', err); }
  };

  const handleReportChat = async (reason: string, details?: string) => {
    try {
      const res = await apiClient.post('/chat/reports', { conversationId: activeConvId, reason, details });
      if (res.data?.success) setChatAlert('Report submitted to moderation team. Thank you.');
    } catch (err) { console.error('Failed to submit report', err); }
  };

  if (isAuthLoading && !hasSession) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#002f34] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-gray-500">Loading chat...</span>
        </div>
      </div>
    );
  }

  if (!user && !isAuthLoading && !hasSession) return <ChatAuthRequired onLogin={openAuthModal} />;
  const activeConversation = conversations.find((c) => c.id === activeConvId) || activeConvDetails;

  return (
    <div className="w-full h-screen flex flex-col bg-white overflow-hidden select-none">
      {/* Top Header Bar - Full width edge-to-edge */}
      <div className="w-full bg-[#002f34] text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-[#003d44] shadow-sm flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition cursor-pointer" title="Back to Home">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">BLX Orbit Messages</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2 py-0.5 rounded-full text-teal-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified & Protected
              </span>
            </div>
            <p className="text-[11px] text-gray-300 hidden sm:block">Direct, real-time negotiation between verified buyers and sellers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-300 hidden md:inline">
            Logged in as <strong className="text-white">{user?.profile?.name || user?.email || user?.phoneNumber || 'User'}</strong>
          </span>
        </div>
      </div>

      {/* Safety Alert Banner */}
      {chatAlert && (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-amber-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{chatAlert}</span>
          </div>
          <button onClick={() => setChatAlert(null)} className="text-amber-700 hover:text-amber-900 font-bold text-xs cursor-pointer">✕</button>
        </div>
      )}

      {/* Chat Split Container - Full page width and height */}
      <div className="w-full flex-1 flex min-h-0 min-w-0 overflow-hidden bg-white">
        {/* Left Side: Conversation List */}
        <div className={`w-full md:w-88 lg:w-96 flex-shrink-0 border-r border-gray-200 flex flex-col min-h-0 h-full ${mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
          <ChatConversationList
            conversations={conversations}
            activeConvId={activeConvId}
            loading={loading}
            onSelectConversation={(id) => {
              if (id !== activeConvId) {
                setChatAlert(null);
                setActiveConvId(id);
                markConversationAsRead(id);
              }
              setMobileShowThread(true);
            }}
          />
        </div>

        {/* Right Side: Message Thread */}
        <div className={`flex-1 flex flex-col min-w-0 min-h-0 h-full ${!mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
          {mobileShowThread && (
            <div className="md:hidden bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center flex-shrink-0">
              <button onClick={() => setMobileShowThread(false)} className="flex items-center gap-1.5 text-xs font-bold text-[#002f34] p-1.5 rounded-lg hover:bg-gray-200 transition cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
                <span>All Conversations</span>
              </button>
            </div>
          )}

          <ChatErrorBoundary>
            <ChatMessageThread
              conversation={activeConversation} currentUserId={user?.id}
              messages={messages} inputText={inputText}
              onInputChange={handleInputChange} onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage} onBlockUser={handleBlockUser}
              onReportChat={handleReportChat} isOtherTyping={isOtherTyping}
              messagesEndRef={messagesEndRef} messagesContainerRef={messagesContainerRef}
              hasMoreOlder={Boolean(nextCursor)} loadingOlder={loadingOlder}
              onLoadOlder={handleLoadOlder} isSending={isSending}
            />
          </ChatErrorBoundary>
        </div>
      </div>
    </div>
  );
};
