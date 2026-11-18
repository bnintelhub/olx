import React, { useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Send,
  Loader2,
  RefreshCw,
  Clock,
  Folder,
} from 'lucide-react';
import { SupportTicket, SupportTicketEntry } from '../services/support.service';

interface SupportConversationViewProps {
  ticket: SupportTicket | null | undefined;
  isLoading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  replyMessage: string;
  onChangeReplyMessage: (value: string) => void;
  onSubmitReply: (e: React.FormEvent) => void;
  isReplying: boolean;
}

export const SupportConversationView: React.FC<SupportConversationViewProps> = ({
  ticket,
  isLoading,
  onBack,
  onRefresh,
  replyMessage,
  onChangeReplyMessage,
  onSubmitReply,
  isReplying,
}) => {
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticket?.entries?.length) {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticket?.entries?.length]);

  const formatTicketNumber = (id: string) => {
    const clean = id.replace(/-/g, '');
    return `#${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]';
      case 'OPEN':
        return 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]';
      case 'IN_PROGRESS':
      case 'WAITING_ON_CUSTOMER':
        return 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]';
      case 'CLOSED':
      default:
        return 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-5 sm:px-7 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-[#012f27] flex items-center gap-2 hover:opacity-80 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Inquiries</span>
        </button>

        {ticket && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black text-slate-500">
              {formatTicketNumber(ticket.id)}
            </span>

            <span
              className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${getStatusBadge(
                ticket.status
              )}`}
            >
              {ticket.status.replace(/_/g, ' ')}
            </span>

            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-full text-slate-400 hover:text-[#012f27] hover:bg-slate-200/60 transition cursor-pointer"
              title="Refresh conversation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {isLoading || !ticket ? (
        <div className="py-24 flex flex-col items-center justify-center text-xs text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#012f27]" />
          <span className="font-semibold">Loading ticket conversation...</span>
        </div>
      ) : (
        <div>
          {/* Ticket Metadata Bar */}
          <div className="px-5 sm:px-7 py-5 bg-slate-50/30 border-b border-slate-100">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {ticket.subject}
            </h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                Category:{' '}
                <strong className="text-slate-800 uppercase tracking-wide">
                  {ticket.category.replace(/_/g, ' ')}
                </strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Created: {new Date(ticket.createdAt).toLocaleString()}
              </span>
              <span>•</span>
              <span>
                Priority: <strong className="text-slate-800">{ticket.priority}</strong>
              </span>
            </div>
          </div>

          {/* Conversation Messages */}
          <div className="p-5 sm:p-7 space-y-4 max-h-[520px] overflow-y-auto bg-slate-50/20">
            {ticket.entries?.map((entry: SupportTicketEntry) => {
              const isSupport = entry.author?.role !== 'USER';
              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl p-4 sm:p-5 text-xs max-w-xl transition shadow-xs ${
                    isSupport
                      ? 'bg-emerald-50/60 border border-emerald-200/70 ml-auto'
                      : 'bg-white border border-slate-200 mr-auto'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 text-[11px]">
                    <span className="font-extrabold flex items-center gap-1.5">
                      {isSupport ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-700" />
                          <span className="text-emerald-900 font-black">
                            BLX Support Specialist
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-900 font-black">You</span>
                      )}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs">
                    {entry.body}
                  </p>
                </div>
              );
            })}
            <div ref={conversationEndRef} />
          </div>

          {/* Reply Box */}
          {ticket.status !== 'CLOSED' ? (
            <form
              onSubmit={onSubmitReply}
              className="p-4 sm:p-6 border-t border-slate-100 bg-white flex gap-3 items-center"
            >
              <input
                type="text"
                placeholder="Type your reply to our support team..."
                value={replyMessage}
                onChange={(e) => onChangeReplyMessage(e.target.value)}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#012f27] focus:border-transparent outline-none transition"
              />
              <button
                type="submit"
                disabled={isReplying || !replyMessage.trim()}
                className="bg-[#012f27] hover:bg-[#02493d] text-white px-5 sm:px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isReplying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 rotate-45" />
                )}
                <span>Send Reply</span>
              </button>
            </form>
          ) : (
            <div className="p-5 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-t border-slate-100">
              This inquiry has been closed. If you require further assistance, please open a new ticket.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
