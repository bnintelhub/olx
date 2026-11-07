import { create } from 'zustand';
import { AdItem } from '@/types';
import { UserFeatureType } from '@/components/UserFeatureModal';

interface UIState {
  // Post Ad Modal State
  isPostAdOpen: boolean;
  openPostAd: () => void;
  closePostAd: () => void;

  // Chat Modal State
  isChatOpen: boolean;
  chatTargetAd: AdItem | null;
  chatInitialMessage: string | null;
  openChat: (ad?: AdItem, initialMessage?: string) => void;
  closeChat: () => void;

  // Wishlist Modal State
  isWishlistOpen: boolean;
  openWishlist: () => void;
  closeWishlist: () => void;

  // My Ads Dashboard Modal State
  isMyAdsOpen: boolean;
  openMyAds: () => void;
  closeMyAds: () => void;

  // User Profile Modal State
  isProfileOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;

  // User Feature Modal State
  userFeatureType: UserFeatureType;
  openUserFeature: (type: UserFeatureType) => void;
  closeUserFeature: () => void;

  // Report Ad Modal State
  reportingAd: { id: string; title: string } | null;
  openReportAd: (ad: { id: string; title: string }) => void;
  closeReportAd: () => void;

  // Location / City State
  selectedCity: string;
  selectedCitySlug: string;
  setCity: (name: string, slug: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Post Ad
  isPostAdOpen: false,
  openPostAd: () => set({ isPostAdOpen: true }),
  closePostAd: () => set({ isPostAdOpen: false }),

  // Chat
  isChatOpen: false,
  chatTargetAd: null,
  chatInitialMessage: null,
  openChat: (ad, initialMessage) =>
    set({
      isChatOpen: true,
      chatTargetAd: ad || null,
      chatInitialMessage: initialMessage || null,
    }),
  closeChat: () =>
    set({
      isChatOpen: false,
      chatTargetAd: null,
      chatInitialMessage: null,
    }),

  // Wishlist
  isWishlistOpen: false,
  openWishlist: () => set({ isWishlistOpen: true }),
  closeWishlist: () => set({ isWishlistOpen: false }),

  // My Ads
  isMyAdsOpen: false,
  openMyAds: () => set({ isMyAdsOpen: true }),
  closeMyAds: () => set({ isMyAdsOpen: false }),

  // Profile
  isProfileOpen: false,
  openProfile: () => set({ isProfileOpen: true }),
  closeProfile: () => set({ isProfileOpen: false }),

  // User Features
  userFeatureType: null,
  openUserFeature: (type) => set({ userFeatureType: type }),
  closeUserFeature: () => set({ userFeatureType: null }),

  // Reporting
  reportingAd: null,
  openReportAd: (ad) => set({ reportingAd: ad }),
  closeReportAd: () => set({ reportingAd: null }),

  // City
  selectedCity: 'All India',
  selectedCitySlug: '',
  setCity: (name, slug) => set({ selectedCity: name, selectedCitySlug: slug }),
}));

