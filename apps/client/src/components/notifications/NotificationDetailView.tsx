import React from 'react';
import { Headphones, ArrowLeft } from 'lucide-react';
import { NotificationItem } from '../NotificationModal';

interface NotificationDetailViewProps {
  notification: NotificationItem;
  onBack: () => void;
  onOpenTicket: (ticketId: string) => void;
}

export const NotificationDetailView: React.FC<NotificationDetailViewProps> = ({
  notification,
  onBack,
  onOpenTicket,
}) => {
  return (
    <div className="p-6 overflow-y-auto space-y-5 bg-white">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to all notifications</span>
      </button>

      <div>
        <span className="text-[11px] font-mono text-gray-400">
          {new Date(notification.createdAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
        <h3 className="text-base font-bold text-gray-900 leading-snug mt-1">
          {notification.title}
        </h3>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
        {notification.body}
      </div>

      {notification.data?.ticketId && (
        <button
          type="button"
          onClick={() => onOpenTicket(notification.data!.ticketId)}
          className="w-full bg-[#002f34] hover:bg-[#003d44] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
        >
          <Headphones className="w-4 h-4" />
          <span>Open Ticket in Support Desk</span>
        </button>
      )}
    </div>
  );
};
