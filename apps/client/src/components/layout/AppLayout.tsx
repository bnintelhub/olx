import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { Footer } from './Footer';
import { AuthModal } from '../AuthModal';
import { PostAdModal } from '../PostAdModal';
import { MyAdsModal } from '../MyAdsModal';
import { ChatModal } from '../ChatModal';
import { WishlistModal } from '../WishlistModal';
import { UserProfileModal } from '../UserProfileModal';
import { UserFeatureModal } from '../UserFeatureModal';
import { ReportAdModal } from '../ReportAdModal';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { useQueryClient } from '@tanstack/react-query';
import { ADS_QUERY_KEYS } from '@/features/ads/hook/useAdsQuery';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, openAuthModal } = useAuthStore();
  const ui = useUIStore();

  // Show main Navbar only on the Home page ('/')
  const isHomePage = location.pathname === '/';

  const handleOpenPostAd = () => {
    if (!user) {
      openAuthModal(() => navigate('/sell'));
    } else {
      navigate('/sell');
    }
  };

  const handleOpenChat = (ad?: any, initialMessage?: string) => {
    if (!user) {
      openAuthModal(() => ui.openChat(ad, initialMessage));
    } else {
      ui.openChat(ad, initialMessage);
    }
  };

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
    <div className="min-h-screen flex flex-col bg-[#F5F7F8]">
      {/* Navbar (Rendered only on the Home page) */}
      {isHomePage && (
        <Navbar
          onLogoClick={() => navigate('/')}
          onSearch={(kw, citySlug) => {
            const params = new URLSearchParams();
            if (kw) params.set('q', kw);
            if (citySlug) params.set('city', citySlug);
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
      <main className="flex-1">
        <Outlet context={{ onOpenPostAd: handleOpenPostAd, onOpenChat: handleOpenChat }} />
      </main>

      {/* Footer */}
      <Footer onOpenAdminPortal={handleOpenAdminPortal} />

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

      <ChatModal
        isOpen={ui.isChatOpen}
        onClose={ui.closeChat}
        initialAd={ui.chatTargetAd}
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
