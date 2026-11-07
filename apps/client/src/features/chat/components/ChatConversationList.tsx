import React from 'react';
import { MessageCircle } from 'lucide-react';

export interface ConversationItem {
  id: string;
  adId: string;
  ad: {
    id: string;
    title: string;
    price: number | string;
    imageUrl?: string | null;
    images?: { displayUrl?: string; thumbnailUrl?: string }[];
  };
  otherParty: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    role: string;
    isOnline?: boolean;
  };
  lastMessageText: string;
  lastMessageAt: string;
  unreadCount: number;
  isBlocked?: boolean;
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
    <div className="w-full h-full flex flex-col bg-gray-50 flex-1 min-h-0 overflow-hidden">
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Conversations ({conversations.length})
        </span>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-gray-100 no-scrollbar overscroll-contain">
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
              conv.ad?.imageUrl ||
              conv.ad?.images?.[0]?.thumbnailUrl ||
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
                <div className="relative flex-shrink-0">
                  <img
                    src={adThumb}
                    alt=""
                    className="w-12 h-12 rounded object-cover border border-gray-200"
                  />
                  {conv.otherParty.isOnline && (
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" title="Online" />
                  )}
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <h4 className="text-xs font-bold text-gray-900 truncate">
                        {conv.otherParty.name}
                      </h4>
                      {conv.isBlocked && (
                        <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-semibold">Blocked</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {conv.lastMessageAt
                        ? new Date(conv.lastMessageAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
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
