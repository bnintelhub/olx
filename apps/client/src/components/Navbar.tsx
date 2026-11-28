import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { useLocation } from 'react-router-dom';
import { Plus, Heart, MessageSquare, Bell, MapPin, Menu, X, User, FileText, LogOut, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useUIStore } from '@/stores/useUIStore';
import { useAuth } from '../context/useAuth';
import { authService } from '@/features/auth/service/auth.service';
import { locationsService } from '@/features/locations/service/locations.service';
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
  const { user, setUser, openAuthModal, logout } = useAuth();
  const hasStaffAccess = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const storeUnreadCount = useChatUnreadStore((s) => s.unreadCount);
  const totalUnreadMessages = typeof unreadCount === 'number' && unreadCount > 0 ? unreadCount : storeUnreadCount;

  const openNotification = useUIStore((s) => s.openNotification);
  const isNotificationOpen = useUIStore((s) => s.isNotificationOpen);
  const closeNotification = useUIStore((s) => s.closeNotification);
  const { data: notifData } = useQuery<{ count: number }>({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count');
      return res.data;
    },
    enabled: !!user,
    staleTime: 5000,
  });
  const totalUnreadNotifications = notifData?.count || 0;

  const [cities, setCities] = useState<LocationItem[]>([]);
  const [selectedCity, setSelectedCity] = useState('All India');
  const [selectedCitySlug, setSelectedCitySlug] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [isMobileLocationOpen, setIsMobileLocationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const mobileBackdropRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isMobileMenuOpen && mobileDrawerRef.current) {
      gsap.killTweensOf([mobileDrawerRef.current, mobileBackdropRef.current]);
      if (mobileBackdropRef.current) {
        gsap.fromTo(
          mobileBackdropRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.22, ease: 'power2.out' }
        );
      }
      gsap.fromTo(
        mobileDrawerRef.current,
        { x: '-100%' },
        { x: '0%', duration: 0.28, ease: 'power3.out' }
      );
    }
  }, [isMobileMenuOpen]);

  const closeMobileMenu = (afterClose?: () => void) => {
    if (!mobileDrawerRef.current) {
      setIsMobileMenuOpen(false);
      afterClose?.();
      return;
    }

    gsap.killTweensOf([mobileDrawerRef.current, mobileBackdropRef.current]);
    gsap.to(mobileDrawerRef.current, {
      x: '-100%',
      duration: 0.22,
      ease: 'power2.in',
    });
    if (mobileBackdropRef.current) {
      gsap.to(mobileBackdropRef.current, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          setIsMobileMenuOpen(false);
          afterClose?.();
        },
      });
    } else {
      setIsMobileMenuOpen(false);
      afterClose?.();
    }
  };
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

  const persistUserLocation = async (locationId: string | null) => {
    if (!user) return;
    try {
      const res = await authService.updateProfileLocation(locationId);
      if (res?.success && res.data) {
        setUser(res.data);
      }
    } catch {
      // Non-blocking: UI state remains updated even if profile sync fails
    }
  };

  // Sync saved profile location on login, or ask browser geolocation once per session if unset
  useEffect(() => {
    if (!user) return;

    const savedLoc = user.profile?.location;
    if (savedLoc) {
      setSelectedCity(savedLoc.name);
      setSelectedCitySlug(savedLoc.slug);
      setSelectedLocationId(savedLoc.id);
      return;
    }

    if (user.profile?.locationId) return;

    const promptKey = `olx_loc_prompted_${user.id}`;
    if (sessionStorage.getItem(promptKey)) return;
    sessionStorage.setItem(promptKey, '1');

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await locationsService.nearby(pos.coords.latitude, pos.coords.longitude, 50);
          if (results.length > 0) {
            const nearest = results[0];
            setSelectedCity(nearest.name);
            setSelectedCitySlug(nearest.slug);
            setSelectedLocationId(nearest.id);
            await persistUserLocation(nearest.id);
            toast.success(`Location set to ${nearest.name}`);
          }
        } catch {
          // Ignore silent geolocation resolution failure
        }
      },
      () => {
        // User denied or browser blocked geolocation; allow manual selection from navbar
      },
      { timeout: 8000 }
    );
  }, [user?.id, user?.profile?.locationId]);

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
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-x-2 gap-y-2.5 px-3 lg:flex-nowrap lg:gap-3 xl:gap-4 sm:px-6 lg:px-8 py-2.5">
        {/* Left: Mobile Menu Trigger + Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => (isMobileMenuOpen ? closeMobileMenu() : setIsMobileMenuOpen(true))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#002F34] hover:bg-slate-50 transition md:hidden cursor-pointer"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            title="Menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <button
            onClick={() => {
              if (onLogoClick) onLogoClick();
            }}
            className="flex items-center gap-2 focus:outline-none cursor-pointer group transition-transform active:scale-98"
            title="BLX Orbit Marketplace"
          >
            <div className="flex items-center gap-1.5">
              <svg
                className="h-6 sm:h-7 lg:h-8 w-auto text-[#002F34] transition-colors"
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
              <span className="hidden md:flex bg-[#002F34] text-[#00E5FF] text-[11px] font-black tracking-widest px-2 py-0.5 rounded uppercase leading-tight items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
                ORBIT
              </span>
            </div>
            <span className="hidden xl:inline-block rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              India
            </span>
          </button>
        </div>

        {/* Location Dropdown (Desktop/Tablet Row 1; Mobile trigger moves beside search bar) */}
        <NavbarCityDropdown
          cities={cities}
          selectedCity={selectedCity}
          hideMobileButton
          externalMobileOpen={isMobileLocationOpen}
          onExternalMobileClose={() => setIsMobileLocationOpen(false)}
          onSelectCity={(name, slug, locationId) => {
            setSelectedCity(name);
            setSelectedCitySlug(slug);
            setSelectedLocationId(locationId || '');
            void persistUserLocation(locationId || null);
            if (onSearch) onSearch(keyword, slug, locationId);
          }}
        />

        {/* Global Search Bar with Live Suggestions (+ Mobile Location Button) */}
        <div className="order-3 basis-full flex items-center gap-2 lg:order-none lg:basis-auto lg:flex-1 lg:min-w-[260px] lg:max-w-2xl min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileLocationOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#003F46] bg-white text-[#102A33] md:hidden cursor-pointer"
            title={`Location: ${selectedCity}`}
            aria-label={`Location: ${selectedCity}`}
          >
            <MapPin size={17} />
          </button>
          <div className="flex-1 min-w-0">
            <NavbarSearchBar
              keyword={keyword}
              onKeywordChange={setKeyword}
              onSubmit={handleSearchSubmit}
              onSelectSuggestion={handleSelectSuggestion}
              suggestions={suggestions}
              isSuggestionsOpen={isSuggestionsOpen}
              setIsSuggestionsOpen={setIsSuggestionsOpen}
            />
          </div>
        </div>

        {/* User Navigation / Quick Actions */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-0 lg:gap-2.5 xl:gap-3.5 shrink-0">
          {/* Notifications & Inquiries */}
          {user && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (isNotificationOpen) {
                    closeNotification();
                  } else {
                    openNotification();
                  }
                }}
                className={`relative p-1.5 sm:p-2 rounded-full transition-all duration-200 cursor-pointer ${
                  isNotificationOpen
                    ? 'bg-gray-100 text-[#002f34]'
                    : 'text-[#002f34] hover:bg-gray-100'
                }`}
                title="Notifications & Inquiries"
              >
                <Bell size={19} className="sm:w-5 sm:h-5" />
                {totalUnreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#00a49f] text-[10px] font-bold text-white shadow-xs animate-in fade-in zoom-in-75">
                    {totalUnreadNotifications > 99 ? '99+' : totalUnreadNotifications}
                  </span>
                )}
              </button>
            </>
          )}

          {/* Messages & Chat */}
          <button
            type="button"
            onClick={onOpenChat}
            className="relative p-1.5 sm:p-2 text-[#002f34] hover:bg-gray-100 rounded-full transition cursor-pointer"
            title="Chat with Buyers and Sellers"
          >
            <MessageSquare size={19} className="sm:w-5 sm:h-5" />
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
            className="relative hidden p-2 text-[#002f34] hover:bg-gray-100 rounded-full transition cursor-pointer xl:block"
            title="Favourites"
          >
            <Heart size={20} />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00a49f] text-[10px] font-bold text-white">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Auth: User Menu or Login Button (Desktop/Tablet; mobile uses Menu Drawer) */}
          <div className="hidden md:block">
            {user ? (
              <NavbarUserMenu
                user={user}
                hasStaffAccess={hasStaffAccess}
                unreadCount={totalUnreadMessages}
                notifCount={totalUnreadNotifications}
                onOpenNotification={openNotification}
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
          </div>

          {/* Sell Button */}
          <button
            type="button"
            onClick={onOpenPostAd}
            className="group relative flex items-center gap-1.5 rounded-lg bg-[#FFCE32] hover:bg-[#eec128] px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-[#002F34] transition-colors active:scale-98 cursor-pointer shadow-xs"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Sell</span>
          </button>
        </div>
      </div>

      {/* Mobile Left-Side Drawer (< md) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            ref={mobileBackdropRef}
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => closeMobileMenu()}
          />

          <aside
            ref={mobileDrawerRef}
            className="fixed inset-y-0 left-0 z-50 flex w-[290px] max-w-[85vw] flex-col justify-between bg-white shadow-2xl border-r border-slate-200"
          >
            <div className="flex flex-col min-h-0 overflow-y-auto">
              {/* Drawer Top Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-base font-bold tracking-tight text-[#002F34]">
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => closeMobileMenu()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#002F34] cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Account Summary / Login */}
              <div className="border-b border-slate-100 px-4 py-4">
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#002F34] text-sm font-bold text-white">
                      {(user.profile?.name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#002F34]">
                        {user.profile?.name || user.email || 'Account'}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {user.email || user.phoneNumber || 'Verified Member'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      Sign in to manage your ads, chats, and saved items.
                    </p>
                    <button
                      type="button"
                      onClick={() => closeMobileMenu(() => openAuthModal())}
                      className="w-full rounded-lg bg-[#002F34] py-2.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      Login / Sign up
                    </button>
                  </div>
                )}
              </div>

              {/* Current Location Row */}
              <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2 bg-slate-50/60">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin size={15} className="shrink-0 text-[#002F34]" />
                  <span className="truncate text-xs font-medium text-[#102A33]">
                    {selectedCity}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => closeMobileMenu(() => setIsMobileLocationOpen(true))}
                  className="shrink-0 text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Primary Menu Links */}
              <nav className="p-2 space-y-1 text-sm font-medium text-[#102A33]">
                {user && (
                  <>
                    <button
                      type="button"
                      onClick={() => closeMobileMenu(() => onOpenProfile?.())}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                    >
                      <User size={17} className="text-slate-500" />
                      <span>My Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => closeMobileMenu(() => onOpenMyAds?.())}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                    >
                      <FileText size={17} className="text-slate-500" />
                      <span>My Ads</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => closeMobileMenu(() => openNotification())}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <Bell size={17} className="text-slate-500" />
                        <span>Notifications</span>
                      </span>
                      {totalUnreadNotifications > 0 && (
                        <span className="rounded-full bg-[#00a49f] px-2 py-0.5 text-[11px] font-bold text-white">
                          {totalUnreadNotifications}
                        </span>
                      )}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => closeMobileMenu(() => onOpenChat?.())}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <MessageSquare size={17} className="text-slate-500" />
                    <span>Messages</span>
                  </span>
                  {totalUnreadMessages > 0 && (
                    <span className="rounded-full bg-[#00a49f] px-2 py-0.5 text-[11px] font-bold text-white">
                      {totalUnreadMessages}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => closeMobileMenu(() => onOpenWishlist?.())}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <Heart size={17} className="text-slate-500" />
                    <span>Favourites</span>
                  </span>
                  {wishlistCount > 0 && (
                    <span className="text-xs font-semibold text-slate-500">
                      {wishlistCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => closeMobileMenu(() => onOpenPostAd?.())}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                >
                  <Plus size={17} className="text-slate-500" />
                  <span>Post Free Ad</span>
                </button>

                {user && hasStaffAccess && (
                  <button
                    type="button"
                    onClick={() => closeMobileMenu(() => onOpenAdminPortal?.())}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[#002F34] hover:bg-slate-50 cursor-pointer"
                  >
                    <ShieldCheck size={17} className="text-[#002F34]" />
                    <span>Admin Portal</span>
                  </button>
                )}
              </nav>
            </div>

            {/* Drawer Footer */}
            {user && (
              <div className="border-t border-slate-100 p-3">
                <button
                  type="button"
                  onClick={() => closeMobileMenu(() => { void logout(); })}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Categories Horizontal Ribbon */}
      {!isSearchPage && <CategoriesRibbon />}
    </header>
  );
};
