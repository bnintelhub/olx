import React from 'react';
import { MessageCircle } from 'lucide-react';

export interface ConversationItem {
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

interface ChatConversationListProps {
  conversations: ConversationItem[];
  activeConvId: string | null;
  loading: boolean;
  onSelectConversation: (id: string) => void;
}

export const ChatConversationList: React.FC<ChatConversationListProps> = ({
  conversations,
  activeConvId,
  loading,
  onSelectConversation,
}) => {
  return (
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
                onClick={() => onSelectConversation(conv.id)}
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
  );
};

