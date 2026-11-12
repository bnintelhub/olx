import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Heart, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LocationItem } from '../types';
import { getWishlistIds, WISHLIST_EVENT } from '../utils/wishlist';
import { UserFeatureType } from './UserFeatureModal';
import { CategoriesRibbon } from './CategoriesRibbon';
import { NavbarCityDropdown } from './navbar/NavbarCityDropdown';
import { NavbarSearchBar, SuggestionItem } from './navbar/NavbarSearchBar';
import { NavbarUserMenu } from './navbar/NavbarUserMenu';
import { useChatUnreadStore } from '@/features/chat/stores/useChatUnreadStore';

interface NavbarProps {
  onOpenAdminPortal?: () => void;
  onOpenPostAd?: () => void;
  onOpenMyAds?: () => void;
  onOpenChat?: () => void;
  onOpenWishlist?: () => void;
  onOpenProfile?: () => void;
  onOpenFeature?: (feature: UserFeatureType) => void;
  onSearch?: (keyword: string, citySlug?: string, locationId?: string) => void;
  onLogoClick?: () => void;
  initialQuery?: string;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAdminPortal,
  onOpenPostAd,
  onOpenMyAds,
  onOpenChat,
  onOpenWishlist,
  onOpenProfile,
  onOpenFeature,
  onSearch,
  onLogoClick,
  initialQuery = '',
  unreadCount = 0,
}) => {
  const location = useLocation();
  const isSearchPage = location.pathname === '/search' || location.pathname.startsWith('/search');
  const { user, openAuthModal, logout } = useAuth();
  const hasStaffAccess = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const storeUnreadCount = useChatUnreadStore((s) => s.unreadCount);
  const totalUnreadMessages = typeof unreadCount === 'number' && unreadCount > 0 ? unreadCount : storeUnreadCount;

  const [cities, setCities] = useState<LocationItem[]>([]);
  const [selectedCity, setSelectedCity] = useState('All India');
  const [selectedCitySlug, setSelectedCitySlug] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [keyword, setKeyword] = useState(initialQuery);
  const [wishlistCount, setWishlistCount] = useState<number>(() => getWishlistIds().length);

  // Search Autocomplete State
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  useEffect(() => {
    const updateCount = () => {
      setWishlistCount(getWishlistIds().length);
    };

    window.addEventListener(WISHLIST_EVENT, updateCount);
    window.addEventListener('storage', updateCount);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  useEffect(() => {
    setKeyword(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    fetch('/api/v1/locations/cities')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setCities(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch suggestions with debounce when keyword changes
  useEffect(() => {
    if (!keyword || keyword.trim().length === 0) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      const queryParams = new URLSearchParams({
        q: keyword.trim(),
        ...(selectedCitySlug ? { citySlug: selectedCitySlug } : {}),
      });

      fetch(`/api/v1/ads/suggestions?${queryParams.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setSuggestions(data.data);
            if (data.data.length > 0) {
              setIsSuggestionsOpen(true);
            }
          }
        })
        .catch(() => {
          setSuggestions([]);
        });
    }, 180);

    return () => clearTimeout(timer);
  }, [keyword, selectedCitySlug]);

  const handleSearchSubmit = (searchKeyword: string) => {
    setIsSuggestionsOpen(false);
    if (onSearch) {
      onSearch(searchKeyword.trim(), selectedCitySlug || undefined, selectedLocationId || undefined);
    }
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    setIsSuggestionsOpen(false);
    if (item.type === 'CATEGORY' && item.categorySlug) {
      if (onSearch) onSearch('', selectedCitySlug || undefined, selectedLocationId || undefined);
      window.location.href = `/search?category=${item.categorySlug}${
        selectedCitySlug ? `&city=${selectedCitySlug}` : ''
      }${selectedLocationId ? `&locationId=${selectedLocationId}` : ''}`;
    } else if (item.adId) {
      window.location.href = `/ad/${item.adId}`;
    } else {
      setKeyword(item.title);
      handleSearchSubmit(item.title);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-2.5">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onLogoClick) onLogoClick();
            }}
            className="flex items-center gap-2 focus:outline-none cursor-pointer group transition-transform active:scale-98"
            title="BLX Orbit Marketplace"
          >
            <div className="flex items-center gap-1.5">
              <svg
                className="h-7 sm:h-8 w-auto text-[#002F34] transition-colors"
                viewBox="0 0 108 48"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* B */}
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4 5H23C29.5 5 34.5 8.5 34.5 14C34.5 17.5 32 20.5 28 22C33 23.5 36 27 36 32C36 38 31 42 23 42H4V5ZM13 13V19.5H22C24 19.5 25.5 18.2 25.5 16.2C25.5 14.2 24 13 22 13H13ZM13 27V34H22.5C25 34 27 32.5 27 30.5C27 28.5 25 27 22.5 27H13Z"
                />
                {/* L */}
                <path d="M43 5H52V34H63V42H43V5Z" />
                {/* X */}
                <path d="M68 5H77.5L86 19L94.5 5H104L92 23.5L104 42H94.5L86 28L77.5 42H68L80 23.5L68 5Z" />
              </svg>
              <span className="bg-[#002F34] text-[#00E5FF] text-[10px] sm:text-[11px] font-black tracking-widest px-2 py-0.5 rounded uppercase leading-tight flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
                ORBIT
              </span>
            </div>
            <span className="hidden sm:inline-block rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              India
            </span>
          </button>
        </div>

        {/* Location Dropdown */}
        <NavbarCityDropdown
          cities={cities}
          selectedCity={selectedCity}
          onSelectCity={(name, slug, locationId) => {
            setSelectedCity(name);
            setSelectedCitySlug(slug);
            setSelectedLocationId(locationId || '');
            if (onSearch) onSearch(keyword, slug, locationId);
          }}
        />

        {/* Global Search Bar with Live Suggestions */}
        <NavbarSearchBar
          keyword={keyword}
          onKeywordChange={setKeyword}
          onSubmit={handleSearchSubmit}
          onSelectSuggestion={handleSelectSuggestion}
          suggestions={suggestions}
          isSuggestionsOpen={isSuggestionsOpen}
          setIsSuggestionsOpen={setIsSuggestionsOpen}
        />

        {/* User Navigation / Quick Actions */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          {/* Messages & Chat */}
          <button
            type="button"
            onClick={onOpenChat}
            className="relative p-2 text-[#002f34] hover:bg-gray-100 rounded-full transition cursor-pointer"
            title="Chat with Buyers and Sellers"
          >
            <MessageSquare size={20} />
            {totalUnreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#00a49f] text-[10px] font-bold text-white shadow-xs animate-in fade-in zoom-in-75">
                {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
              </span>
            )}
          </button>

          {/* Favourites / Wishlist */}
          <button
            type="button"
            onClick={onOpenWishlist}
            className="relative p-2 text-[#002f34] hover:bg-gray-100 rounded-full transition cursor-pointer"
            title="Favourites"
          >
            <Heart size={20} />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00a49f] text-[10px] font-bold text-white">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Auth: User Menu or Login Button */}
          {user ? (
            <NavbarUserMenu
              user={user}
              hasStaffAccess={hasStaffAccess}
              unreadCount={totalUnreadMessages}
              onOpenProfile={onOpenProfile}
              onOpenMyAds={onOpenMyAds}
              onOpenWishlist={onOpenWishlist}
              onOpenChat={onOpenChat}
              onOpenFeature={onOpenFeature}
              onOpenAdminPortal={onOpenAdminPortal}
              onLogout={logout}
            />
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="text-sm font-bold text-[#002f34] hover:underline underline-offset-4 cursor-pointer px-2 py-1"
            >
              Login
            </button>
          )}

          {/* Sell Button */}
          <button
            type="button"
            onClick={onOpenPostAd}
            className="group relative flex items-center gap-1.5 rounded-lg bg-[#FFCE32] hover:bg-[#eec128] px-4 py-2 text-xs font-semibold text-[#002F34] transition-colors active:scale-98 cursor-pointer shadow-xs"
          >
            <Plus size={15} />
            <span>Sell</span>
          </button>
        </div>
      </div>

      {/* Categories Horizontal Ribbon */}
      {!isSearchPage && <CategoriesRibbon />}
    </header>
  );
};
