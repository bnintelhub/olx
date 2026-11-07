import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, ShieldCheck, AlertCircle, LogIn, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient, executeSilentRefresh } from '@/lib/api-client';
import { ChatConversationList, ConversationItem } from '../components/ChatConversationList';
import { ChatMessageThread, MessageItem } from '../components/ChatMessageThread';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetAdId = searchParams.get('adId');

  const { user, token, openAuthModal } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
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
  const lastSentRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  const socketRef = useRef<Socket | null>(null);
  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = activeConvId;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<any>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior });
  };

  const getActiveToken = (): string | null => {
    return token || localStorage.getItem('olx_access_token') || localStorage.getItem('token');
  };

  // 1. Initialize persistent Socket.IO connection (Once per authenticated user session)
  useEffect(() => {
    if (!user?.id) return;
    if (socketRef.current?.connected) return;

    let socket: Socket | null = null;
    let isMounted = true;

    const initSocket = async () => {
      let activeToken = getActiveToken();
      if (!activeToken) {
        await executeSilentRefresh();
        activeToken = getActiveToken();
      }
      if (!isMounted) return;

      const socketUrl = typeof window !== 'undefined' ? window.location.origin : '/';
      socket = io(socketUrl, {
        path: '/socket.io',
        auth: { token: activeToken || '', accessToken: activeToken || '' },
        query: { token: activeToken || '' },
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect_error', (err) => console.warn('[Chat Socket] Connect error:', err.message));
      socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') socket?.connect();
      });

      socket.on('connect', () => {
        if (activeConvIdRef.current) socket?.emit('conversation.join', { conversationId: activeConvIdRef.current });
      });

      socket.on('chat:ready', () => {
        if (activeConvIdRef.current) socket?.emit('conversation.join', { conversationId: activeConvIdRef.current });
      });

      socket.on('message.new', (msg: MessageItem) => {
        const currentActiveId = activeConvIdRef.current;
        if (msg.conversationId === currentActiveId) {
          setMessages((prev) => {
            const idx = prev.findIndex(
              (m) =>
                m.id === msg.id ||
                ((m as any).clientMessageId && (m as any).clientMessageId === (msg as any).clientMessageId) ||
                (m.id.startsWith('temp-') && m.content === msg.content && m.senderId === msg.senderId)
            );
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = msg;
              return next;
            }
            return [...prev, msg];
          });
          setTimeout(() => scrollToBottom('smooth'), 50);
          socket?.emit('message.read', { conversationId: currentActiveId });
          void apiClient.patch(`/chat/conversations/${currentActiveId}/read`);
        }

        setConversations((prev) => {
          const exists = prev.some((c) => c.id === msg.conversationId);
          if (!exists) {
            void fetchInbox(false);
            return prev;
          }
          return prev.map((c) =>
            c.id === msg.conversationId
              ? {
                  ...c,
                  lastMessageText: msg.content || 'Photo',
                  lastMessageAt: typeof msg.createdAt === 'string' ? msg.createdAt : new Date(msg.createdAt).toISOString(),
                  unreadCount: msg.conversationId === currentActiveId ? 0 : c.unreadCount + 1,
                }
              : c
          );
        });
      });

      socket.on('conversation.updated', (data: { conversationId: string; lastMessageText: string; lastMessageAt: string }) => {
        const currentActiveId = activeConvIdRef.current;
        setConversations((prev) => prev.map((c) => c.id === data.conversationId ? { ...c, lastMessageText: data.lastMessageText, lastMessageAt: data.lastMessageAt, unreadCount: data.conversationId === currentActiveId ? 0 : c.unreadCount + 1 } : c));
      });

      socket.on('message.sent', (data: { messageId: string; clientMessageId?: string; status: string }) => {
        if (data.clientMessageId) {
          setMessages((prev) => prev.map((m) => ((m as any).clientMessageId === data.clientMessageId ? { ...m, id: data.messageId, status: data.status as any } : m)));
        }
      });

      socket.on('message.read', (data: { conversationId: string; readerId: string }) => {
        if (data.conversationId === activeConvIdRef.current && data.readerId !== user?.id) {
          setMessages((prev) => prev.map((m) => (m.senderId === user?.id ? { ...m, status: 'READ' } : m)));
        }
      });

      socket.on('message.delivered', (data: { messageId: string; conversationId: string }) => {
        if (data.conversationId === activeConvIdRef.current) {
          setMessages((prev) => prev.map((m) => (m.id === data.messageId && m.status === 'SENT' ? { ...m, status: 'DELIVERED' } : m)));
        }
      });

      socket.on('typing.start', (data: { conversationId: string; userId: string }) => {
        if (data.conversationId === activeConvIdRef.current && data.userId !== user?.id) setIsOtherTyping(true);
      });

      socket.on('typing.stop', (data: { conversationId: string; userId: string }) => {
        if (data.conversationId === activeConvIdRef.current && data.userId !== user?.id) setIsOtherTyping(false);
      });

      socket.on('presence.update', (data: { userId: string; isOnline: boolean }) => {
        setConversations((prev) => prev.map((c) => (c.otherParty.id === data.userId ? { ...c, otherParty: { ...c.otherParty, isOnline: data.isOnline } } : c)));
      });
    };

    void initSocket();

    return () => {
      isMounted = false;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  // 2. Room membership join when active conversation switches
  useEffect(() => {
    if (!activeConvId || !socketRef.current?.connected) return;
    socketRef.current.emit('conversation.join', { conversationId: activeConvId });
  }, [activeConvId]);

  // 3. Fetch conversations inbox and handle adId deep link
  const fetchInbox = React.useCallback(async (isInitial = false) => {
    if (!user) return;
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
      setConversations(convList);

      if (targetConvId) {
        setActiveConvId(targetConvId);
        setMobileShowThread(true);
      } else if (convList.length > 0 && !activeConvIdRef.current) {
        setActiveConvId(convList[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [user, targetAdId]);

  useEffect(() => {
    void fetchInbox(true);
  }, [fetchInbox]);

  // 4. Load active conversation messages once on conversation switch
  useEffect(() => {
    if (!activeConvId || !user) return;
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const res = await apiClient.get(`/chat/conversations/${activeConvId}/messages?limit=30`);
        if (isMounted && res.data?.success && res.data.data?.messages) {
          setMessages(res.data.data.messages);
          setNextCursor(res.data.data.nextCursor || null);
          if (res.data.data.conversation) {
            setActiveConvDetails(res.data.data.conversation);
          }
          setTimeout(() => scrollToBottom('auto'), 50);
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

    void fetchMessages();
    return () => {
      isMounted = false;
    };
  }, [activeConvId, user]);

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

  const handleSendMessage = async (customText?: string, attachmentUrl?: string) => {
    const textToSend = (customText || inputText).trim();
    if ((!textToSend && !attachmentUrl) || !activeConvId || isSending) return;

    // Deduplicate rapid identical submissions within 2 seconds
    const now = Date.now();
    if (textToSend && lastSentRef.current.text === textToSend && now - lastSentRef.current.time < 2000) {
      return;
    }
    lastSentRef.current = { text: textToSend, time: now };
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
      attachmentUrl: attachmentUrl || null,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom('smooth'), 50);
    setInputText('');

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, lastMessageText: textToSend || 'Photo', lastMessageAt: new Date().toISOString() }
          : c
      )
    );

    try {
      // Fast WebSocket delivery with ack callback, fallback to HTTP if disconnected
      if (socketRef.current?.connected) {
        socketRef.current.emit('message.send', payload, (res: any) => {
          if (res?.success && res.data) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId || (m as any).clientMessageId === clientMessageId
                  ? { ...res.data, isDeleted: false }
                  : m
              )
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
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...res.data.data, isDeleted: false } : m)));
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
      setTimeout(() => setIsSending(false), 400);
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
    } catch (err) { console.error('Failed loading older messages', err); }
    finally { setLoadingOlder(false); }
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

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mx-auto text-3xl shadow-sm">💬</div>
          <div>
            <h2 className="text-2xl font-bold text-[#002f34]">Sign In to Chat</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">Directly talk with buyers and sellers, negotiate prices, and organize pickups securely.</p>
          </div>
          <button onClick={() => openAuthModal()} className="w-full bg-[#002f34] hover:bg-[#003d44] text-white py-3.5 rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer">
            <LogIn className="w-4 h-4" />
            <span>Login / Register</span>
          </button>
        </div>
      </div>
    );
  }

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
              <h1 className="text-base font-bold tracking-tight">OLX Messages</h1>
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
            Logged in as <strong className="text-white">{user.profile?.name || user.email || user.phoneNumber || 'User'}</strong>
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
              setActiveConvId(id);
              setMobileShowThread(true);
            }}
          />
        </div>

        {/* Right Side: Message Thread */}
        <div className={`flex-1 flex flex-col min-w-0 min-h-0 h-full ${!mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
          {mobileShowThread && (
            <div className="md:hidden bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center flex-shrink-0">
              <button
                onClick={() => setMobileShowThread(false)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#002f34] p-1.5 rounded-lg hover:bg-gray-200 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>All Conversations</span>
              </button>
            </div>
          )}

          <ChatMessageThread
            conversation={activeConversation}
            currentUserId={user?.id}
            messages={messages}
            inputText={inputText}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            onBlockUser={handleBlockUser}
            onReportChat={handleReportChat}
            isOtherTyping={isOtherTyping}
            messagesEndRef={messagesEndRef}
            messagesContainerRef={messagesContainerRef}
            hasMoreOlder={Boolean(nextCursor)}
            loadingOlder={loadingOlder}
            onLoadOlder={handleLoadOlder}
            isSending={isSending}
          />
        </div>
      </div>
    </div>
  );
};
