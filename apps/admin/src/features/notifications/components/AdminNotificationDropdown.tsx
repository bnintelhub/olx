import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Headphones,
  ShieldAlert,
  CreditCard,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  useNotificationsQuery,
  useNotificationsUnreadCountQuery,
} from '../hook/useNotificationsQuery';
import {
  useMarkAllNotificationsReadMutation,
  useMarkOneNotificationReadMutation,
} from '../hook/useNotificationsMutation';
import { AdminNotificationItem } from '../service/notifications.service';

export function AdminNotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useNotificationsUnreadCountQuery();
  const { data: notifications = [], isLoading } = useNotificationsQuery(isOpen);
  const markAllMutation = useMarkAllNotificationsReadMutation();
  const markOneMutation = useMarkOneNotificationReadMutation();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notif: AdminNotificationItem) => {
    if (!notif.isRead) {
      markOneMutation.mutate(notif.id);
    }
    setIsOpen(false);
    const ticketId = notif.data?.ticketId;
    if (ticketId) {
      navigate(`/support?ticketId=${ticketId}`);
    } else if (notif.data?.clickUrl) {
      navigate(notif.data.clickUrl);
    } else if (notif.type === 'SUPPORT_MESSAGE') {
      navigate('/support');
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'SUPPORT_MESSAGE':
        return <Headphones className="h-4 w-4 text-teal-500" />;
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_FAILED':
        return <CreditCard className="h-4 w-4 text-emerald-500" />;
      case 'SECURITY_ALERT':
      case 'SYSTEM_ALERT':
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button with Live Unread Badge */}
      <Button
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground hover:text-foreground h-8 w-8 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        title="Staff Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border bg-popover text-popover-foreground shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">All caught up</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No notifications or urgent alerts for your desk right now.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`flex gap-3 p-3.5 hover:bg-muted/50 transition cursor-pointer text-left ${
                    !item.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0 h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-semibold truncate ${!item.isRead ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {item.body}
                    </p>
                  </div>
                  {!item.isRead && (
                    <div className="shrink-0 self-center">
                      <span className="h-2 w-2 rounded-full bg-primary block" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t bg-muted/20 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                navigate('/support');
              }}
              className="w-full text-xs text-primary hover:text-primary h-8 gap-1.5"
            >
              <Headphones className="h-3.5 w-3.5" />
              Open Customer Support Desk
              <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
