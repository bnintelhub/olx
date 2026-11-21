import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { Footer } from './Footer';
import { AuthModal } from '../AuthModal';
import { PostAdModal } from '../PostAdModal';
import { MyAdsModal } from '../MyAdsModal';
import { WishlistModal } from '../WishlistModal';
import { UserProfileModal } from '../UserProfileModal';
import { UserFeatureModal } from '../UserFeatureModal';
import { ReportAdModal } from '../ReportAdModal';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ADS_QUERY_KEYS } from '@/features/ads/hook/useAdsQuery';
import { useChatNotificationListener } from '@/features/chat/hooks/useChatNotificationListener';
import { PushNotificationPrompt } from '@/features/notifications/components/PushNotificationPrompt';
import { usePushNotifications } from '@/features/notifications/usePushNotifications';
import { useNotificationSSE } from '@/features/notifications/useNotificationSSE';
import { NotificationModal } from '../NotificationModal';
import { Bell } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export const AppLayout: React.FC = () => {
  useChatNotificationListener();
  usePushNotifications();
  useNotificationSSE();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, openAuthModal } = useAuthStore();
  const ui = useUIStore();

  const isChatPage = location.pathname.startsWith('/chat');
  const showNavbar = location.pathname === '/';
  const showPageHeader = location.pathname !== '/' && !isChatPage;
  const notification = useUIStore();

  const { data: notifData } = useQuery<{ count: number }>({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count');
      return res.data;
    },
    enabled: Boolean(user?.id),
    staleTime: 5000,
  });
  const unreadNotifications = notifData?.count || 0;

  // Keep route transitions independent of the previous page's scroll position.
  React.useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  React.useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  const handleOpenPostAd = () => {
    if (!user) {
      openAuthModal(() => navigate('/sell'));
    } else {
      navigate('/sell');
    }
  };

  const handleOpenChat = (ad?: any) => {
    const targetUrl = ad?.id ? `/chat?adId=${ad.id}` : '/chat';
    if (!user) {
      openAuthModal(() => navigate(targetUrl));
    } else {
      navigate(targetUrl);
    }
  };

  // Redirect any legacy chat triggers to dedicated full-page /chat route
  React.useEffect(() => {
    if (ui.isChatOpen) {
      const targetAd = ui.chatTargetAd;
      ui.closeChat();
      navigate(targetAd?.id ? `/chat?adId=${targetAd.id}` : '/chat');
    }
  }, [ui.isChatOpen, ui.chatTargetAd, navigate, ui]);

  const handleOpenMyAds = () => {
    navigate('/my-ads');
  };

  const handleAdCreated = () => {
    queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.all });
    navigate('/my-ads');
  };

  const handleOpenAdminPortal = () => {
    window.open(`${window.location.origin}/admin`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`min-h-screen flex flex-col bg-[#F5F7F8] ${isChatPage ? 'h-screen overflow-hidden' : ''}`}>
      {/* Push Notification Permission Prompt */}
      <PushNotificationPrompt />

      {showPageHeader && (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm font-bold text-[#002f34] transition hover:text-teal-700"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#002f34] text-xs font-black text-white">
                BLX
              </span>
              <span className="hidden sm:inline">BLX Orbit</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={() => {
                  if (notification.isNotificationOpen) notification.closeNotification();
                  else notification.openNotification();
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#002f34] transition hover:bg-slate-100"
                aria-label="Open notifications"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#00a49f] px-1 text-[10px] font-bold text-white">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>
      )}

      {showPageHeader && user && (
        <NotificationModal
          isOpen={notification.isNotificationOpen}
          onClose={notification.closeNotification}
        />
      )}

      {/* Navbar (Rendered across the application except full-screen chat) */}
      {showNavbar && (
        <Navbar
          onLogoClick={() => navigate('/')}
          onSearch={(kw, citySlug, locationId) => {
            const params = new URLSearchParams();
            if (kw) params.set('q', kw);
            if (citySlug) params.set('city', citySlug);
            if (locationId) params.set('locationId', locationId);
            navigate(`/search?${params.toString()}`);
          }}
          onOpenPostAd={handleOpenPostAd}
          onOpenMyAds={handleOpenMyAds}
          onOpenChat={() => handleOpenChat()}
          onOpenWishlist={ui.openWishlist}
          onOpenProfile={ui.openProfile}
          onOpenFeature={ui.openUserFeature}
          onOpenAdminPortal={handleOpenAdminPortal}
        />
      )}

      {/* Main Outlet */}
      <main className={`flex-1 ${isChatPage ? 'min-h-0 overflow-hidden flex flex-col' : ''}`}>
        <Outlet context={{ onOpenPostAd: handleOpenPostAd, onOpenChat: handleOpenChat }} />
      </main>

      {/* Footer */}
      {!isChatPage && <Footer onOpenAdminPortal={handleOpenAdminPortal} />}

      {/* Modals managed by Zustand UI Store */}
      <AuthModal />

      <PostAdModal
        isOpen={ui.isPostAdOpen}
        onClose={ui.closePostAd}
        onAdCreated={handleAdCreated}
      />

      <MyAdsModal
        isOpen={ui.isMyAdsOpen}
        onClose={ui.closeMyAds}
        onOpenPostAd={handleOpenPostAd}
      />

      <WishlistModal
        isOpen={ui.isWishlistOpen}
        onClose={ui.closeWishlist}
        onSelectAd={(ad) => navigate(`/ad/${ad.id}`)}
      />

      <UserProfileModal
        isOpen={ui.isProfileOpen}
        onClose={ui.closeProfile}
        onOpenMyAds={ui.openMyAds}
        onOpenWishlist={ui.openWishlist}
      />

      <UserFeatureModal
        type={ui.userFeatureType}
        onClose={ui.closeUserFeature}
        onOpenProfile={() => {
          ui.closeUserFeature();
          ui.openProfile();
        }}
      />

      <ReportAdModal
        isOpen={Boolean(ui.reportingAd)}
        adId={ui.reportingAd?.id || null}
        adTitle={ui.reportingAd?.title}
        onClose={ui.closeReportAd}
      />
    </div>
  );
};
