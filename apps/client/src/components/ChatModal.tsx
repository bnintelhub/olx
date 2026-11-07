import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, LogIn, Info } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { AdItem } from '../types';
import {
  ChatConversationList,
  ConversationItem,
} from '@/features/chat/components/ChatConversationList';
import {
  ChatMessageThread,
  MessageItem,
} from '@/features/chat/components/ChatMessageThread';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAd?: AdItem | null;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, initialAd }) => {
  const { user, token, openAuthModal } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatAlert, setChatAlert] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const getActiveToken = (): string | null => {
    return token || localStorage.getItem('olx_access_token') || localStorage.getItem('token');
  };

  // 1. Initialize Socket.IO connection
  useEffect(() => {
    if (!isOpen || !user) return;

    const activeToken = getActiveToken();
    if (!activeToken) return;

    const socket = io({
      path: '/socket.io',
      auth: { token: activeToken },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (activeConvId) {
        socket.emit('join_conversation', { conversationId: activeConvId });
      }
    });

    socket.on('new_message', (payload: { conversationId: string; message: MessageItem }) => {
      if (payload.conversationId === activeConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
        socket.emit('mark_read', { conversationId: activeConvId });
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId
            ? {
                ...c,
                lastMessageText: payload.message.content,
                lastMessageAt: payload.message.createdAt,
                unreadCount: payload.conversationId === activeConvId ? 0 : c.unreadCount + 1,
              }
            : c
        )
      );
    });

    socket.on('user_typing', (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConvId && data.userId !== user?.id) {
        setIsOtherTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 2500);
      }
    });

    socket.on('messages_read', (data: { conversationId: string }) => {
      if (data.conversationId === activeConvId) {
        setMessages((prev) => prev.map((m) => ({ ...m, status: 'READ' })));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isOpen, user, activeConvId]);

  // 2. Fetch conversations
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchConversations = async () => {
      setLoading(true);
      const activeToken = getActiveToken();
      try {
        let targetConvId: string | null = null;
        if (initialAd) {
          const sellerId = (initialAd as any).userId || initialAd.seller?.id;
          if (sellerId && sellerId === user.id) {
            setChatAlert("This is your own listing! Viewing buyer inquiries for this ad.");
          } else {
            setChatAlert(null);
            const startRes = await fetch('/api/v1/chat/conversations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${activeToken}`,
                'X-App-Context': 'client',
              },
              body: JSON.stringify({ adId: initialAd.id }),
            });
            const startData = await startRes.json();
            if (startRes.ok && startData.success && startData.data?.id) {
              targetConvId = startData.data.id;
            }
          }
        }

        const res = await fetch('/api/v1/chat/conversations', {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'X-App-Context': 'client',
          },
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          setConversations(data.data);
          if (targetConvId) {
            setActiveConvId(targetConvId);
          } else if (data.data.length > 0 && !activeConvId) {
            setActiveConvId(data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [isOpen, user, initialAd]);

  // 3. Fetch active messages when conversation changes
  useEffect(() => {
    if (!activeConvId || !user) return;

    const fetchMessages = async () => {
      const activeToken = getActiveToken();
      try {
        const res = await fetch(`/api/v1/chat/conversations/${activeConvId}/messages`, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'X-App-Context': 'client',
          },
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          setMessages(data.data);
          socketRef.current?.emit('join_conversation', { conversationId: activeConvId });
          socketRef.current?.emit('mark_read', { conversationId: activeConvId });

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

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (activeConvId && socketRef.current) {
      socketRef.current.emit('typing', { conversationId: activeConvId });
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !activeConvId) return;

    const activeToken = getActiveToken();
    try {
      const res = await fetch(`/api/v1/chat/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
          'X-App-Context': 'client',
        },
        body: JSON.stringify({ content: textToSend.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        if (!customText) setInputText('');
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.data.id)) return prev;
          return [...prev, data.data];
        });

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? {
                  ...c,
                  lastMessageText: data.data.content,
                  lastMessageAt: data.data.createdAt,
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 animate-fadeIn">
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-5 border border-gray-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mx-auto text-3xl shadow-sm">
            💬
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Login to Start Chatting</h3>
            <p className="text-xs text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Connect directly with sellers in real time to negotiate price, ask questions, and arrange local pickup safely.
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              openAuthModal();
            }}
            className="w-full bg-[#002f34] hover:bg-[#003d44] text-white py-3 rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Login / Verify Phone</span>
          </button>
        </div>
      </div>
    );
  }

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-[88vh] max-h-[750px] border border-gray-200">
        {/* Header Bar */}
        <div className="bg-[#002f34] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#003d44] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#ffce32]">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">OLX ORBIT Messenger</h2>
              <p className="text-[11px] text-gray-300">Direct Buyer-Seller Offline Deals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Alert */}
        {chatAlert && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-amber-900 flex-shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
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

        {/* Messenger Body */}
        <div className="flex flex-grow overflow-hidden">
          <ChatConversationList
            conversations={conversations}
            activeConvId={activeConvId}
            loading={loading}
            onSelectConversation={setActiveConvId}
          />

          <ChatMessageThread
            conversation={activeConversation}
            currentUserId={user?.id}
            messages={messages}
            inputText={inputText}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            isOtherTyping={isOtherTyping}
            messagesEndRef={messagesEndRef}
          />
        </div>
      </div>
    </div>
  );
};
