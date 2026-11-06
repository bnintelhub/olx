import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  ChevronDown,
  ChevronRight,
  Plus,
  Heart,
  MessageSquare,
  Settings,
  LogOut,
  ShieldCheck,
  X,
  Bell,
  FileText,
  ClipboardList,
  ShoppingCart,
  CreditCard,
  Sparkles,
  Award,
  HelpCircle,
  Globe,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LocationItem } from '../types';
import { getWishlistIds, WISHLIST_EVENT } from '../utils/wishlist';
import { UserFeatureType } from './UserFeatureModal';
import { CategoriesRibbon } from './CategoriesRibbon';

interface SuggestionItem {
  id: string;
  title: string;
  categorySubtitle?: string;
  categorySlug?: string;
  adId?: string;
  type: 'CATEGORY' | 'PRODUCT';
}

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
  const { user, openAuthModal, logout } = useAuth();
  const hasStaffAccess = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const [cities, setCities] = useState<LocationItem[]>([]);
  const [selectedCity, setSelectedCity] = useState('All India');
  const [selectedCitySlug, setSelectedCitySlug] = useState('');
  const [keyword, setKeyword] = useState(initialQuery);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [wishlistCount, setWishlistCount] = useState<number>(() => getWishlistIds().length);

  // Search Autocomplete State
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleProfileClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
        setIsLanguageMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleProfileClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleProfileClickOutside);
    };
  }, []);

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
            if (isSearchFocused && data.data.length > 0) {
              setIsSuggestionsOpen(true);
            }
          }
        })
        .catch(() => {
          setSuggestions([]);
        });
    }, 180);

    return () => clearTimeout(timer);
  }, [keyword, selectedCitySlug, isSearchFocused]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectSuggestion = (item: SuggestionItem) => {
    setKeyword(item.title);
    setIsSuggestionsOpen(false);
    if (onSearch) {
      onSearch(item.title, selectedCitySlug);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSuggestionsOpen(false);
    if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
      handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      return;
    }
    if (onSearch) {
      onSearch(keyword, selectedCitySlug);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionsOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsSuggestionsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setIsSuggestionsOpen(false);
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      }
    }
  };

  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const escaped = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.trim().toLowerCase() ? (
            <span key={i} className="font-bold text-[#002f34]">
              {part}
            </span>
          ) : (
            <span key={i} className="font-normal text-[#102A33]">
              {part}
            </span>
          )
        )}
      </span>
    );
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
            {/* Iconic OLX Vector Wordmark */}
            <svg
              className="h-8 sm:h-9 w-auto text-[#002f34] transition-colors group-hover:text-[#00525C]"
              viewBox="0 0 102 48"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* O */}
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M21 4C10.5066 4 2 12.5066 2 23C2 33.4934 10.5066 42 21 42C31.4934 42 40 33.4934 40 23C40 12.5066 31.4934 4 21 4ZM21 33C15.4772 33 11 28.5228 11 23C11 17.4772 15.4772 13 21 13C26.5228 13 31 17.4772 31 23C31 28.5228 26.5228 33 21 33Z"
              />
              {/* L */}
              <path d="M46 5H55V34H66V42H46V5Z" />
              {/* X */}
              <path d="M70 5H79.5L88 19L96.5 5H106L94 23.5L106 42H96.5L88 28L79.5 42H70L82 23.5L70 5Z" />
            </svg>
            <span className="hidden sm:inline-block rounded-md bg-[#e6f7f6] border border-[#00a49f]/30 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#008581]">
              INDIA
            </span>
          </button>
        </div>

        {/* Location Selector */}
        <div className="relative hidden md:block w-56 lg:w-64">
          <button
            type="button"
            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-[#003F46] bg-white px-3 py-2 text-sm font-semibold text-[#102A33] hover:border-[#00343A] transition focus:outline-none"
          >
            <div className="flex items-center gap-2 truncate">
              <MapPin size={17} className="text-[#102A33] flex-shrink-0" />
              <span className="truncate">{selectedCity}</span>
            </div>
            <ChevronDown
              size={17}
              className={`text-[#102A33] transition-transform duration-200 ${
                isCityDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isCityDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-full rounded-xl border border-[#E5EAED] bg-white p-2 shadow-xl z-50 animate-fade-in">
              <div className="max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCity('All India');
                    setSelectedCitySlug('');
                    setIsCityDropdownOpen(false);
                    if (onSearch) onSearch(keyword, '');
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[#F5F7F8] ${
                    selectedCity === 'All India' ? 'bg-[#e6f7f6] text-[#008581] font-bold' : 'text-[#102A33]'
                  }`}
                >
                  <span>All India</span>
                </button>
                {cities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      setSelectedCity(city.name);
                      setSelectedCitySlug(city.slug);
                      setIsCityDropdownOpen(false);
                      if (onSearch) onSearch(keyword, city.slug);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[#F5F7F8] ${
                      selectedCity === city.name ? 'bg-[#e6f7f6] text-[#008581] font-bold' : 'text-[#102A33]'
                    }`}
                  >
                    <span>{city.name}</span>
                    <MapPin size={14} className="text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Search Bar with Live Suggestions */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-2xl">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div
              className={`flex items-center rounded-lg border bg-white overflow-hidden transition-all ${
                isSearchFocused
                  ? 'border-[#002f34] ring-2 ring-[#002f34]/15 shadow-sm'
                  : 'border-[#003F46] hover:border-[#002f34]'
              }`}
            >
              <div className="pl-3.5 pr-1 text-[#667784]">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setIsSuggestionsOpen(true);
                }}
                onFocus={() => {
                  setIsSearchFocused(true);
                  if (suggestions.length > 0) setIsSuggestionsOpen(true);
                }}
                onBlur={() => {
                  // Small delay to allow click on suggestion item
                  setTimeout(() => setIsSearchFocused(false), 200);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Find Cars, Mobile Phones, Properties and more..."
                className="w-full px-3 py-2.5 text-sm text-[#102A33] placeholder-[#667784] outline-none"
                autoComplete="off"
                spellCheck="false"
              />

              {keyword && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword('');
                    setSuggestions([]);
                    setIsSuggestionsOpen(false);
                  }}
                  className="p-1.5 text-[#667784] hover:text-[#102A33] transition mr-1"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}

              <button
                type="submit"
                className="flex items-center justify-center bg-[#002f34] px-5 py-2.5 text-white transition hover:bg-[#00343A] cursor-pointer"
                aria-label="Search listings"
              >
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          {isSuggestionsOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-[#D8DFE2] shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-[#EBF1F3]">
              {suggestions.map((item, index) => {
                const isSelected = index === activeSuggestionIndex;
                return (
                  <div
                    key={item.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(item);
                    }}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    className={`px-4 py-3 cursor-pointer transition-colors flex flex-col justify-center text-left ${
                      isSelected ? 'bg-[#F2F4F5]' : 'hover:bg-[#F7F8F9] bg-white'
                    }`}
                  >
                    <div className="text-[14px] text-[#002f34] leading-snug">
                      {renderHighlightedText(item.title, keyword)}
                    </div>
                    {item.categorySubtitle && (
                      <span className="text-[10px] font-bold text-[#70808C] uppercase tracking-wider mt-0.5">
                        {item.categorySubtitle}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Admin Portal Gateway */}
          {hasStaffAccess && <button
            type="button"
            onClick={onOpenAdminPortal}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-[#E5EAED] bg-white px-3 py-2 text-xs font-semibold text-[#102A33] hover:bg-[#F5F7F8] hover:border-gray-400 transition"
            title="Open Admin Portal"
          >
            <Settings size={15} className="text-[#102A33]" />
            <span>Admin Portal</span>
          </button>}

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenWishlist) onOpenWishlist();
            }}
            className="p-1.5 text-[#102A33] hover:text-red-500 rounded-full hover:bg-[#F5F7F8] transition relative"
            title="Saved Ads (Wishlist)"
            aria-label="Wishlist"
          >
            <Heart
              size={22}
              strokeWidth={1.75}
              className={wishlistCount > 0 ? 'text-red-500 fill-red-500/20' : ''}
            />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </button>

          {/* Chat / Messages Button */}
          <button
            type="button"
            onClick={() => {
              if (!user) openAuthModal();
              else if (onOpenChat) onOpenChat();
            }}
            className="p-1.5 text-[#102A33] hover:text-[#003F46] rounded-full hover:bg-[#F5F7F8] transition relative"
            title="Chat Messages"
            aria-label="Messages"
          >
            <MessageSquare size={22} strokeWidth={1.75} />
            {unreadCount > 0 ? (
              <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            ) : (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
            )}
          </button>

          {/* User Auth / Profile Dropdown matching Screenshot */}
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-1.5 focus:outline-none p-0.5 rounded-full hover:ring-2 hover:ring-[#002f34]/20 transition cursor-pointer"
                title="Account Menu"
              >
                <div className="relative">
                  <div className="h-9 w-9 rounded-full border-2 border-emerald-400 bg-[#e6f7f6] flex items-center justify-center text-[#008581] font-bold text-sm shadow-xs overflow-hidden">
                    {user.profile?.name?.[0]?.toUpperCase() || user.phoneNumber?.[0] || 'U'}
                  </div>
                  {/* Verification shield badge pinned on bottom right */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white shadow-xs"
                    title="Verified User Badge"
                  >
                    <ShieldCheck size={10} />
                  </div>
                </div>
                <ChevronDown size={14} className="text-[#667784] hidden sm:block" />
              </button>

              {/* Profile Dropdown Panel */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-[#D8DFE2] bg-white shadow-2xl z-50 overflow-hidden animate-fade-in text-[#002f34]">
                  {/* Top Pointer arrow */}
                  <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-t border-l border-[#D8DFE2] rotate-45"></div>

                  {/* Top Header Card */}
                  <div className="p-4 bg-white relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-13 w-13 rounded-full border-2 border-emerald-400 bg-[#e6f7f6] flex items-center justify-center text-xl font-black text-[#008581] flex-shrink-0 shadow-xs">
                          {user.profile?.name?.[0]?.toUpperCase() || user.phoneNumber?.[0] || 'U'}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white shadow-xs">
                          <ShieldCheck size={10} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-base text-[#002f34] truncate">
                          {user.profile?.name || user.phoneNumber}
                        </h4>
                        <p className="text-[11px] text-gray-500 truncate">{user.phoneNumber}</p>
                      </div>
                    </div>

                    {/* View and edit profile button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenProfile) onOpenProfile();
                      }}
                      className="mt-3 w-full bg-[#1b4b88] hover:bg-[#143c6d] text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-lg text-center transition cursor-pointer shadow-xs"
                    >
                      View and edit profile
                    </button>

                    {/* Verification promo badge */}
                    <div className="mt-3 rounded-lg bg-[#FFF9E6] border border-[#FFE082] px-3 py-2 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-blue-600 flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-[#002f34] leading-tight">
                          Add your verification badge
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          if (onOpenProfile) onOpenProfile();
                        }}
                        className="text-xs font-bold text-[#1b4b88] hover:underline flex items-center flex-shrink-0 cursor-pointer ml-1"
                      >
                        Get Verified <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100"></div>

                  {/* Options Menu List matching media_1793647059239_20922e76.png */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50 py-1 text-sm font-medium text-[#002f34]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenMyAds) onOpenMyAds();
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 hover:bg-[#F2F4F5] transition cursor-pointer"
                    >
                      <FileText size={18} className="text-gray-600" />
                      <span>My ADS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenFeature) onOpenFeature('BUY_PACKAGES');
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 hover:bg-[#F2F4F5] transition cursor-pointer"
                    >
                      <ClipboardList size={18} className="text-gray-600" />
                      <span>Buy Business Packages</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenFeature) onOpenFeature('VIEW_CART');
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 hover:bg-[#F2F4F5] transition cursor-pointer"
                    >
                      <ShoppingCart size={18} className="text-gray-600" />
                      <span>View Cart</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenFeature) onOpenFeature('BILLING');
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 hover:bg-[#F2F4F5] transition cursor-pointer"
                    >
                      <CreditCard size={18} className="text-gray-600" />
                      <span>Bought Packages &amp; Billing</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenFeature) onOpenFeature('ELITE_BUYER');
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 hover:bg-[#F2F4F5] transition cursor-pointer"
                    >
                      <Sparkles size={18} className="text-gray-600" />
                      <span>Become an Elite Buyer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenFeature) onOpenFeature('ELITE_SELLER');
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 hover:bg-[#F2F4F5] transition cursor-pointer"
                    >
                      <Award size={18} className="text-gray-600" />
                      <span>Become an Elite Seller</span>
                      <span className="ml-auto rounded bg-[#D0021B] px-1.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider">
                        New
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenFeature) onOpenFeature('HELP');
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 hover:bg-[#F2F4F5] transition cursor-pointer"
                    >
                      <HelpCircle size={18} className="text-gray-600" />
                      <span>Help</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenFeature) onOpenFeature('SETTINGS');
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 hover:bg-[#F2F4F5] transition cursor-pointer"
                    >
                      <Settings size={18} className="text-gray-600" />
                      <span>Settings</span>
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                        className="flex w-full items-center justify-between px-5 py-2.5 hover:bg-[#F2F4F5] transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Globe size={18} className="text-gray-600" />
                          <span>Language ({selectedLanguage})</span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`text-gray-400 transition-transform ${isLanguageMenuOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isLanguageMenuOpen && (
                        <div className="bg-gray-50 px-8 py-2 space-y-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLanguage('English');
                              setIsLanguageMenuOpen(false);
                            }}
                            className={`block w-full text-left py-1 font-semibold ${
                              selectedLanguage === 'English' ? 'text-[#008581]' : 'text-gray-600'
                            }`}
                          >
                            ✓ English (India)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLanguage('हिन्दी');
                              setIsLanguageMenuOpen(false);
                            }}
                            className={`block w-full text-left py-1 font-semibold ${
                              selectedLanguage === 'हिन्दी' ? 'text-[#008581]' : 'text-gray-600'
                            }`}
                          >
                            हिन्दी (Hindi)
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenFeature) onOpenFeature('INSTALL_APP');
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 hover:bg-[#F2F4F5] transition cursor-pointer"
                    >
                      <Download size={18} className="text-gray-600" />
                      <span>Install OLX Lite app</span>
                    </button>

                    {hasStaffAccess && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          if (onOpenAdminPortal) onOpenAdminPortal();
                        }}
                        className="flex w-full items-center gap-3 px-5 py-2.5 text-[#003F46] hover:bg-gray-50 font-bold cursor-pointer"
                      >
                        <ShieldCheck size={18} className="text-[#008581]" />
                        <span>Admin Portal</span>
                      </button>
                    )}

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setIsProfileMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-red-600 hover:bg-red-50 transition cursor-pointer font-semibold"
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="text-sm font-bold text-[#102A33] hover:text-[#003F46] transition px-1 py-1"
            >
              Login
            </button>
          )}

          {/* Post Ads Button */}
          <button
            type="button"
            onClick={() => {
              if (!user) {
                openAuthModal(() => {
                  if (onOpenPostAd) onOpenPostAd();
                });
              } else if (onOpenPostAd) {
                onOpenPostAd();
              }
            }}
            className="flex items-center gap-1.5 rounded-full bg-[#FFD54A] hover:bg-[#f5c62d] px-5 py-2 text-sm font-extrabold text-[#102A33] shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Post Ads</span>
          </button>

          {/* Notification Bell Icon */}
          <button
            type="button"
            onClick={() => {
              if (onOpenFeature) onOpenFeature('HELP');
            }}
            className="p-1.5 text-[#102A33] hover:text-[#003F46] rounded-full hover:bg-[#F5F7F8] transition relative hidden sm:block cursor-pointer"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={20} />
          </button>
        </div>
      </div>

      {/* Row 2: Categories Ribbon with ALL CATEGORIES dropdown */}
      <CategoriesRibbon />
    </header>
  );
};
