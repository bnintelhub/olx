import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import {
  useBannersQuery,
  recordBannerImpression,
  recordBannerClick,
  BannerItem,
} from '../../hook/useBannersQuery';
import { AnimatedHeroBackground } from './AnimatedHeroBackground';
import { GsapHeroText } from './GsapHeroText';

export interface HeroBannerProps {
  onOpenPostAd?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPostAd }) => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuthStore();
  const { data: activeBanners = [] } = useBannersQuery('HOME_HERO');

  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [mouseOffset, setMouseOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const trackedImpressions = useRef<Set<string>>(new Set());
  const rafId = useRef<number | null>(null);

  // Current active promo banner
  const currentPromo: BannerItem | undefined = activeBanners[activeBannerIndex];

  // Record impression for the active promotional banner once
  useEffect(() => {
    if (currentPromo && !trackedImpressions.current.has(currentPromo.id)) {
      trackedImpressions.current.add(currentPromo.id);
      recordBannerImpression(currentPromo.id);
    }
  }, [currentPromo]);

  // Smooth auto-advance carousel (paused on hover so user can read / interact)
  useEffect(() => {
    if (activeBanners.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [activeBanners.length, isHovered]);

  // RAF-throttled interactive parallax to avoid main thread event thrashing
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        setMouseOffset({
          x: Math.max(-1, Math.min(1, x)),
          y: Math.max(-1, Math.min(1, y)),
        });
      }
      rafId.current = null;
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    setIsHovered(false);
    setMouseOffset({ x: 0, y: 0 });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  // If no active banners exist, remain blank
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
        {/* Left Column: Hero Carousel Banner */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
          <div
            ref={containerRef}
            onClick={handleBannerClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative overflow-hidden rounded-3xl text-white border border-slate-700/50 shadow-xl h-[360px] sm:h-[400px] lg:h-[440px] flex items-center ${
              currentPromo.targetUrl ? 'cursor-pointer' : ''
            }`}
          >
        {/* ========================================================
            BACKGROUND LAYER
            Promotional image is set in the background, positioned right,
            with a smooth dark gradient on the left for maximum text contrast.
            If no promo media exists, falls back to AnimatedHeroBackground.
            ======================================================== */}
        {promoMediaUrl ? (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {isVideo ? (
              <video
                src={promoMediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover object-center sm:object-right transition-transform duration-700"
              />
            ) : (
              <img
                src={promoMediaUrl}
                alt={currentPromo.title || 'Marketplace Promotion'}
                className="w-full h-full object-cover object-center sm:object-right transition-transform duration-700"
              />
            )}
            {/* Multi-stop gradient: solid dark on left for title/subtitle, fading to transparent on right so promo art shines */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent sm:w-[75%] lg:w-[65%]" />
            <div className="absolute inset-0 bg-slate-950/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent sm:hidden" />
          </div>
        ) : (
          <AnimatedHeroBackground
            parallaxX={mouseOffset.x}
            parallaxY={mouseOffset.y}
          />
        )}

        {/* ========================================================
            FOREGROUND CONTENT
            Left-aligned hero content with large title, subtitle directly
            underneath, badges, and CTA action buttons.
            ======================================================== */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPromo.id || activeBannerIndex}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inset-0 z-10 w-full h-full p-6 sm:p-10 lg:p-14 flex items-center"
          >
            <div className="w-full max-w-xl sm:max-w-2xl lg:max-w-3xl flex flex-col justify-center text-left">
              <GsapHeroText
                bannerId={currentPromo.id}
                title={currentPromo.title}
                subtitle={currentPromo.subtitle}
                locationText={currentPromo.locationText}
                categoryText={currentPromo.categoryText}
                ctaText={currentPromo.ctaText}
                onBannerClick={handleBannerClick}
                onStartSelling={handleStartSelling}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Top-Right Circular Navigation Controls */}
        {activeBanners.length > 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 sm:top-6 sm:right-8 z-20 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() =>
                setActiveBannerIndex(
                  (prev) => (prev - 1 + activeBanners.length) % activeBanners.length
                )
              }
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/25 hover:border-white text-white/80 hover:text-white flex items-center justify-center bg-black/40 hover:bg-black/70 backdrop-blur-md transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title="Previous banner"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveBannerIndex((prev) => (prev + 1) % activeBanners.length)
              }
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/25 hover:border-white text-white/80 hover:text-white flex items-center justify-center bg-black/40 hover:bg-black/70 backdrop-blur-md transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title="Next banner"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Bottom-Left Slide Indicators */}
        {activeBanners.length > 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-6 sm:bottom-5 sm:left-10 z-20 flex items-center gap-1.5"
          >
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveBannerIndex(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === activeBannerIndex
                    ? 'w-7 h-2 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
          </div>
        </div>

        {/* Right Column: Quick Action Cards (Sell in 60s & BLX Verified) */}
        <div className="lg:col-span-4 xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-4 justify-between h-auto lg:h-[440px]">
          {/* Card 1: Sell in 60 seconds */}
          <div className="rounded-3xl bg-[#FAF8F5] border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between flex-1 transition-all hover:shadow-md">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Sell in 60 seconds
              </h3>
              <p className="text-sm text-slate-600 font-normal mt-1.5 leading-relaxed">
                List your unused gadgets with zero fees
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartSelling}
              className="mt-5 w-full inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#002F34] hover:bg-[#003d44] active:bg-[#002428] text-white py-3.5 px-4 text-sm font-bold shadow-xs transition-all hover:scale-[1.01] active:scale-98 cursor-pointer"
            >
              <span>+ Post Free Ad</span>
            </button>
          </div>

          {/* Card 2: BLX Verified */}
          <div className="rounded-3xl bg-gradient-to-br from-[#102A2E] via-[#0E2528] to-[#0A1A1C] border border-emerald-900/40 p-6 shadow-xs flex flex-col justify-between flex-1 transition-all hover:shadow-md">
            <div>
              <h3 className="text-2xl font-black text-[#D4AF37] tracking-tight">
                BLX Verified
              </h3>
              <p className="text-sm text-slate-300/80 font-normal mt-1.5 leading-relaxed">
                Quality-checked devices across India
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/search?verified=true')}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#D4AF37] hover:text-[#f3cc5a] transition-colors cursor-pointer self-start group"
            >
              <span>Explore Verified</span>
              <ArrowRight size={15} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
