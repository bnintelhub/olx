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
import { useQueryClient } from '@tanstack/react-query';
import { ADS_QUERY_KEYS } from '@/features/ads/hook/useAdsQuery';
import { useChatNotificationListener } from '@/features/chat/hooks/useChatNotificationListener';
import { PushNotificationPrompt } from '@/features/notifications/components/PushNotificationPrompt';
import { usePushNotifications } from '@/features/notifications/usePushNotifications';

export const AppLayout: React.FC = () => {
  useChatNotificationListener();
  usePushNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, openAuthModal } = useAuthStore();
  const ui = useUIStore();

  // Show main Navbar only on the Home page ('/')
  const isHomePage = location.pathname === '/';
  const isChatPage = location.pathname.startsWith('/chat');

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
    const adminUrl = (import.meta as any).env?.VITE_ADMIN_URL || 'http://localhost:5174';
    window.open(adminUrl, '_blank');
  };

  return (
    <div className={`min-h-screen flex flex-col bg-[#F5F7F8] ${isChatPage ? 'h-screen overflow-hidden' : ''}`}>
      {/* WhatsApp-style Push Notification Permission Prompt */}
      <PushNotificationPrompt />

      {/* Navbar (Rendered only on the Home page) */}
      {isHomePage && (
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
