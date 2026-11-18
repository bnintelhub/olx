import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  X,
  Bell,
  Headphones,
  CheckCheck,
  Flag,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { NotificationCard } from './notifications/NotificationCard';
import { NotificationDetailView } from './notifications/NotificationDetailView';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type NotificationCategory = 'ALL' | 'SUPPORT' | 'OFFERS' | 'SYSTEM';

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('ALL');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);

  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user.id] });
      }
    } else if (shouldRender) {
      handleCloseAnimation();
    }
  }, [isOpen, user?.id]);

  // Fetch notifications strictly scoped to user and excluding chat messages
  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      const list: NotificationItem[] = res.data?.data || [];
      return list.filter((n) => n.type !== 'CHAT_MESSAGE');
    },
    enabled: Boolean(isOpen || shouldRender) && Boolean(user?.id),
    staleTime: 2000,
  });

  // Mark all read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      if (user?.id) queryClient.setQueryData(['notifications-unread-count', user.id], { count: 0 });
      queryClient.setQueryData(['notifications-unread-count'], { count: 0 });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Mark one read mutation
  const markOneReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // GSAP Right Slide-In Animation
  useLayoutEffect(() => {
    if (shouldRender && isOpen && drawerRef.current) {
      gsap.killTweensOf([drawerRef.current, backdropRef.current]);

      // Fade-in backdrop
      if (backdropRef.current) {
        gsap.fromTo(
          backdropRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.25, ease: 'power2.out' }
        );
      }

      // Slide in from right edge
      gsap.fromTo(
        drawerRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.32, ease: 'power3.out' }
      );
    }
  }, [shouldRender, isOpen]);

  const handleCloseAnimation = () => {
    if (!drawerRef.current) {
      setShouldRender(false);
      return;
    }

    gsap.killTweensOf([drawerRef.current, backdropRef.current]);

    gsap.to(drawerRef.current, {
      x: '100%',
      duration: 0.22,
      ease: 'power2.in',
    });

    if (backdropRef.current) {
      gsap.to(backdropRef.current, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          setShouldRender(false);
        },
      });
    } else {
      setShouldRender(false);
    }
  };

  const handleUserClose = () => {
    handleCloseAnimation();
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleUserClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!shouldRender) return null;

  const totalUnreadCount = notifications.filter((n) => !n.isRead).length;

  const categorizeNotification = (notif: NotificationItem): NotificationCategory => {
    const type = notif.type?.toUpperCase() || '';
    if (type.includes('OFFER') || type.includes('PROMO') || type.includes('DISCOUNT')) return 'OFFERS';
    if (type.includes('SUPPORT') || type.includes('TICKET') || notif.data?.ticketId) return 'SUPPORT';
    return 'SYSTEM';
  };

  const filteredNotifications = notifications.filter((n) => {
    if (onlyUnread && n.isRead) return false;
    if (activeCategory === 'ALL') return true;
    return categorizeNotification(n) === activeCategory;
  });

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      if (user?.id) {
        queryClient.setQueryData<NotificationItem[]>(['notifications', user.id], (old = []) =>
          old.map((item) => (item.id === notif.id ? { ...item, isRead: true } : item))
        );
        queryClient.setQueryData<{ count: number }>(['notifications-unread-count', user.id], (old) => ({
          count: Math.max(0, (old?.count ?? 1) - 1),
        }));
      }
      queryClient.setQueryData<{ count: number }>(['notifications-unread-count'], (old) => ({
        count: Math.max(0, (old?.count ?? 1) - 1),
      }));
      markOneReadMutation.mutate(notif.id);
    }

    const ticketId = notif.data?.ticketId;
    if (ticketId) {
      void queryClient.invalidateQueries({ queryKey: ['client', 'support', 'ticket', ticketId] });
      void queryClient.invalidateQueries({ queryKey: ['client', 'support', 'tickets'] });
      handleCloseAnimation();
      navigate(`/support?ticketId=${ticketId}`);
      return;
    }

    if (notif.data?.clickUrl) {
      handleCloseAnimation();
      navigate(notif.data.clickUrl);
      return;
    }

    setSelectedNotification(notif);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Click-away Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleUserClose}
        className="fixed inset-0 bg-black/35 backdrop-blur-[1px] transition-opacity cursor-pointer"
      />

      {/* Right-Side Slide-Over Drawer with Clean White Background (Matching Image 3) */}
      <div
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white shadow-2xl flex flex-col border-l border-gray-200 z-50 select-none"
      >
        {/* Header Bar */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Notifications
            </h2>
            {totalUnreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                {totalUnreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Only Show Unread Toggle Switch */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                Only show unread
              </span>
              <button
                type="button"
                onClick={() => setOnlyUnread(!onlyUnread)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${onlyUnread ? 'bg-teal-600' : 'bg-gray-200'
                  }`}
                title="Filter by unread"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${onlyUnread ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            {totalUnreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleUserClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {selectedNotification ? (
          /* Detail View */
          <NotificationDetailView
            notification={selectedNotification}
            onBack={() => setSelectedNotification(null)}
            onOpenTicket={(tId) => {
              handleCloseAnimation();
              navigate(`/support?ticketId=${tId}`);
            }}
          />
        ) : (
          <>
            {/* Horizontal Tabs with Underline Active Indicator */}
            <div className="px-6 border-b border-gray-100 flex items-center gap-5 bg-white shrink-0 overflow-x-auto no-scrollbar">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'SUPPORT', label: 'Support' },
                { id: 'OFFERS', label: 'Offers' },
                { id: 'SYSTEM', label: 'Alerts' },
              ].map((tab) => {
                const isSelected = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id as NotificationCategory)}
                    className={`py-3 text-xs font-bold transition-all relative cursor-pointer whitespace-nowrap ${isSelected
                        ? 'text-[#002f34] border-b-2 border-[#002f34]'
                        : 'text-gray-400 hover:text-gray-700'
                      }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Section Header */}
            <div className="px-6 pt-3 pb-1 bg-white">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Latest
              </span>
            </div>

            {/* Notification List Body (Compact Cards for High Density) */}
            <div
              ref={listContainerRef}
              className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white"
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#002f34]" />
                  <span className="text-xs">Loading notifications...</span>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-1">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">
                    {onlyUnread ? 'No unread notifications' : 'No notifications yet'}
                  </p>
                  <p className="text-xs text-gray-400 max-w-xs">
                    {onlyUnread
                      ? 'You have caught up with all your unread alerts.'
                      : 'Support responses, dispute updates, and platform notices will appear here.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notification={notif}
                    onClick={handleNotificationClick}
                    onMarkRead={(id) => markOneReadMutation.mutate(id)}
                  />
                ))
              )}

              {/* Informational Message at end of list (matching Image 3) */}
              {!isLoading && filteredNotifications.length > 0 && (
                <div className="py-8 px-6 text-center flex flex-col items-center justify-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Flag className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium">
                    That's all your notifications from the last 30 days.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Footer Action Bar */}
            <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs text-gray-500 shrink-0">
              <span className="font-medium">{filteredNotifications.length} items shown</span>
              <button
                type="button"
                onClick={() => {
                  handleUserClose();
                  navigate('/support');
                }}
                className="text-[#002f34] font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Customer Support Desk</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
