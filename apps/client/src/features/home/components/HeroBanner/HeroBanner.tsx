import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
      {/* 
        Zero Layout Shift Hero Container:
        Height is strictly locked (340px mobile, 390px tablet, 430px desktop)
        This guarantees ZERO Cumulative Layout Shift (CLS = 0) when switching slides.
      */}
      <div
        ref={containerRef}
        onClick={handleBannerClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative overflow-hidden rounded-3xl text-white border border-[#003e45]/80 shadow-2xl h-[340px] sm:h-[390px] lg:h-[430px] flex items-center ${
          currentPromo.targetUrl ? 'cursor-pointer' : ''
        }`}
      >
        {/* ========================================================
            REUSABLE ANIMATED HERO BACKGROUND (Layers 1 to 5)
            Continuous, persistent background motion behind every slide
            ======================================================== */}
        <AnimatedHeroBackground
          parallaxX={mouseOffset.x}
          parallaxY={mouseOffset.y}
        />

        {/* ========================================================
            FOREGROUND CONTENT (Layer 6: Admin Content)
            Absolute overlay positioning eliminates all layout shifts
            ======================================================== */}
        <AnimatePresence>
          <motion.div
            key={currentPromo.id || activeBannerIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 z-10 w-full h-full p-5 sm:p-8 lg:p-10 flex items-center"
          >
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-4 lg:gap-8">
              {/* Left Column: Details & CTA with GSAP text animation & 2-line title */}
              <div
                className={`${
                  promoMediaUrl ? 'lg:col-span-7' : 'lg:col-span-12'
                } flex flex-col justify-center text-left`}
              >
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

              {/* Right Column: Clean Display Showcase Card (Matches Reference Image) */}
              {promoMediaUrl && (
                <div className="lg:col-span-5 hidden sm:flex items-center justify-center lg:justify-end">
                  <div className="relative group max-w-xs sm:max-w-sm lg:max-w-md w-full h-[200px] sm:h-[260px] lg:h-[310px] flex items-center justify-center">
                    {/* Ambient Glow Halo behind the showcase card */}
                    <div className="absolute -inset-3 bg-gradient-to-r from-emerald-400/25 via-lime-400/20 to-teal-400/15 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition duration-500 pointer-events-none" />

                    {/* Clean Rounded Display Showcase Card */}
                    <div className="relative w-[190px] h-[190px] sm:w-[250px] sm:h-[250px] lg:w-[290px] lg:h-[290px] rounded-3xl bg-white/95 backdrop-blur-sm p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden border border-white/20 transition-transform duration-300 group-hover:scale-[1.02]">
                      {isVideo ? (
                        <video
                          src={promoMediaUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-contain rounded-2xl drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <img
                          src={promoMediaUrl}
                          alt={currentPromo.title || 'Promotion Asset'}
                          className="w-full h-full object-contain rounded-2xl drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Bottom Controls (Matches Reference Image) */}
        {activeBanners.length > 1 && (
          <>
            {/* Bottom Left: Pill & Dot Slide Indicators */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-3 left-4 sm:bottom-4 sm:left-8 z-20 flex items-center gap-1.5"
            >
              {activeBanners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveBannerIndex(idx)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    idx === activeBannerIndex
                      ? 'w-6 h-2 bg-[#b4f436] shadow-[0_0_8px_rgba(180,244,54,0.9)]'
                      : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                  }`}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Bottom Right: Circular Navigation Buttons */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-3 right-4 sm:bottom-4 sm:right-8 z-20 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() =>
                  setActiveBannerIndex(
                    (prev) => (prev - 1 + activeBanners.length) % activeBanners.length
                  )
                }
                className="w-8 h-8 rounded-full border border-white/30 hover:border-white text-white/80 hover:text-white flex items-center justify-center bg-black/25 hover:bg-black/50 backdrop-blur-sm transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                title="Previous banner"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveBannerIndex((prev) => (prev + 1) % activeBanners.length)
                }
                className="w-8 h-8 rounded-full border border-white/30 hover:border-white text-white/80 hover:text-white flex items-center justify-center bg-black/25 hover:bg-black/50 backdrop-blur-sm transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                title="Next banner"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
