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

interface NavbarProps {
  onOpenAdminPortal?: () => void;
  onOpenPostAd?: () => void;
  onOpenMyAds?: () => void;
  onOpenChat?: () => void;
  onOpenWishlist?: () => void;
  onOpenProfile?: () => void;
  onOpenFeature?: (feature: UserFeatureType) => void;
  onSearch?: (keyword: string, citySlug?: string) => void;
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

  const [cities, setCities] = useState<LocationItem[]>([]);
  const [selectedCity, setSelectedCity] = useState('All India');
  const [selectedCitySlug, setSelectedCitySlug] = useState('');
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
      onSearch(searchKeyword.trim(), selectedCitySlug || undefined);
    }
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    setIsSuggestionsOpen(false);
    if (item.type === 'CATEGORY' && item.categorySlug) {
      if (onSearch) onSearch('', selectedCitySlug || undefined);
      window.location.href = `/search?category=${item.categorySlug}${
        selectedCitySlug ? `&city=${selectedCitySlug}` : ''
      }`;
    } else if (item.adId) {
      window.location.href = `/ad/${item.adId}`;
    } else {
      setKeyword(item.title);
      handleSearchSubmit(item.title);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5EAED]">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onLogoClick) onLogoClick();
            }}
            className="flex items-center gap-2 focus:outline-none cursor-pointer group transition-transform active:scale-95"
            title="OLX India Marketplace"
          >
            <svg
              className="h-8 sm:h-9 w-auto text-[#002f34] transition-colors group-hover:text-[#00525C]"
              viewBox="0 0 102 48"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M21 4C10.5066 4 2 12.5066 2 23C2 33.4934 10.5066 42 21 42C31.4934 42 40 33.4934 40 23C40 12.5066 31.4934 4 21 4ZM21 33C15.4772 33 11 28.5228 11 23C11 17.4772 15.4772 13 21 13C26.5228 13 31 17.4772 31 23C31 28.5228 26.5228 33 21 33Z"
              />
              <path d="M46 5H55V34H66V42H46V5Z" />
              <path d="M70 5H79.5L88 19L96.5 5H106L94 23.5L106 42H96.5L88 28L79.5 42H70L82 23.5L70 5Z" />
            </svg>
            <span className="hidden sm:inline-block rounded-md bg-[#e6f7f6] border border-[#00a49f]/30 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#008581]">
              INDIA
            </span>
          </button>
        </div>

        {/* Location Dropdown */}
        <NavbarCityDropdown
          cities={cities}
          selectedCity={selectedCity}
          onSelectCity={(name, slug) => {
            setSelectedCity(name);
            setSelectedCitySlug(slug);
            if (onSearch) onSearch(keyword, slug);
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
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00a49f] text-[10px] font-bold text-white">
                {unreadCount}
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
            className="group relative flex items-center gap-1.5 rounded-full border-4 border-[#ffce32] bg-white px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#002f34] shadow-md transition hover:bg-[#ffce32] hover:text-[#002f34] active:scale-95 cursor-pointer"
          >
            <Plus size={16} className="transition-transform group-hover:rotate-90" />
            <span>SELL</span>
          </button>
        </div>
      </div>

      {/* Categories Horizontal Ribbon */}
      {!isSearchPage && <CategoriesRibbon />}
    </header>
  );
};
