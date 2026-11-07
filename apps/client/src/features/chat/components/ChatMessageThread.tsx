import React, { RefObject } from 'react';
import { Send, ShieldAlert, Sparkles, CheckCheck, Check, MessageCircle } from 'lucide-react';
import { ConversationItem } from './ChatConversationList';

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  hasFraudRisk?: boolean;
}

interface ChatMessageThreadProps {
  conversation: ConversationItem | null;
  currentUserId?: string;
  messages: MessageItem[];
  inputText: string;
  onInputChange: (val: string) => void;
  onSendMessage: (text?: string) => void;
  isOtherTyping: boolean;
  messagesEndRef: React.RefObject<any>;
}

const QUICK_PROMPTS = [
  'Hi, is this still available?',
  'What is your final price?',
  'Can I inspect it today?',
  'Where in the city can we meet?',
];

export const ChatMessageThread: React.FC<ChatMessageThreadProps> = ({
  conversation,
  currentUserId,
  messages,
  inputText,
  onInputChange,
  onSendMessage,
  isOtherTyping,
  messagesEndRef,
}) => {
  if (!conversation) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-gray-400">
        <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
        <h3 className="text-base font-bold text-gray-700">Select a Conversation</h3>
        <p className="text-xs text-gray-500 max-w-xs mt-1">
          Choose a conversation from the left to start chatting with verified buyers and sellers.
        </p>
      </div>
    );
  }

  const adThumb =
    conversation.ad?.images?.[0]?.displayUrl ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&auto=format&fit=crop&q=80';

  return (
    <div className="flex-grow flex flex-col bg-white">
      {/* Active Chat Header */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 truncate">
          <img
            src={adThumb}
            alt=""
            className="w-11 h-11 rounded object-cover flex-shrink-0 border border-gray-200"
          />
          <div className="truncate">
            <h4 className="text-sm font-bold text-gray-900 truncate">
              {conversation.otherParty.name}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 truncate">
              <span className="font-semibold text-[#002f34] truncate">
                {conversation.ad?.title}
              </span>
              <span>•</span>
              <span className="font-bold text-emerald-800">
                ₹{Number(conversation.ad?.price || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Notice Header */}
      <div className="bg-amber-50/70 border-b border-amber-200/60 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-900">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span>
          Safety Advice: Never send advance money via QR codes or UPI. Inspect item physically before payment.
        </span>
      </div>

      {/* Message Thread Scroll View */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-[#f8f9fa]">
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[78%] sm:max-w-md rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                  isMine
                    ? 'bg-[#002f34] text-white rounded-br-xs'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-xs'
                }`}
              >
                {/* Real-time Fraud Safety Alert */}
                {msg.hasFraudRisk && (
                  <div className="mb-2 p-1.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px] flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span>Warning: Suspected payment link or external scam pattern.</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>

                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                    isMine ? 'text-gray-300' : 'text-gray-400'
                  }`}
                >
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMine &&
                    (msg.status === 'READ' ? (
                      <CheckCheck className="w-3 h-3 text-[#ffce32]" />
                    ) : msg.status === 'DELIVERED' ? (
                      <CheckCheck className="w-3 h-3 text-gray-300" />
                    ) : (
                      <Check className="w-3 h-3 text-gray-400" />
                    ))}
                </div>
              </div>
            </div>
          );
        })}

        {isOtherTyping && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 italic py-1">
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-ping" />
            <span>{conversation.otherParty.name} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Strip */}
      <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mr-1" />
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSendMessage(prompt)}
            className="text-[11px] whitespace-nowrap bg-gray-100 hover:bg-gray-200 text-[#002f34] font-medium px-2.5 py-1 rounded-full border border-gray-200 transition cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSendMessage();
        }}
        className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 flex-shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Type your message here..."
          className="flex-grow border border-gray-300 rounded-full px-4 py-2.5 text-xs focus:outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34]"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-[#002f34] hover:bg-[#003d44] disabled:opacity-40 text-white p-2.5 rounded-full transition shadow-xs flex-shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
