import React from 'react';
import { Headphones, Tag, ShieldAlert, ArrowUpRight, Check } from 'lucide-react';
import { NotificationItem } from '../NotificationModal';
import { formatNotificationTimestamp } from './notification.utils';

interface NotificationCardProps {
  notification: NotificationItem;
  onClick: (notif: NotificationItem) => void;
  onMarkRead?: (id: string) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onClick,
  onMarkRead,
}) => {
  const ticketId = notification.data?.ticketId;
  const isSupport = Boolean(ticketId) || notification.type?.includes('SUPPORT');
  const isOffer = notification.type?.includes('OFFER') || notification.type?.includes('PROMO');
  const isUnread = !notification.isRead;

  // Visual avatar badge
  const getAvatar = () => {
    if (isSupport) {
      return (
        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Headphones className="w-4 h-4" />
        </div>
      );
    }
    if (isOffer) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Tag className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
        <ShieldAlert className="w-4 h-4" />
      </div>
    );
  };

  const cleanTicketNumber = ticketId
    ? `#${ticketId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
    : '';

  return (
    <div
      onClick={() => onClick(notification)}
      className={`px-5 py-3 border-b border-gray-100 transition cursor-pointer flex items-start gap-3.5 text-left group relative ${
        isUnread
          ? 'bg-blue-50/40 hover:bg-blue-50/70 border-l-4 border-l-blue-600'
          : 'bg-white hover:bg-gray-50/80 border-l-4 border-l-transparent'
      }`}
    >
      {/* Left Avatar Icon */}
      {getAvatar()}

      {/* Middle Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4
              className={`text-xs truncate ${
                isUnread ? 'font-bold text-gray-900' : 'font-normal text-gray-600'
              }`}
            >
              {ticketId ? `Support Ticket ${cleanTicketNumber}` : notification.title}
            </h4>
            {isUnread && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-blue-600 text-white shrink-0 uppercase tracking-wide">
                New
              </span>
            )}
          </div>

          <span className="text-[11px] text-gray-400 shrink-0 font-normal">
            {formatNotificationTimestamp(notification.createdAt)}
          </span>
        </div>

        <p
          className={`text-xs line-clamp-1 mt-0.5 leading-snug ${
            isUnread ? 'text-gray-700 font-medium' : 'text-gray-400 font-normal'
          }`}
        >
          {notification.body}
        </p>

        <div className="flex items-center justify-between mt-1.5 pt-0.5">
          <span className="text-[11px] font-semibold text-teal-600 group-hover:text-teal-700 flex items-center gap-0.5">
            <span>{ticketId ? 'View Ticket Thread' : 'View Details'}</span>
            <ArrowUpRight className="w-3 h-3" />
          </span>

          {/* Quick Mark-as-read check button for unread notifications */}
          {isUnread && onMarkRead && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
              className="text-[10px] text-gray-400 hover:text-blue-600 flex items-center gap-1 hover:underline cursor-pointer opacity-0 group-hover:opacity-100 transition"
              title="Mark as read"
            >
              <Check className="w-3 h-3 text-blue-600" />
              <span>Mark read</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Edge: Bold Blue Unread Indicator Dot */}
      {isUnread && (
        <div className="shrink-0 self-center pl-1" title="Unread notification">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block ring-4 ring-blue-100" />
        </div>
      )}
    </div>
  );
};
