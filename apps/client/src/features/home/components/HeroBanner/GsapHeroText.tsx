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
    <div ref={containerRef} className="flex flex-col justify-center text-left w-full select-none min-w-0">
      {/* Badges Row: Clean mint-tinted pills matching green/white marketplace theme */}
      <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1FAF4] border border-[#C6E6D2] text-[#053B24] px-3 py-1 text-[11px] sm:text-xs font-semibold shadow-2xs">
          <Star size={12} className="fill-[#007F3E] text-[#007F3E]" />
          <span>Featured Promotion</span>
        </span>

        {locationText && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-[#D4E6DA] px-3 py-1 text-[11px] sm:text-xs font-medium text-[#053B24] shadow-2xs max-w-[160px] truncate">
            <MapPin size={11} className="text-[#053B24] shrink-0" />
            <span className="truncate">{locationText}</span>
          </span>
        )}

        {categoryText && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-[#D4E6DA] px-3 py-1 text-[11px] sm:text-xs font-medium text-[#053B24] shadow-2xs max-w-[160px] truncate">
            <Tag size={11} className="text-[#007F3E] shrink-0" />
            <span className="truncate">{categoryText}</span>
          </span>
        )}
      </div>

      {/* Title Area: Strict single-line ellipsis per segment so long titles never wrap or overflow */}
      <div className="relative flex flex-col items-start gap-1.5 min-w-0 max-w-full">
        <h1
          title={title || undefined}
          className="w-full min-w-0 flex flex-col items-start gap-1.5"
        >
          <span className="block max-w-full truncate text-2xl sm:text-4xl lg:text-[52px] font-black tracking-tight leading-[1.08] text-[#053B24]">
            {displayedLine1 || (!displayedLine2 ? line1 : '')}
          </span>

          {line2 && (
            <span className="relative inline-block max-w-full">
              <span className="block max-w-full truncate rounded-xl sm:rounded-2xl bg-[#007F3E] px-3 py-1 sm:px-5 sm:py-1.5 text-xl sm:text-3xl lg:text-[42px] font-black tracking-tight leading-tight text-white shadow-sm">
                {displayedLine2 || line2}
              </span>
              <svg
                className={`mt-1 w-36 sm:w-52 h-2 text-[#F5B82E] pointer-events-none transition-opacity duration-300 ${
                  isTypingComplete || displayedLine2 ? 'opacity-95' : 'opacity-0'
                }`}
                viewBox="0 0 180 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2 8C50 2 135 1 178 7C125 4 60 4 2 8Z" fill="currentColor" />
              </svg>
            </span>
          )}
        </h1>
      </div>

      {/* Subtitle with optional discount highlight badge */}
      {subtitle && (
        <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-[17px] text-[#1D3B2C] font-medium leading-relaxed max-w-xl line-clamp-2 overflow-hidden text-ellipsis">
          {subtitle.split(/(\b\d+%\s*OFF\b)/gi).map((part, idx) =>
            /^\d+%\s*OFF$/i.test(part) ? (
              <span
                key={idx}
                className="inline-block rounded-md bg-[#FCD34D] text-[#053B24] font-extrabold px-2 py-0.5 mx-0.5 text-xs sm:text-sm align-middle"
              >
                {part}
              </span>
            ) : (
              <React.Fragment key={idx}>{part}</React.Fragment>
            )
          )}
        </p>
      )}

      {/* CTA Action Buttons */}
      <div className="mt-5 sm:mt-7 flex flex-wrap items-center gap-4 sm:gap-5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBannerClick();
          }}
          className="inline-flex items-center gap-2.5 rounded-full bg-[#053B24] hover:bg-[#075232] active:bg-[#032919] px-7 py-3 text-sm font-bold text-white shadow-md shadow-emerald-950/15 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <span>{ctaText || 'Shop Now'}</span>
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={onStartSelling}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#053B24] hover:text-[#007F3E] transition-colors cursor-pointer group"
        >
          <span className="w-7 h-7 rounded-full border-2 border-[#053B24]/75 group-hover:border-[#007F3E] group-hover:bg-[#007F3E] group-hover:text-white flex items-center justify-center transition-all">
            <Play size={10} className="fill-current translate-x-0.5" />
          </span>
          <span className="underline underline-offset-4">Post Free Ad</span>
        </button>
      </div>
    </div>
  );
};
