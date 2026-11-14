import React, { useState, useEffect, useRef } from 'react';
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
import { apiClient } from '@/lib/api-client';
import { formatAttachmentUrl } from '../utils/chatMedia';
import { formatMediaUrl } from '@/lib/utils';

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  type?: string;
  content: string;
  attachmentUrl?: string | null;
  localPreviewUrl?: string;
  clientMessageId?: string;
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
  onSendMessage: (text?: string, attachmentUrl?: string, localPreviewUrl?: string) => void;
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

interface ChatMessageRowProps {
  msg: MessageItem;
  isMine: boolean;
  isLatest: boolean;
  otherPartyName: string;
  otherPartyRole: string;
  isFailed: boolean;
  onImageError: (id: string) => void;
  onDeleteMessage?: (id: string) => void;
}

// Memoized individual message row
const ChatMessageRow: React.FC<ChatMessageRowProps> = React.memo(({
  msg,
  isMine,
  isLatest,
  otherPartyName,
  otherPartyRole,
  isFailed,
  onImageError,
  onDeleteMessage,
}) => {
  const attachmentSrc = formatAttachmentUrl((msg as any).localPreviewUrl || msg.attachmentUrl);
  const formattedTime = React.useMemo(() => {
    try {
      return new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [msg.createdAt]);

  return (
    <div className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}>
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
            {otherPartyName} ({otherPartyRole})
          </span>
        )}

        {/* Image attachment */}
        {(msg.attachmentUrl || (msg as any).localPreviewUrl) && !msg.isDeleted && (
          isFailed ? (
            <div className="mb-2 flex items-center gap-2 py-2 px-3 text-xs bg-black/10 rounded-lg text-gray-400">
              <ImageIcon className="w-4 h-4 text-gray-400" />
              <span>Attachment unavailable</span>
            </div>
          ) : (
            <div className="mb-2 rounded-lg overflow-hidden border border-black/10 bg-black/5 inline-block max-w-full">
              <img
                src={attachmentSrc}
                alt="Attachment"
                className="max-h-72 max-w-full w-auto h-auto object-contain rounded-lg cursor-pointer hover:opacity-95 block"
                onClick={() => window.open(attachmentSrc, '_blank')}
                loading="eager"
                onError={() => onImageError(msg.id)}
              />
            </div>
          )
        )}

        <p className={`whitespace-pre-wrap leading-relaxed break-words ${msg.isDeleted ? 'italic text-gray-400' : ''}`}>
          {msg.content}
        </p>

        <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMine ? 'text-gray-300' : 'text-gray-400'}`}>
          <span>{formattedTime}</span>
          {isMine && !msg.isDeleted && (
            msg.status === 'READ' ? (
              <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /></span>
            ) : msg.status === 'DELIVERED' ? (
              <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-gray-300" /></span>
            ) : (
              <span title="Sent"><Check className="w-3.5 h-3.5 text-gray-400" /></span>
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
});
ChatMessageRow.displayName = 'ChatMessageRow';

export const ChatMessageThread: React.FC<ChatMessageThreadProps> = React.memo(({
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
  const [clickedPrompts, setClickedPrompts] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const handleImageError = React.useCallback((msgId: string) => {
    setFailedImages((prev) => ({ ...prev, [msgId]: true }));
  }, []);
  const [headerImgError, setHeaderImgError] = useState(false);

  useEffect(() => {
    setHeaderImgError(false);
  }, [conversation?.id]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, 120);
    el.style.height = `${Math.max(nextHeight, 36)}px`;
  }, [inputText]);

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

  const isBuyer = conversation.otherParty?.role === 'Seller';
  const quickPrompts = isBuyer
    ? ['Hi, is this still available?', 'What is your final price?', 'Can I inspect it today?', 'Where in the city can we meet?']
    : ['Yes, it is available.', 'Price is firm.', 'Yes, you can inspect it today.', 'When would you like to pick it up?'];

  const availablePrompts = quickPrompts.filter(
    (prompt) =>
      !clickedPrompts.includes(prompt) &&
      !messages.some((m) => m.content?.toLowerCase().trim() === prompt.toLowerCase().trim())
  );

  const handleQuickPromptClick = (prompt: string) => {
    if (isSending || conversation.isBlocked) return;
    setClickedPrompts((prev) => [...prev, prompt]);
    onSendMessage(prompt);
    setTimeout(() => textareaRef.current?.focus(), 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((inputText.trim() || selectedImage) && !conversation.isBlocked && !isSending && !uploadingImage) {
        handleSendWithImage();
      }
    }
  };

  const rawThumb =
    conversation.ad?.imageUrl ||
    (conversation.ad?.images?.[0] as any)?.url ||
    conversation.ad?.images?.[0]?.displayUrl ||
    conversation.ad?.images?.[0]?.thumbnailUrl;

  const adThumb = rawThumb ? formatMediaUrl(rawThumb) : null;

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
    if (isSending || conversation.isBlocked) return;
    const textToSend = inputText.trim();
    if (selectedImage) {
      setUploadingImage(true);
      const localPreview = imagePreviewUrl;
      try {
        const formData = new FormData();
        formData.append('file', selectedImage);
        const uploadUrl = conversation?.id
          ? `/uploads?resource=chats&resourceId=${encodeURIComponent(conversation.id)}`
          : '/uploads?resource=chats';
        const res = await apiClient.post(uploadUrl, formData);
        const uploadedUrl =
          res.data?.data?.[0]?.url ||
          res.data?.data?.[0]?.displayUrl ||
          res.data?.data?.[0]?.variants?.large ||
          res.data?.url ||
          res.data?.data?.url;
        onSendMessage(textToSend, uploadedUrl, localPreview || undefined);
        setSelectedImage(null);
        setImagePreviewUrl(null);
        onInputChange('');
      } catch (err) {
        console.error('Failed to upload image', err);
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(false);
      }
    } else if (textToSend) {
      onSendMessage(textToSend);
      onInputChange('');
    }
    setTimeout(() => textareaRef.current?.focus(), 10);
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
          <div className="relative flex-shrink-0 w-11 h-11 rounded bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
            {adThumb && !headerImgError ? (
              <img
                src={adThumb}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setHeaderImgError(true)}
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-gray-400" />
            )}
            {conversation.otherParty?.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full z-10" />
            )}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5 truncate">
              <h4 className="text-sm font-bold text-gray-900 truncate">{conversation.otherParty?.name || 'User'}</h4>
              <span className="text-[10px] text-gray-400">({conversation.otherParty?.role || 'User'})</span>
              {conversation.otherParty?.isOnline && (
                <span className="text-[10px] text-emerald-600 font-semibold">• Online</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 truncate">
              <span className="font-semibold text-[#002f34] truncate">{conversation.ad?.title || 'Classified Ad'}</span>
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
                  if (confirm(`Block ${conversation.otherParty?.name || 'this user'}? You will no longer receive messages from this user.`)) {
                    if (conversation.otherParty?.id) onBlockUser?.(conversation.otherParty.id);
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
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa] no-scrollbar overscroll-contain"
      >
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

        {messages.map((msg, idx) => (
          <ChatMessageRow
            key={msg.id}
            msg={msg}
            isMine={msg.senderId === currentUserId}
            isLatest={idx >= messages.length - 2}
            otherPartyName={conversation.otherParty?.name || 'User'}
            otherPartyRole={conversation.otherParty?.role || 'User'}
            isFailed={Boolean(failedImages[msg.id])}
            onImageError={handleImageError}
            onDeleteMessage={onDeleteMessage}
          />
        ))}

        {isOtherTyping && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 italic py-1">
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-ping" />
            <span>{conversation.otherParty?.name || 'User'} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>



      {/* Quick Prompts Strip */}
      {availablePrompts.length > 0 && (
        <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mr-1" />
          {availablePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isSending || conversation.isBlocked}
              onClick={() => handleQuickPromptClick(prompt)}
              className="text-[11px] whitespace-nowrap bg-gray-100 hover:bg-gray-200 text-[#002f34] font-medium px-2.5 py-1 rounded-full border border-gray-200 transition cursor-pointer disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Box Bar - WhatsApp Style */}
      <div className="p-2.5 sm:p-3 bg-[#f0f2f5] border-t border-gray-200 flex-shrink-0">
        {imagePreviewUrl && (
          <div className="mb-2 relative inline-block">
            <img src={imagePreviewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-gray-300 shadow-sm" />
            <button
              type="button"
              onClick={() => { setSelectedImage(null); setImagePreviewUrl(null); }}
              className="absolute -top-1.5 -right-1.5 bg-gray-900/80 text-white rounded-full p-0.5 hover:bg-black"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendWithImage();
          }}
          className="flex items-end gap-2"
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
            disabled={conversation.isBlocked || uploadingImage}
            className="p-2 text-gray-500 hover:text-[#002f34] hover:bg-gray-200 rounded-full transition cursor-pointer disabled:opacity-40 mb-0.5 shrink-0"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 bg-white border border-gray-300 focus-within:border-[#002f34] focus-within:ring-1 focus-within:ring-[#002f34] rounded-2xl px-3.5 py-2 shadow-sm transition flex items-center min-h-[40px]">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={true}
              autoCorrect="on"
              autoCapitalize="sentences"
              autoComplete="on"
              placeholder={conversation.isBlocked ? 'This conversation is blocked' : 'Type a message... (Shift + Enter for new line)'}
              disabled={conversation.isBlocked || uploadingImage}
              className="w-full text-xs text-gray-800 placeholder-gray-400 bg-transparent resize-none focus:outline-none max-h-28 overflow-y-auto leading-relaxed scrollbar-thin"
            />
          </div>

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || conversation.isBlocked || uploadingImage}
            className="p-2.5 bg-[#002f34] text-white hover:bg-[#003d44] rounded-full disabled:opacity-40 transition cursor-pointer shrink-0 mb-0.5 shadow-sm active:scale-95"
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900">Report Conversation</h3>
            <p className="text-xs text-gray-500">Help us keep the BLX Orbit marketplace safe by reporting suspicious behavior.</p>
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
                <button type="button" onClick={() => setShowReportModal(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700">Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
