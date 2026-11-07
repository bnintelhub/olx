import React, { useState, useRef } from 'react';
import {
  Send,
  ShieldAlert,
  Sparkles,
  CheckCheck,
  Check,
  MessageCircle,
  MoreVertical,
  Shield,
  Ban,
  Trash2,
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { ConversationItem } from './ChatConversationList';

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  type?: string;
  content: string;
  attachmentUrl?: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  isDeleted?: boolean;
}

interface ChatMessageThreadProps {
  conversation: ConversationItem | null;
  currentUserId?: string;
  messages: MessageItem[];
  inputText: string;
  onInputChange: (val: string) => void;
  onSendMessage: (text?: string, attachmentUrl?: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onBlockUser?: (userId: string) => void;
  onReportChat?: (reason: string, details?: string) => void;
  isOtherTyping: boolean;
  messagesEndRef: React.RefObject<any>;
  messagesContainerRef?: React.RefObject<any>;
  hasMoreOlder?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
  isSending?: boolean;
}

export const ChatMessageThread: React.FC<ChatMessageThreadProps> = ({
  conversation,
  currentUserId,
  messages,
  inputText,
  onInputChange,
  onSendMessage,
  onDeleteMessage,
  onBlockUser,
  onReportChat,
  isOtherTyping,
  messagesEndRef,
  messagesContainerRef,
  hasMoreOlder,
  loadingOlder,
  onLoadOlder,
  isSending,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('SPAM_OR_FRAUD');
  const [reportDetails, setReportDetails] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const isBuyer = conversation.otherParty.role === 'Seller';
  const quickPrompts = isBuyer
    ? ['Hi, is this still available?', 'What is your final price?', 'Can I inspect it today?', 'Where in the city can we meet?']
    : ['Yes, it is available.', 'Price is firm.', 'Yes, you can inspect it today.', 'When would you like to pick it up?'];

  const availablePrompts = quickPrompts.filter(
    (prompt) => !messages.some((m) => m.content.toLowerCase().trim() === prompt.toLowerCase().trim())
  );

  const adThumb =
    conversation.ad?.imageUrl ||
    conversation.ad?.images?.[0]?.thumbnailUrl ||
    conversation.ad?.images?.[0]?.displayUrl ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&auto=format&fit=crop&q=80';

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit');
      return;
    }
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleSendWithImage = async () => {
    if (selectedImage) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedImage);
        const res = await fetch('/api/v1/uploads', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        const uploadedUrl = data.url || data.data?.url;
        onSendMessage(inputText, uploadedUrl);
        setSelectedImage(null);
        setImagePreviewUrl(null);
      } catch {
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(false);
      }
    } else {
      onSendMessage();
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onReportChat) {
      onReportChat(reportReason, reportDetails);
      setShowReportModal(false);
      setReportDetails('');
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-white min-w-0 min-h-0 relative overflow-hidden">
      {/* Active Chat Header */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between gap-3 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3 truncate">
          <div className="relative flex-shrink-0">
            <img src={adThumb} alt="" className="w-11 h-11 rounded object-cover border border-gray-200" />
            {conversation.otherParty.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            )}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5 truncate">
              <h4 className="text-sm font-bold text-gray-900 truncate">{conversation.otherParty.name}</h4>
              <span className="text-[10px] text-gray-400">({conversation.otherParty.role})</span>
              {conversation.otherParty.isOnline && (
                <span className="text-[10px] text-emerald-600 font-semibold">• Online</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 truncate">
              <span className="font-semibold text-[#002f34] truncate">{conversation.ad?.title}</span>
              <span>•</span>
              <span className="font-bold text-emerald-800">
                ₹{Number(conversation.ad?.price || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Menu */}
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 shadow-lg rounded-xl py-1.5 w-44 z-30 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowReportModal(true);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 font-medium"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Report Chat</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  if (confirm(`Block ${conversation.otherParty.name}? You will no longer receive messages from this user.`)) {
                    onBlockUser?.(conversation.otherParty.id);
                  }
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-rose-600 font-medium"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block User</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Safety Notice Header */}
      <div className="bg-amber-50/70 border-b border-amber-200/60 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-900 flex-shrink-0">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span>Safety Notice: Never send advance money via QR codes or UPI. Inspect item physically before payment.</span>
      </div>

      {/* Message Thread Scroll View */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa] no-scrollbar overscroll-contain">
        {hasMoreOlder && (
          <div className="text-center py-1">
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={loadingOlder}
              className="text-xs font-semibold text-[#002f34] bg-white border border-gray-200 px-3 py-1 rounded-full hover:bg-gray-50 transition shadow-2xs"
            >
              {loadingOlder ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;

          return (
            <div key={msg.id} className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[78%] sm:max-w-md rounded-2xl px-3.5 py-2 text-xs shadow-xs relative ${
                  isMine
                    ? 'bg-[#002f34] text-white rounded-br-xs'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-xs'
                }`}
              >
                {/* Sender badge on incoming messages */}
                {!isMine && (
                  <span className="text-[10px] font-bold text-[#002f34] block mb-0.5">
                    {conversation.otherParty.name} ({conversation.otherParty.role})
                  </span>
                )}

                {/* Image attachment */}
                {msg.attachmentUrl && !msg.isDeleted && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                    <img
                      src={msg.attachmentUrl}
                      alt="Attachment"
                      className="max-h-60 w-auto object-cover rounded cursor-pointer hover:opacity-95"
                      onClick={() => window.open(msg.attachmentUrl!, '_blank')}
                    />
                  </div>
                )}

                <p className={`whitespace-pre-wrap leading-relaxed break-words ${msg.isDeleted ? 'italic text-gray-400' : ''}`}>
                  {msg.content}
                </p>

                <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMine ? 'text-gray-300' : 'text-gray-400'}`}>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMine && !msg.isDeleted && (
                    msg.status === 'READ' ? (
                      <span title="Read"><CheckCheck className="w-3 h-3 text-[#ffce32]" /></span>
                    ) : msg.status === 'DELIVERED' ? (
                      <span title="Delivered"><CheckCheck className="w-3 h-3 text-gray-300" /></span>
                    ) : (
                      <span title="Sent"><Check className="w-3 h-3 text-gray-400" /></span>
                    )
                  )}
                </div>

                {/* Soft delete icon for own messages */}
                {isMine && !msg.isDeleted && onDeleteMessage && (
                  <button
                    type="button"
                    onClick={() => onDeleteMessage(msg.id)}
                    title="Delete message"
                    className="absolute -left-6 top-2 hidden group-hover:block text-gray-400 hover:text-rose-500 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
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

      {/* Image Preview Thumbnail if Selected */}
      {imagePreviewUrl && (
        <div className="p-2 bg-gray-100 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={imagePreviewUrl} alt="Preview" className="w-12 h-12 object-cover rounded border" />
            <span className="text-xs text-gray-600 font-medium">Image attached</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedImage(null);
              setImagePreviewUrl(null);
            }}
            className="text-xs text-rose-600 hover:underline cursor-pointer"
          >
            Remove
          </button>
        </div>
      )}

      {/* Quick Prompts Strip */}
      {availablePrompts.length > 0 && (
        <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mr-1" />
          {availablePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isSending || conversation.isBlocked}
              onClick={() => onSendMessage(prompt)}
              className="text-[11px] whitespace-nowrap bg-gray-100 hover:bg-gray-200 text-[#002f34] font-medium px-2.5 py-1 rounded-full border border-gray-200 transition cursor-pointer disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Box Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendWithImage();
        }}
        className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 flex-shrink-0"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach image"
          disabled={conversation.isBlocked || isSending || uploadingImage}
          className="p-2 text-gray-500 hover:text-[#002f34] hover:bg-gray-100 rounded-full transition cursor-pointer disabled:opacity-40"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={conversation.isBlocked ? 'This conversation is blocked' : 'Type your message here...'}
          disabled={conversation.isBlocked || uploadingImage || isSending}
          className="flex-grow border border-gray-300 rounded-full px-4 py-2.5 text-xs focus:outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34] disabled:bg-gray-100"
        />

        <button
          type="submit"
          disabled={(!inputText.trim() && !selectedImage) || conversation.isBlocked || uploadingImage || isSending}
          className="p-2.5 bg-[#002f34] text-white hover:bg-[#003d44] rounded-full disabled:opacity-40 transition cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Report Modal */}
      {showReportModal && (
        <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900">Report Conversation</h3>
            <p className="text-xs text-gray-500">Help us keep the OLX marketplace safe by reporting suspicious behavior.</p>
            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:border-[#002f34]"
                >
                  <option value="SPAM_OR_FRAUD">Spam or Payment Fraud</option>
                  <option value="INAPPROPRIATE_CONTENT">Harassment or Abusive Language</option>
                  <option value="PROHIBITED_ITEM">Prohibited or Illegal Item</option>
                  <option value="MISLEADING_PRICE">Fake Listing / Misleading Price</option>
                  <option value="OTHER">Other Issue</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Details (Optional)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context for moderation team..."
                  rows={3}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:border-[#002f34]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
