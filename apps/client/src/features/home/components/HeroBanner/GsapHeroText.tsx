import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowRight, MapPin, Tag, Star, Play } from 'lucide-react';

export interface GsapHeroTextProps {
  bannerId: string;
  title?: string | null;
  subtitle?: string | null;
  locationText?: string | null;
  categoryText?: string | null;
  ctaText?: string | null;
  onBannerClick: () => void;
  onStartSelling: (e: React.MouseEvent) => void;
}

// Dynamically inject GSAP from CDN into document if not present, avoiding Vite Docker bundling issues
const ensureGsapLoaded = (): Promise<any> => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if ((window as any).gsap) return Promise.resolve((window as any).gsap);

  return new Promise((resolve) => {
    if (document.getElementById('gsap-cdn-core')) {
      const interval = setInterval(() => {
        if ((window as any).gsap) {
          clearInterval(interval);
          resolve((window as any).gsap);
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.id = 'gsap-cdn-core';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
    script.async = true;
    script.onload = () => {
      const textPlugin = document.createElement('script');
      textPlugin.id = 'gsap-cdn-text';
      textPlugin.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/TextPlugin.min.js';
      textPlugin.async = true;
      textPlugin.onload = () => {
        const gsap = (window as any).gsap;
        const tp = (window as any).TextPlugin;
        if (gsap && tp) {
          gsap.registerPlugin(tp);
        }
        resolve(gsap);
      };
      textPlugin.onerror = () => resolve((window as any).gsap);
      document.head.appendChild(textPlugin);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
};

export const GsapHeroText: React.FC<GsapHeroTextProps> = ({
  bannerId,
  title,
  subtitle,
  locationText,
  categoryText,
  ctaText,
  onBannerClick,
  onStartSelling,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedLine1, setDisplayedLine1] = useState('');
  const [displayedLine2, setDisplayedLine2] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  // Split title into Line 1 (White) and Line 2 (Neon Lime highlight)
  const { line1, line2 } = useMemo(() => {
    if (!title) return { line1: '', line2: '' };
    const clean = title.trim();
    if (clean.includes('\n')) {
      const parts = clean.split('\n');
      return { line1: parts[0], line2: parts.slice(1).join(' ') };
    }
    const words = clean.split(/\s+/);
    if (words.length <= 1) {
      return { line1: clean, line2: '' };
    }
    // E.g. "Festival Mega Clearance" -> line1: "Festival", line2: "Mega Clearance"
    const splitIndex = words.length <= 3 ? 1 : Math.floor(words.length / 2);
    return {
      line1: words.slice(0, splitIndex).join(' '),
      line2: words.slice(splitIndex).join(' '),
    };
  }, [title]);

  useEffect(() => {
    if (!title) return;

    // Check accessibility preference
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplayedLine1(line1);
      setDisplayedLine2(line2);
      setIsTypingComplete(true);
      return;
    }

    let isCancelled = false;
    setIsTypingComplete(false);
    setDisplayedLine1('');
    setDisplayedLine2('');

    // Try GSAP text animation first
    ensureGsapLoaded().then((gsap) => {
      if (isCancelled) return;

      if (gsap && gsap.timeline) {
        try {
          const tl = gsap.timeline({
            onComplete: () => {
              if (!isCancelled) setIsTypingComplete(true);
            },
          });

          // Text typing object target
          const state = { charCount1: 0, charCount2: 0 };
          const dur1 = Math.min(0.6, Math.max(0.25, line1.length * 0.035));
          const dur2 = Math.min(0.7, Math.max(0.3, line2.length * 0.035));

          tl.to(state, {
            charCount1: line1.length,
            duration: dur1,
            ease: 'none',
            onUpdate: () => {
              if (!isCancelled) {
                setDisplayedLine1(line1.slice(0, Math.round(state.charCount1)));
              }
            },
          });

          if (line2) {
            tl.to(
              state,
              {
                charCount2: line2.length,
                duration: dur2,
                ease: 'none',
                onUpdate: () => {
                  if (!isCancelled) {
                    setDisplayedLine2(line2.slice(0, Math.round(state.charCount2)));
                  }
                },
              },
              '+=0.05'
            );
          }

          return;
        } catch {
          // Fall through to frame-based kinetic typewriter
        }
      }

      // 60fps High-Performance Kinetic Typewriter Fallback
      let currentIdx1 = 0;
      let currentIdx2 = 0;
      let stepTimer: ReturnType<typeof setTimeout> | null = null;

      const typeLine1 = () => {
        if (isCancelled) return;
        if (currentIdx1 <= line1.length) {
          setDisplayedLine1(line1.slice(0, currentIdx1));
          currentIdx1++;
          stepTimer = setTimeout(typeLine1, 28);
        } else if (line2) {
          stepTimer = setTimeout(typeLine2, 60);
        } else {
          setIsTypingComplete(true);
        }
      };

      const typeLine2 = () => {
        if (isCancelled) return;
        if (currentIdx2 <= line2.length) {
          setDisplayedLine2(line2.slice(0, currentIdx2));
          currentIdx2++;
          stepTimer = setTimeout(typeLine2, 32);
        } else {
          setIsTypingComplete(true);
        }
      };

      stepTimer = setTimeout(typeLine1, 50);

      return () => {
        if (stepTimer) clearTimeout(stepTimer);
      };
    });

    return () => {
      isCancelled = true;
    };
  }, [bannerId, line1, line2, title]);

  return (
    <div ref={containerRef} className="flex flex-col justify-center text-left w-full select-none">
      {/* 
        BADGES ROW
        Matches exact reference design: Amber glowing Star badge + translucent pills
      */}
      <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
        {/* Featured Promotion Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5a623] text-slate-950 px-3 py-1 text-[11px] sm:text-xs font-black shadow-md shadow-amber-500/25 tracking-wide">
          <Star size={12} className="fill-slate-950 text-slate-950" />
          <span>Featured Promotion</span>
        </span>

        {/* Location Badge */}
        {locationText && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[11px] sm:text-xs font-medium text-slate-200 border border-white/15 shadow-xs">
            <MapPin size={11} className="text-emerald-400" />
            <span>{locationText}</span>
          </span>
        )}

        {/* Category Badge */}
        {categoryText && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[11px] sm:text-xs font-medium text-slate-200 border border-white/15 shadow-xs">
            <Tag size={11} className="text-teal-300" />
            <span>{categoryText}</span>
          </span>
        )}
      </div>

      {/* 
        TITLE PATTERN DESIGN
        - Italic, font-black, condensed marketplace energy
        - Line 1: Pure White
        - Line 2: Vibrant Neon Lime with Curved Underline Swoosh
        - Max 2 lines strictly enforced with line-clamp-2 & text-ellipsis
        - Reserved min-height prevents layout shifts (CLS = 0)
      */}
      <div className="relative min-h-[3rem] sm:min-h-[4.5rem] lg:min-h-[5.8rem] flex flex-col justify-center">
        <h1
          className="text-3xl sm:text-5xl lg:text-[3.5rem] font-black italic tracking-tight leading-[1.1] text-white drop-shadow-md line-clamp-2 overflow-hidden text-ellipsis"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: 'break-word',
          }}
        >
          {/* Line 1: Pure White */}
          <span className="text-white block sm:inline">
            {displayedLine1 || (!displayedLine2 ? line1 : '')}
          </span>
          {line2 && ' '}
          {/* Line 2: Neon Lime Highlight with Swoosh */}
          {line2 && (
            <span className="relative inline-block text-[#b4f436] drop-shadow-[0_0_12px_rgba(180,244,54,0.35)]">
              {displayedLine2 || line2}
              {/* Dynamic Curved Underline Swoosh from reference design */}
              <svg
                className={`absolute -bottom-1.5 sm:-bottom-2.5 left-0 w-32 sm:w-48 h-2 sm:h-3 text-[#b4f436] pointer-events-none transition-opacity duration-300 ${
                  isTypingComplete || displayedLine2 ? 'opacity-90' : 'opacity-0'
                }`}
                viewBox="0 0 180 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 9C50 2 135 1 178 8C125 4 60 4 2 9Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          )}
        </h1>
      </div>

      {/* 
        SUBTITLE
        Max 2 lines, crisp light silver text
      */}
      {subtitle && (
        <p
          className="mt-2 sm:mt-3 text-xs sm:text-base lg:text-lg text-slate-200/90 font-medium leading-relaxed max-w-xl drop-shadow-xs line-clamp-2 overflow-hidden text-ellipsis"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtitle}
        </p>
      )}

      {/* 
        CTA ACTION BUTTONS
        - Primary: Amber-Yellow Pill "Explore Now →"
        - Secondary: Play icon in circle "Post an ad for free"
      */}
      <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBannerClick();
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#f5a623] hover:bg-[#ffb53f] active:bg-[#e09419] px-6 py-2.5 sm:px-7 sm:py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span>{ctaText || 'Explore Now'}</span>
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={onStartSelling}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer group"
        >
          <span className="w-6 h-6 rounded-full border border-white/60 group-hover:border-white group-hover:bg-white/10 flex items-center justify-center transition-all">
            <Play size={10} className="fill-white text-white translate-x-0.5" />
          </span>
          <span className="underline underline-offset-4">Post an ad for free</span>
        </button>
      </div>
    </div>
  );
};
