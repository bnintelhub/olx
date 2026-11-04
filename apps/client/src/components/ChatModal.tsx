import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  ShieldAlert,
  MessageCircle,
  CheckCheck,
  Check,
  Sparkles,
  AlertTriangle,
  LogIn,
  Info,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { AdItem } from '../types';

interface ConversationItem {
  id: string;
  adId: string;
  ad: {
    id: string;
    title: string;
    price: number | string;
    images?: { displayUrl?: string }[];
  };
  otherParty: {
    id: string;
    name: string;
    avatarUrl?: string;
    role: string;
  };
  lastMessageText: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  hasFraudRisk?: boolean;
}

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

  // Quick suggestions for classifieds
  const QUICK_PROMPTS = [
    'Hi, is this still available?',
    'What is your final price?',
    'Can I inspect it today?',
    'Where in the city can we meet?',
  ];

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
      console.log('⚡ [ChatModal] Connected to Socket.IO');
      if (activeConvId) {
        socket.emit('join_conversation', { conversationId: activeConvId });
      }
    });

    socket.on('new_message', (newMsg: MessageItem) => {
      setMessages((prev) => {
        // Replace optimistic message if match or append
        const filtered = prev.filter((m) => m.id !== newMsg.id && !m.id.startsWith('temp_'));
        return [...filtered, newMsg];
      });

      // Update conversations list snippet
      setConversations((prev) =>
        prev.map((c) =>
          c.id === newMsg.conversationId
            ? { ...c, lastMessageText: newMsg.content, lastMessageAt: newMsg.createdAt }
            : c
        )
      );

      // Auto mark read if active
      if (socketRef.current && activeConvId === newMsg.conversationId) {
        socketRef.current.emit('mark_read', { conversationId: activeConvId });
      }
    });

    socket.on('user_typing', ({ conversationId, isTyping }: any) => {
      if (conversationId === activeConvId) {
        setIsOtherTyping(isTyping);
      }
    });

    socket.on('messages_read', ({ conversationId }: any) => {
      if (conversationId === activeConvId) {
        setMessages((prev) => prev.map((m) => ({ ...m, status: 'READ' })));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen, user, activeConvId]);

  // 2. Fetch or create conversations
  useEffect(() => {
    if (!isOpen || !user) return;

    const initConversations = async () => {
      setLoading(true);
      setChatAlert(null);
      const activeToken = getActiveToken();
      if (!activeToken) {
        setLoading(false);
        return;
      }

      try {
        let directConvId: string | null = null;

        // If opened from a specific Ad ("Chat with Seller")
        if (initialAd) {
          const startRes = await fetch('/api/v1/chat/conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${activeToken}`,
            },
            body: JSON.stringify({ adId: initialAd.id }),
          });
          const startData = await startRes.json();
          if (startData.isOwnAd) {
            setChatAlert(startData.message || 'You cannot initiate a chat on your own ad listing.');
          } else if (startData.success && startData.data) {
            directConvId = startData.data.id;
            setActiveConvId(startData.data.id);
            setConversations((prev) => {
              if (prev.some((c) => c.id === startData.data.id)) return prev;
              return [startData.data, ...prev];
            });
          }
        }

        // Fetch all conversations
        const res = await fetch('/api/v1/chat/conversations', {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        const data = await res.json();
        if (data.success && data.data?.conversations) {
          const list: ConversationItem[] = data.data.conversations;
          setConversations((prev) => {
            const seen = new Set(list.map((c) => c.id));
            const merged = [...list];
            for (const p of prev) {
              if (!seen.has(p.id)) {
                merged.unshift(p);
                seen.add(p.id);
              }
            }
            return merged;
          });

          if (!directConvId && list.length > 0) {
            setActiveConvId((curr) => curr || list[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    initConversations();
  }, [isOpen, user, initialAd]);

  // 3. Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId || !isOpen || !user) return;

    const activeToken = getActiveToken();
    if (!activeToken) return;

    // Join socket room
    if (socketRef.current) {
      socketRef.current.emit('join_conversation', { conversationId: activeConvId });
    }

    // Fetch history
    fetch(`/api/v1/chat/conversations/${activeConvId}/messages`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setMessages(data.data);
        }
      })
      .catch((err) => console.error('Error fetching messages:', err));

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_conversation', { conversationId: activeConvId });
      }
    };
  }, [activeConvId, isOpen, user]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || !activeConvId) return;

    const activeToken = getActiveToken();
    setInputText('');

    // Optimistic message
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      conversationId: activeConvId,
      senderId: user?.id || '',
      content: text,
      status: 'SENT',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // REST is the authoritative write path. Socket delivery is intentionally not
    // treated as success because a disconnected/misconfigured socket must never
    // create a message bubble that disappears on refresh.
    if (!activeToken) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setChatAlert('Your session has expired. Please log in again to send a message.');
      return;
    }
    try {
      const res = await fetch(`/api/v1/chat/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error?.message || 'Message could not be saved');
      }
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data.data : m)));
      setConversations((prev) => prev.map((conversation) => conversation.id === activeConvId
        ? { ...conversation, lastMessageText: data.data.content, lastMessageAt: data.data.createdAt }
        : conversation));
      socketRef.current?.emit('typing', { conversationId: activeConvId, isTyping: false });
    } catch (err) {
      console.error('Message save error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
      setChatAlert(err instanceof Error ? `${err.message}. Please try again.` : 'Message could not be saved. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (socketRef.current && activeConvId) {
      socketRef.current.emit('typing', {
        conversationId: activeConvId,
        isTyping: true,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing', {
          conversationId: activeConvId,
          isTyping: false,
        });
      }, 1500);
    }
  };

  if (!isOpen) return null;

  // Not Logged In View
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex justify-center items-center p-3 sm:p-6 animate-fadeIn">
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="bg-[#10363A] text-white px-5 py-4 flex items-center justify-between border-b border-[#00343A]">
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
              className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 text-[#10363A] flex items-center justify-center mx-auto">
              <MessageCircle className="w-8 h-8" />
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
              className="w-full bg-[#002f34] hover:bg-[#003d44] text-white py-3 rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Login / Verify Phone</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeConversation = conversations.find((c) => c.id === activeConvId);

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
            className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Alert (e.g. Own Ad Warning) */}
        {chatAlert && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-amber-900 flex-shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{chatAlert}</span>
            </div>
            <button
              onClick={() => setChatAlert(null)}
              className="text-amber-700 hover:text-amber-900 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messenger Body: 2 Columns */}
        <div className="flex flex-grow overflow-hidden">
          {/* Left Column: Conversations List */}
          <div className="w-full sm:w-80 md:w-96 border-r border-gray-200 flex flex-col bg-gray-50 flex-shrink-0">
            <div className="p-3 border-b border-gray-200 bg-white">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Conversations ({conversations.length})
              </span>
            </div>

            <div className="overflow-y-auto flex-grow divide-y divide-gray-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  <div className="w-6 h-6 border-2 border-[#002f34] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading chats...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 space-y-1">
                  <MessageCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="font-semibold text-gray-600">No conversations yet</p>
                  <p>Click "Chat with Seller" on any ad listing to start chatting!</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  const adThumb =
                    conv.ad?.images?.[0]?.displayUrl ||
                    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&auto=format&fit=crop&q=80';

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`p-3.5 flex items-start gap-3 cursor-pointer transition ${
                        isActive
                          ? 'bg-teal-50/70 border-l-4 border-[#002f34]'
                          : 'hover:bg-gray-100 bg-white'
                      }`}
                    >
                      <img
                        src={adThumb}
                        alt=""
                        className="w-12 h-12 rounded object-cover flex-shrink-0 border border-gray-200"
                      />
                      <div className="flex-grow min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <h4 className="text-xs font-bold text-gray-900 truncate">
                            {conv.otherParty.name}
                          </h4>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {new Date(conv.lastMessageAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-[#002f34] truncate mt-0.5">
                          {conv.ad?.title || 'Classified Ad'}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500 truncate max-w-[160px]">
                            {conv.lastMessageText || 'Tap to chat'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-[#00a49f] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div className="flex-grow flex flex-col bg-white">
            {activeConversation ? (
              <>
                {/* Active Chat Header */}
                <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 truncate">
                    <img
                      src={
                        activeConversation.ad?.images?.[0]?.displayUrl ||
                        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&auto=format&fit=crop&q=80'
                      }
                      alt=""
                      className="w-10 h-10 rounded object-cover flex-shrink-0 border border-gray-200"
                    />
                    <div className="truncate">
                      <h3 className="text-xs font-bold text-gray-900 truncate">
                        {activeConversation.otherParty.name} ({activeConversation.otherParty.role})
                      </h3>
                      <p className="text-[11px] text-gray-600 truncate">
                        {activeConversation.ad?.title} •{' '}
                        <span className="font-bold text-[#002f34]">
                          ₹{Number(activeConversation.ad?.price).toLocaleString('en-IN')}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Safety Warning Banner */}
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Safety Tip:</strong> Never transfer advance via UPI/QR code or share PIN. Meet locally in person.
                  </span>
                </div>

                {/* Quick Prompts Bar */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-[11px] bg-white border border-gray-200 hover:border-[#002f34] text-gray-700 hover:text-[#002f34] px-2.5 py-1 rounded-full whitespace-nowrap transition font-medium shadow-2xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Messages Stream */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]/30">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-xl px-3.5 py-2 text-xs shadow-xs relative leading-relaxed ${
                            isMine
                              ? 'bg-[#002f34] text-white rounded-tr-none'
                              : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          {/* Anti-fraud warning detection on message */}
                          {msg.hasFraudRisk && (
                            <div className="mt-1.5 pt-1 border-t border-amber-300/40 text-[10px] text-amber-200 flex items-center gap-1 font-semibold">
                              <AlertTriangle className="w-3 h-3 text-amber-300" />
                              Contains payment keywords. Do not pay in advance.
                            </div>
                          )}

                          <div
                            className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                              isMine ? 'text-gray-300' : 'text-gray-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMine && (
                              <span>
                                {msg.status === 'READ' ? (
                                  <CheckCheck className="w-3 h-3 text-[#ffce32]" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isOtherTyping && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 italic bg-white px-3 py-1.5 rounded-full w-fit shadow-xs">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      <span>{activeConversation.otherParty.name} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Bottom Input Area */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3 bg-white border-t border-gray-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Type your message here..."
                    className="flex-grow border border-gray-300 rounded-full px-4 py-2 text-xs sm:text-sm outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34]"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="w-9 h-9 rounded-full bg-[#002f34] hover:bg-[#003d44] disabled:opacity-40 text-white flex items-center justify-center transition flex-shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <MessageCircle className="w-12 h-12 text-gray-300 mb-2" />
                <h3 className="font-bold text-gray-700">Select a conversation</h3>
                <p className="text-xs max-w-xs mt-1">
                  Choose a chat from the left panel to message buyer or seller in real-time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
