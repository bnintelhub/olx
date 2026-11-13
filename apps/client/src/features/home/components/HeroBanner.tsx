import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Tag,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import {
  useBannersQuery,
  recordBannerImpression,
  recordBannerClick,
  BannerItem,
} from '../hook/useBannersQuery';

interface HeroBannerProps {
  onOpenPostAd?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPostAd }) => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuthStore();
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

  // If no active banners exist, remain blank as requested
  if (!currentPromo || activeBanners.length === 0) {
    return null;
  }

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

  const handleStartSelling = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal(() => {
        if (onOpenPostAd) onOpenPostAd();
      });
    } else if (onOpenPostAd) {
      onOpenPostAd();
    }
  };

  const isVideo = currentPromo.mediaType === 'VIDEO';
  const promoMediaUrl = currentPromo.desktopMediaUrl || currentPromo.mobileMediaUrl;

  return (
    <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div
        onClick={handleBannerClick}
        className={`relative overflow-hidden rounded-3xl bg-[#002F34] text-white border border-[#003e45] shadow-xl min-h-[300px] sm:min-h-[380px] lg:min-h-[420px] flex items-center ${
          currentPromo.targetUrl ? 'cursor-pointer' : ''
        }`}
      >
        {/* Default Banner Background Image with slight blur */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="/bannerImage.webp"
            alt="Marketplace Banner Background"
            className="w-full h-full object-cover object-center scale-105 filter blur-[3px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#002F34]/95 via-[#002F34]/85 to-[#002F34]/70" />
        </div>

        {/* Foreground Content: Left Details + Right Promotion Card */}
        <div className="relative z-10 w-full p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8">
          {/* Left Column: Details & CTA */}
          <div className={`${promoMediaUrl ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col justify-center text-left`}>
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                <Sparkles size={13} className="text-amber-400" />
                <span>Featured Promotion</span>
              </span>
              {currentPromo.locationText && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200 border border-white/10 backdrop-blur-xs">
                  <MapPin size={12} className="text-emerald-400" />
                  <span>{currentPromo.locationText}</span>
                </span>
              )}
              {currentPromo.categoryText && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200 border border-white/10 backdrop-blur-xs">
                  <Tag size={12} className="text-teal-400" />
                  <span>{currentPromo.categoryText}</span>
                </span>
              )}
            </div>

            {/* Title */}
            {currentPromo.title && (
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                {currentPromo.title}
              </h1>
            )}

            {/* Subtitle */}
            {currentPromo.subtitle && (
              <p className="mt-3 text-sm sm:text-base lg:text-lg text-slate-200 font-normal leading-relaxed max-w-xl">
                {currentPromo.subtitle}
              </p>
            )}

            {/* CTA Action Buttons */}
            <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-4">
              {currentPromo.ctaText && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBannerClick();
                  }}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-amber-400/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <span>{currentPromo.ctaText}</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              )}

              <button
                type="button"
                onClick={handleStartSelling}
                className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
              >
                Post an ad for free
              </button>
            </div>
          </div>

          {/* Right Column: Promotion Image Card with Transparent Background */}
          {promoMediaUrl && (
            <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
              <div className="relative group max-w-sm sm:max-w-md w-full flex items-center justify-center bg-transparent">
                {/* Subtle soft ambient light effect behind the transparent asset */}
                <div className="absolute -inset-2 bg-gradient-to-r from-amber-400/15 via-teal-400/10 to-transparent rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition duration-500 pointer-events-none" />

                {/* Promotion Image Card - Strictly transparent background */}
                <div className="relative bg-transparent flex items-center justify-center p-2 sm:p-4">
                  {isVideo ? (
                    <video
                      src={promoMediaUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="max-h-[220px] sm:max-h-[280px] lg:max-h-[340px] w-auto max-w-full rounded-2xl object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={promoMediaUrl}
                      alt={currentPromo.title || 'Promotion Asset'}
                      className="max-h-[220px] sm:max-h-[280px] lg:max-h-[340px] w-auto max-w-full rounded-2xl object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Carousel Controls if multiple banners exist */}
        {activeBanners.length > 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10"
          >
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
};
