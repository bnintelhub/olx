import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CategoriesRibbon } from './components/CategoriesRibbon';
import { HeroBanner } from './components/HeroBanner';
import { CategoryGrid } from './components/CategoryGrid';
import { AuthModal } from './components/AuthModal';
import { AdminCategoryBuilder } from './components/AdminCategoryBuilder';
import { PostAdModal } from './components/PostAdModal';
import { MyAdsModal } from './components/MyAdsModal';
import { SearchPage } from './components/SearchPage';
import { AdCard } from './components/AdCard';
import { AdDetailModal } from './components/AdDetailModal';
import { ChatModal } from './components/ChatModal';
import { WishlistModal } from './components/WishlistModal';
import { AdminModerationModal } from './components/AdminModerationModal';
import { ReportAdModal } from './components/ReportAdModal';
import { UserProfileModal } from './components/UserProfileModal';
import { UserFeatureModal, UserFeatureType } from './components/UserFeatureModal';
import { AdminPortal } from './components/AdminPortal';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { AdItem, Category, LocationItem } from './types';
import { AdminErrorBoundary } from './admin/components/feedback/AdminErrorBoundary';

export const App: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const hasStaffAccess = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  // Modals state
  const [isCategoryStudioOpen, setIsCategoryStudioOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [reportingAd, setReportingAd] = useState<{ id: string; title: string } | null>(null);
  const [isPostAdOpen, setIsPostAdOpen] = useState(false);
  const [isMyAdsOpen, setIsMyAdsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTargetAd, setChatTargetAd] = useState<AdItem | null>(null);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userFeatureModalType, setUserFeatureModalType] = useState<UserFeatureType>(null);

  // Discovery, Search & Admin Portal state
  const [viewMode, setViewMode] = useState<'HOME' | 'SEARCH' | 'ADMIN'>(() => {
    if (typeof window !== 'undefined' && (window.location.pathname === '/admin' || window.location.search.includes('view=admin'))) {
      return 'ADMIN';
    }
    return 'HOME';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('');
  const [selectedCitySlug, setSelectedCitySlug] = useState('');
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

  useEffect(() => {
    if (viewMode === 'ADMIN' && user && !hasStaffAccess) {
      setViewMode('HOME');
      window.history.replaceState({}, '', '/');
    }
  }, [viewMode, user, hasStaffAccess]);

  // Common data
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<LocationItem[]>([]);
  const [recommendations, setRecommendations] = useState<AdItem[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  // Fetch categories, cities, and live recommendations
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/categories');
      const data = await res.json();
      if (data.success && data.data) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    // 1. Categories
    fetchCategories();

    // 2. Cities
    fetch('/api/v1/locations/cities')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setCities(data.data);
        }
      })
      .catch(() => {});

    // 3. Fresh live recommendations
    fetchRecommendations();
  }, []);

  // Poll / fetch unread chat count
  useEffect(() => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }

    const token = localStorage.getItem('olx_access_token') || localStorage.getItem('token');
    if (!token) return;

    fetch('/api/v1/chat/conversations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.totalUnread !== undefined) {
          setUnreadMessagesCount(data.data.totalUnread);
        }
      })
      .catch(() => {});
  }, [user, isChatOpen]);

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const res = await fetch('/api/v1/ads?limit=12&sort=newest');
      const data = await res.json();
      if (data.success && data.data) {
        setRecommendations(data.data.ads || []);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/admin') {
        setViewMode('ADMIN');
      } else {
        setViewMode('HOME');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleGlobalSearch = (keyword: string, citySlug?: string) => {
    setSearchQuery(keyword);
    if (citySlug !== undefined) {
      setSelectedCitySlug(citySlug);
    }
    setViewMode('SEARCH');
  };

  const handleCategorySelect = (slug: string) => {
    setSelectedCategorySlug(slug);
    setViewMode('SEARCH');
  };

  const handleBackToHome = () => {
    setViewMode('HOME');
    setSearchQuery('');
    setSelectedCategorySlug('');
    window.history.pushState({}, '', '/');
  };

  if (viewMode === 'ADMIN') {
    return (
      <AdminErrorBoundary>
        <AdminPortal
          onExitToCustomerSite={() => {
            setViewMode('HOME');
            window.history.pushState({}, '', '/');
          }}
          categories={categories}
          cities={cities}
          onRefreshData={() => {
            fetchRecommendations();
            fetchCategories();
          }}
        />
      </AdminErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F8]">
      {/* Top Sticky Navbar */}
      <Navbar
        onOpenAdminPortal={() => {
          setViewMode('ADMIN');
          window.history.pushState({}, '', '/admin');
        }}
        onOpenPostAd={() => setIsPostAdOpen(true)}
        onOpenMyAds={() => setIsMyAdsOpen(true)}
        onOpenChat={() => {
          setChatTargetAd(null);
          setIsChatOpen(true);
        }}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenFeature={(feat) => setUserFeatureModalType(feat)}
        onSearch={handleGlobalSearch}
        onLogoClick={handleBackToHome}
        initialQuery={searchQuery}
        unreadCount={unreadMessagesCount}
      />

      {/* Categories Horizontal Ribbon */}
      <CategoriesRibbon categories={categories} onSelectCategory={handleCategorySelect} />

      <main className="flex-1 pb-16">
        {viewMode === 'SEARCH' ? (
          <SearchPage
            initialQuery={searchQuery}
            initialCategorySlug={selectedCategorySlug}
            initialCitySlug={selectedCitySlug}
            categories={categories}
            cities={cities}
            onSelectAd={(ad) => setSelectedAdId(ad.id)}
            onBackToHome={handleBackToHome}
          />
        ) : (
          <>
            {/* Hero Banner */}
            <HeroBanner
              onOpenPostAd={() => setIsPostAdOpen(true)}
              onExploreListings={() => {
                const recSec = document.getElementById('recommendations-section');
                if (recSec) recSec.scrollIntoView({ behavior: 'smooth' });
                else setViewMode('SEARCH');
              }}
            />

            {/* Explore Categories Icon Grid */}
            <CategoryGrid onSelectCategory={handleCategorySelect} />

            {/* Fresh Recommendations Live Feed */}
            <section id="recommendations-section" className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-6 pb-8">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#102A33]">
                    Fresh recommendations
                  </h2>
                  <p className="text-xs sm:text-sm text-[#667784] mt-0.5 font-normal">
                    Handpicked listings just for you
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('SEARCH')}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#003F46] hover:underline"
                >
                  <span>View all</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              {loadingRecommendations ? (
                <div className="py-16 text-center">
                  <div className="w-10 h-10 border-4 border-[#003F46] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 font-medium text-xs">Loading fresh recommendations...</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-[#E5EAED]">
                  <p className="text-[#667784] text-sm mb-4">No ads available right now.</p>
                  <button
                    onClick={() => setIsPostAdOpen(true)}
                    className="bg-[#FFD54A] text-[#102A33] px-6 py-2.5 rounded-full font-bold text-xs shadow-xs"
                  >
                    Post the first Ad
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {recommendations.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      onClick={() => setSelectedAdId(ad.id)}
                    />
                  ))}
                </div>
              )}

              {/* Refresh / Load More */}
              <div className="mt-10 text-center">
                <button
                  onClick={fetchRecommendations}
                  className="inline-flex items-center gap-2 border-2 border-[#003F46] text-[#003F46] hover:bg-[#003F46] hover:text-white px-7 py-2.5 rounded-full font-bold text-sm transition-all shadow-xs"
                >
                  <RefreshCw className="w-4 h-4" />
                  Load More Fresh Listings
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#00343A] text-white py-10 border-t border-[#00282D]">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-300">
          <p>© 2026 OLX India Marketplace. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <span className="hover:text-white cursor-pointer transition">About Us</span>
            <span className="hover:text-white cursor-pointer transition">Security & Safety</span>
            <span className="hover:text-white cursor-pointer transition">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition">Terms of Use</span>
            {hasStaffAccess && <button
              onClick={() => {
                setViewMode('ADMIN');
                window.history.pushState({}, '', '/admin');
              }}
              className="text-[#FFD54A] hover:underline font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>⚙️ Admin Portal</span>
            </button>}
          </div>
        </div>
      </footer>


      {/* Auth Modal */}
      <AuthModal />

      {/* Category Studio Modal (Phase 2 Admin) */}
      <AdminCategoryBuilder
        isOpen={isCategoryStudioOpen}
        onClose={() => setIsCategoryStudioOpen(false)}
      />

      {/* Post Ad Modal (Phase 3) */}
      <PostAdModal
        isOpen={isPostAdOpen}
        onClose={() => setIsPostAdOpen(false)}
        onAdCreated={() => {
          fetchRecommendations();
          setIsMyAdsOpen(true);
        }}
      />

      {/* My Ads Dashboard Modal (Phase 3) */}
      <MyAdsModal
        isOpen={isMyAdsOpen}
        onClose={() => setIsMyAdsOpen(false)}
        onOpenPostAd={() => setIsPostAdOpen(true)}
      />

      {/* Ad Detail Modal (Phase 4) */}
      <AdDetailModal
        adId={selectedAdId}
        isOpen={Boolean(selectedAdId)}
        onClose={() => setSelectedAdId(null)}
        onSelectAd={(id) => setSelectedAdId(id)}
        onOpenPostAd={() => {
          setSelectedAdId(null);
          setIsPostAdOpen(true);
        }}
        onOpenChat={(ad) => {
          if (!user) {
            openAuthModal();
          } else {
            setSelectedAdId(null);
            setChatTargetAd(ad);
            setIsChatOpen(true);
          }
        }}
        onOpenReport={(adId, adTitle) => setReportingAd({ id: adId, title: adTitle })}
      />

      {/* Real-time Buyer-Seller Chat Modal (Phase 5) */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatTargetAd(null);
        }}
        initialAd={chatTargetAd}
      />

      {/* Wishlist Modal (Phase 5) */}
      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        onSelectAd={(ad) => setSelectedAdId(ad.id)}
      />

      {/* Admin Moderation Queue (Phase 6) */}
      <AdminModerationModal
        isOpen={isModerationOpen}
        onClose={() => {
          setIsModerationOpen(false);
          fetchRecommendations();
        }}
      />

      {/* User Report Ad Modal (Phase 6) */}
      <ReportAdModal
        isOpen={Boolean(reportingAd)}
        adId={reportingAd?.id || null}
        adTitle={reportingAd?.title}
        onClose={() => setReportingAd(null)}
      />

      {/* User Profile & Dashboard Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenMyAds={() => setIsMyAdsOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
      />

      {/* User Extended Services & Packages Modal */}
      <UserFeatureModal
        type={userFeatureModalType}
        onClose={() => setUserFeatureModalType(null)}
        onOpenProfile={() => {
          setUserFeatureModalType(null);
          setIsProfileModalOpen(true);
        }}
      />
    </div>
  );
};

export default App;
