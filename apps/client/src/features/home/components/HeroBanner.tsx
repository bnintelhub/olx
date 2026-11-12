import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Tag,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { useCategoriesTreeQuery } from '@/features/categories/hook/useCategoriesQuery';
import { useAdsQuery } from '@/features/ads/hook/useAdsQuery';
import {
  useBannersQuery,
  recordBannerImpression,
  recordBannerClick,
  BannerItem,
} from '../hook/useBannersQuery';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface HeroBannerProps {
  onOpenPostAd?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPostAd }) => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuthStore();
  const { data: categories = [] } = useCategoriesTreeQuery();
  const { data: adsData } = useAdsQuery({ limit: 8, sort: 'newest' });
  const { data: activeBanners = [] } = useBannersQuery('HOME_HERO');

  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const trackedImpressions = useRef<Set<string>>(new Set());

  // Current active promo banner (if any)
  const currentPromo: BannerItem | undefined = activeBanners[activeBannerIndex];

  // Track impression for the active promotional banner once
  useEffect(() => {
    if (currentPromo && !trackedImpressions.current.has(currentPromo.id)) {
      trackedImpressions.current.add(currentPromo.id);
      recordBannerImpression(currentPromo.id);
    }
  }, [currentPromo]);

  // Auto-advance banner carousel if multiple exist
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const handleBannerClick = () => {
    if (!currentPromo) return;
    recordBannerClick(currentPromo.id);
    if (currentPromo.targetUrl) {
      if (currentPromo.targetUrl.startsWith('http')) {
        window.open(currentPromo.targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(currentPromo.targetUrl);
      }
    }
  };

  const handleStartSelling = () => {
    if (!user) {
      openAuthModal(() => {
        if (onOpenPostAd) onOpenPostAd();
      });
    } else if (onOpenPostAd) {
      onOpenPostAd();
    }
  };

  // Popular category chips from database
  const popularCategories = React.useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return [];
    return categories
      .filter((c) => !c.parentId && c.isActive !== false)
      .slice(0, 5)
      .map((c) => ({ label: c.name, query: c.slug }));
  }, [categories]);

  // Fallback spotlight ad
  const spotlightAd = React.useMemo(() => {
    if (!adsData?.ads || adsData.ads.length === 0) return null;
    return adsData.ads.find((ad) => ad.images && ad.images.length > 0) || adsData.ads[0];
  }, [adsData]);

  const adImage =
    spotlightAd?.images?.find((img) => img.isCover)?.displayUrl ||
    spotlightAd?.images?.[0]?.displayUrl ||
    spotlightAd?.images?.[0]?.originalUrl;

  // -------------------------------------------------------------
  // DYNAMIC PROMOTIONAL BANNER VIEW (If active promo banner exists)
  // -------------------------------------------------------------
  if (currentPromo) {
    const isVideo = currentPromo.mediaType === 'VIDEO';
    const desktopMedia = currentPromo.desktopMediaUrl || '/indian-banner.webp';
    const mobileMedia = currentPromo.mobileMediaUrl || desktopMedia;

    return (
      <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="relative overflow-hidden rounded-3xl bg-[#002F34] text-white border border-[#003e45] shadow-xl min-h-[360px] sm:min-h-[420px] flex items-center">
          {/* Background Media (Image or Video) */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {isVideo ? (
              <video
                src={desktopMedia}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <picture>
                <source media="(max-width: 640px)" srcSet={mobileMedia} />
                <img
                  src={desktopMedia}
                  alt={currentPromo.title}
                  className="w-full h-full object-cover object-center scale-105 filter blur-[1px]"
                />
              </picture>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[#002F34]/95 via-[#002F34]/80 to-[#002F34]/40" />
            <div className="absolute inset-0 bg-[#002F34]/25 mix-blend-multiply" />
          </div>

          {/* Foreground Promotional Content */}
          <div className="relative z-10 w-full p-6 sm:p-10 lg:p-14 flex flex-col justify-between max-w-2xl">
            <div>
              {/* Optional Category / Location Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Featured Promotion</span>
                </span>
                {currentPromo.locationText && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200 border border-white/10">
                    <MapPin size={12} className="text-emerald-400" />
                    <span>{currentPromo.locationText}</span>
                  </span>
                )}
                {currentPromo.categoryText && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200 border border-white/10">
                    <Tag size={12} className="text-teal-400" />
                    <span>{currentPromo.categoryText}</span>
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                {currentPromo.title}
              </h1>

              {/* Subtitle */}
              {currentPromo.subtitle && (
                <p className="mt-3 text-sm sm:text-base lg:text-lg text-slate-200 font-normal leading-relaxed">
                  {currentPromo.subtitle}
                </p>
              )}

              {/* CTA Action Button */}
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleBannerClick}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-amber-400/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <span>{currentPromo.ctaText || 'Learn More'}</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={handleStartSelling}
                  className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Post an ad for free
                </button>
              </div>
            </div>
          </div>

          {/* Carousel Controls if multiple banners exist */}
          {activeBanners.length > 1 && (
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() =>
                  setActiveBannerIndex(
                    (prev) => (prev - 1 + activeBanners.length) % activeBanners.length
                  )
                }
                className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Previous banner"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-white/90">
                {activeBannerIndex + 1} / {activeBanners.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setActiveBannerIndex((prev) => (prev + 1) % activeBanners.length)
                }
                className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Next banner"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // DEFAULT BRANDED HERO SECTION (Fallback when no promo active)
  // -------------------------------------------------------------
  return (
    <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="relative overflow-hidden rounded-3xl bg-[#002F34] text-white border border-[#003e45] shadow-xl">
        {/* Banner Background Image with slight blur */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="/indian-banner.webp"
            alt="Indian Marketplace Banner"
            className="w-full h-full object-cover object-center scale-105 filter blur-[3px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#002F34]/95 via-[#002F34]/85 to-[#002F34]/70" />
          <div className="absolute inset-0 bg-[#002F34]/30 mix-blend-multiply" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 lg:p-12">
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-300 mb-4 border border-white/15 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Peer-to-Peer Marketplace • India</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-bold tracking-tight text-white leading-[1.12]">
                Buy, sell, and discover pre-owned goods near you
              </h1>

              <p className="mt-3.5 text-sm sm:text-base text-slate-300 font-normal max-w-xl leading-relaxed">
                Connect directly with verified neighbours. Inspect in person, negotiate fairly, and trade safely with zero platform commissions.
              </p>

              {popularCategories.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Popular:</span>
                  {popularCategories.map((c) => (
                    <button
                      key={c.query}
                      type="button"
                      onClick={() => navigate(`/search?category=${c.query}`)}
                      className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/search')}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-3.5 text-sm font-bold text-slate-900 shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <span>Explore listings</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={handleStartSelling}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 px-5 py-3.5 text-sm font-bold transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Tag size={16} />
                  <span>Post an ad for free</span>
                </button>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> Phone-verified sellers
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" /> Instant direct chat
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" /> Zero listing fees
              </span>
            </div>
          </div>

          {/* Right Column: Spotlight Ad Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            {spotlightAd && (
              <div
                onClick={() => navigate(`/ad/${spotlightAd.id}`)}
                className="w-full max-w-sm rounded-2xl bg-white/95 text-slate-900 p-4 shadow-2xl backdrop-blur-md border border-white/20 hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
                  {adImage ? (
                    <img
                      src={adImage}
                      alt={spotlightAd.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      No photo
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Featured
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-black text-slate-900">
                    {formatCurrency(spotlightAd.price)}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 line-clamp-1 mt-0.5">
                    {spotlightAd.title}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 truncate max-w-[180px]">
                      <MapPin size={12} className="shrink-0 text-slate-400" />
                      {spotlightAd.location?.name || 'India'}
                    </span>
                    <span>{formatRelativeTime(spotlightAd.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
