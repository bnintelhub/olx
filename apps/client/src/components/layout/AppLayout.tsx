import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { Footer } from './Footer';
import { AuthModal } from '../AuthModal';
import { PostAdModal } from '../PostAdModal';
import { MyAdsModal } from '../MyAdsModal';
import { ChatModal } from '../ChatModal';
import { WishlistModal } from '../WishlistModal';
import { UserProfileModal } from '../UserProfileModal';
import { UserFeatureModal, UserFeatureType } from '../UserFeatureModal';
import { ReportAdModal } from '../ReportAdModal';
import { AdminCategoryBuilder } from '../AdminCategoryBuilder';
import { AdminModerationModal } from '../AdminModerationModal';
import { AdminPortal } from '../AdminPortal';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { AdItem } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { ADS_QUERY_KEYS } from '@/features/ads/hook/useAdsQuery';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, openAuthModal } = useAuthStore();
  const hasStaffAccess = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  // Global modals state
  const [isPostAdOpen, setIsPostAdOpen] = useState(false);
  const [isMyAdsOpen, setIsMyAdsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTargetAd, setChatTargetAd] = useState<AdItem | null>(null);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userFeatureModalType, setUserFeatureModalType] = useState<UserFeatureType>(null);
  const [reportingAd, setReportingAd] = useState<{ id: string; title: string } | null>(null);
  const [isCategoryStudioOpen, setIsCategoryStudioOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);

  const handleOpenPostAd = () => {
    if (!user) {
      openAuthModal(() => setIsPostAdOpen(true));
    } else {
      setIsPostAdOpen(true);
    }
  };

  const handleOpenChat = (ad?: AdItem, _initialMessage?: string) => {
    if (!user) {
      openAuthModal(() => {
        if (ad) setChatTargetAd(ad);
        setIsChatOpen(true);
      });
    } else {
      if (ad) setChatTargetAd(ad);
      setIsChatOpen(true);
    }
  };

  const handleAdCreated = () => {
    queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.all });
    setIsMyAdsOpen(true);
  };

  // If Admin Portal full view is triggered
  if (isAdminPortalOpen && hasStaffAccess) {
    return (
      <AdminPortal
        onExitToCustomerSite={() => setIsAdminPortalOpen(false)}
        categories={[]}
        cities={[]}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F8]">
      {/* Navbar with route-based search and direct navigation */}
      <Navbar
        onLogoClick={() => navigate('/')}
        onSearch={(kw, citySlug) => {
          const params = new URLSearchParams();
          if (kw) params.set('q', kw);
          if (citySlug) params.set('city', citySlug);
          navigate(`/search?${params.toString()}`);
        }}
        onOpenPostAd={handleOpenPostAd}
        onOpenMyAds={() => setIsMyAdsOpen(true)}
        onOpenChat={() => handleOpenChat()}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenFeature={(type) => setUserFeatureModalType(type)}
        onOpenAdminPortal={() => {
          if (hasStaffAccess) {
            setIsAdminPortalOpen(true);
          }
        }}
      />

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet context={{ onOpenPostAd: handleOpenPostAd, onOpenChat: handleOpenChat }} />
      </main>

      {/* Footer */}
      <Footer
        onOpenAdminPortal={hasStaffAccess ? () => setIsAdminPortalOpen(true) : undefined}
      />

      {/* Auth Modal */}
      <AuthModal />

      {/* Post Ad Modal */}
      <PostAdModal
        isOpen={isPostAdOpen}
        onClose={() => setIsPostAdOpen(false)}
        onAdCreated={handleAdCreated}
      />

      {/* My Ads Dashboard Modal */}
      <MyAdsModal
        isOpen={isMyAdsOpen}
        onClose={() => setIsMyAdsOpen(false)}
        onOpenPostAd={handleOpenPostAd}
      />

      {/* Buyer-Seller Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatTargetAd(null);
        }}
        initialAd={chatTargetAd}
      />

      {/* Wishlist Modal */}
      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        onSelectAd={(ad) => navigate(`/ad/${ad.id}`)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenMyAds={() => setIsMyAdsOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
      />

      {/* User Feature Modal */}
      <UserFeatureModal
        type={userFeatureModalType}
        onClose={() => setUserFeatureModalType(null)}
        onOpenProfile={() => {
          setUserFeatureModalType(null);
          setIsProfileModalOpen(true);
        }}
      />

      {/* Report Ad Modal */}
      <ReportAdModal
        isOpen={Boolean(reportingAd)}
        adId={reportingAd?.id || null}
        adTitle={reportingAd?.title}
        onClose={() => setReportingAd(null)}
      />

      {/* Staff Admin Modals */}
      <AdminCategoryBuilder
        isOpen={isCategoryStudioOpen}
        onClose={() => setIsCategoryStudioOpen(false)}
      />

      <AdminModerationModal
        isOpen={isModerationOpen}
        onClose={() => {
          setIsModerationOpen(false);
          queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.all });
        }}
      />
    </div>
  );
};
