import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare, ArrowLeft, ShieldCheck, AlertCircle, Sparkles, LogIn, ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  ChatConversationList,
  ConversationItem,
} from '../components/ChatConversationList';
import {
  ChatMessageThread,
  MessageItem,
} from '../components/ChatMessageThread';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<any>(null);

  const getActiveToken = (): string | null => {
    return token || localStorage.getItem('olx_access_token') || localStorage.getItem('token');
  };

  // 1. Socket.IO connection
  useEffect(() => {
    if (!user) return;
    const activeToken = getActiveToken();
    const socket = io('/', {
      path: '/socket.io',
      auth: { token: activeToken || '' },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (activeConvId) {
        socket.emit('conversation.join', { conversationId: activeConvId });
      }
    });

    socket.on('message.new', (msg: MessageItem) => {
      if (msg.conversationId === activeConvId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        socket.emit('message.read', { conversationId: activeConvId });
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessageText: msg.content || 'Photo',
                lastMessageAt: msg.createdAt,
                unreadCount: msg.conversationId === activeConvId ? 0 : c.unreadCount + 1,
              }
            : c
        )
      );
    });

    socket.on('message.read', (data: { conversationId: string; readerId: string }) => {
      if (data.conversationId === activeConvId && data.readerId !== user?.id) {
        setMessages((prev) => prev.map((m) => (m.senderId === user?.id ? { ...m, status: 'READ' } : m)));
      }
    });

    socket.on('message.delivered', (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === activeConvId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId && m.status === 'SENT' ? { ...m, status: 'DELIVERED' } : m))
        );
      }
    });

    socket.on('typing.start', (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConvId && data.userId !== user?.id) {
        setIsOtherTyping(true);
      }
    });

    socket.on('typing.stop', (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConvId && data.userId !== user?.id) {
        setIsOtherTyping(false);
      }
    });

    socket.on('presence.update', (data: { userId: string; isOnline: boolean }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.otherParty.id === data.userId ? { ...c, otherParty: { ...c.otherParty, isOnline: data.isOnline } } : c
        )
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, activeConvId]);

  // 2. Fetch conversations and handle adId deep link
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      setLoading(true);
      const activeToken = getActiveToken();
      try {
        let targetConvId: string | null = null;

        if (targetAdId) {
          const startRes = await fetch('/api/v1/chat/conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${activeToken}`,
              'X-App-Context': 'client',
            },
            body: JSON.stringify({ adId: targetAdId }),
          });
          const startData = await startRes.json();
          if (startRes.ok && startData.success && startData.data?.id) {
            targetConvId = startData.data.id;
          } else if (startData.message) {
            setChatAlert(startData.message);
          }
        }

        const res = await fetch('/api/v1/chat/conversations', {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'X-App-Context': 'client',
          },
        });
        const data = await res.json();
        const convList: ConversationItem[] = data.data?.conversations || (Array.isArray(data.data) ? data.data : []);
        setConversations(convList);

        if (targetConvId) {
          setActiveConvId(targetConvId);
          setMobileShowThread(true);
        } else if (convList.length > 0 && !activeConvId) {
          setActiveConvId(convList[0].id);
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, targetAdId]);

  // 3. Load active conversation messages
  useEffect(() => {
    if (!activeConvId || !user) return;
    const fetchMessages = async () => {
      const activeToken = getActiveToken();
      try {
        const res = await fetch(`/api/v1/chat/conversations/${activeConvId}/messages?limit=30`, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'X-App-Context': 'client',
          },
        });
        const data = await res.json();
        if (res.ok && data.success && data.data?.messages) {
          setMessages(data.data.messages);
          setNextCursor(data.data.nextCursor || null);
          socketRef.current?.emit('conversation.join', { conversationId: activeConvId });
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

    fetchMessages();
  }, [activeConvId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

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
    const textToSend = customText || inputText;
    if ((!textToSend.trim() && !attachmentUrl) || !activeConvId) return;

    const clientMessageId = crypto.randomUUID();
    const payload = {
      conversationId: activeConvId,
      content: textToSend.trim(),
      attachmentUrl,
      clientMessageId,
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit('message.send', payload);
      if (!customText) setInputText('');
      return;
    }

    const activeToken = getActiveToken();
    try {
      const res = await fetch(`/api/v1/chat/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
          'X-App-Context': 'client',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        if (!customText) setInputText('');
        setMessages((prev) => (prev.some((m) => m.id === data.data.id) ? prev : [...prev, data.data]));
        if (data.safetyNotice) setChatAlert(data.safetyNotice);
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleLoadOlder = async () => {
    if (!activeConvId || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    const activeToken = getActiveToken();
    try {
      const res = await fetch(`/api/v1/chat/conversations/${activeConvId}/messages?cursor=${nextCursor}&limit=30`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.messages) {
        setMessages((prev) => [...data.data.messages, ...prev]);
        setNextCursor(data.data.nextCursor || null);
      }
    } catch (err) {
      console.error('Failed loading older messages', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const activeToken = getActiveToken();
    try {
      const res = await fetch(`/api/v1/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content: 'This message was deleted', isDeleted: true } : m))
        );
      }
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    const activeToken = getActiveToken();
    try {
      const res = await fetch('/api/v1/chat/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.otherParty.id === targetUserId ? { ...c, isBlocked: true } : c))
        );
        setChatAlert('User blocked. Messaging is restricted.');
      }
    } catch (err) {
      console.error('Failed to block user', err);
    }
  };

  const handleReportChat = async (reason: string, details?: string) => {
    const activeToken = getActiveToken();
    try {
      const res = await fetch('/api/v1/chat/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({ conversationId: activeConvId, reason, details }),
      });
      if (res.ok) {
        setChatAlert('Report submitted to moderation team. Thank you.');
      }
    } catch (err) {
      console.error('Failed to submit report', err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mx-auto text-3xl shadow-sm">
            💬
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#002f34]">Sign In to Chat</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              Directly talk with buyers and sellers, negotiate prices, and organize pickups securely.
            </p>
          </div>
          <button
            onClick={() => openAuthModal()}
            className="w-full bg-[#002f34] hover:bg-[#003d44] text-white py-3.5 rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Login / Register</span>
          </button>
        </div>
      </div>
    );
  }

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col h-[calc(100vh-80px)]">
      {/* Top Header Bar */}
      <div className="bg-[#002f34] text-white px-4 py-3 rounded-t-2xl flex items-center justify-between border-b border-[#003d44] shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">OLX Messages</h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2 py-0.5 rounded-full text-teal-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified & Protected
              </span>
            </div>
            <p className="text-[11px] text-gray-300 hidden sm:block">
              Direct, real-time negotiation between verified buyers and sellers
            </p>
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
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-amber-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{chatAlert}</span>
          </div>
          <button
            onClick={() => setChatAlert(null)}
            className="text-amber-700 hover:text-amber-900 font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Chat Split Container */}
      <div className="flex flex-1 overflow-hidden bg-white border-x border-b border-gray-200 rounded-b-2xl shadow-lg">
        {/* Left Side: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 flex flex-col ${
            mobileShowThread ? 'hidden md:flex' : 'flex'
          }`}
        >
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
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            !mobileShowThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          {mobileShowThread && (
            <div className="md:hidden bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center">
              <button
                onClick={() => setMobileShowThread(false)}
                className="flex items-center gap-1 text-xs font-semibold text-[#002f34] p-1 rounded hover:bg-gray-200 transition"
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
            hasMoreOlder={Boolean(nextCursor)}
            loadingOlder={loadingOlder}
            onLoadOlder={handleLoadOlder}
          />
        </div>
      </div>
    </div>
  );
};
