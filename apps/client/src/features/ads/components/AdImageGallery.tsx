import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Maximize2, X, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { formatMediaUrl } from '@/lib/utils';

export interface GalleryImage {
  id?: string;
  url?: string | null;
  originalUrl?: string | null;
  displayUrl?: string | null;
  thumbnailUrl?: string | null;
  isCover?: boolean;
  sortOrder?: number;
}

interface AdImageGalleryProps {
  images: GalleryImage[];
  title: string;
}

export const AdImageGallery: React.FC<AdImageGalleryProps> = ({ images, title }) => {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [firstImageLoaded, setFirstImageLoaded] = useState(false);
  const preloadedUrls = useRef<Set<string>>(new Set());
  const touchStartXRef = useRef<number | null>(null);

  const hasImages = images && images.length > 0;
  const imageList = hasImages ? images : [];

  // Sync background carousel index when user swipes or clicks thumbnails on the main page
  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };

    api.on('select', handleSelect);
    handleSelect();

    return () => {
      api.off('select', handleSelect);
    };
  }, [api]);

  // Preload remaining gallery images once the first image is loaded
  useEffect(() => {
    if (!firstImageLoaded || imageList.length <= 1) return;

    imageList.slice(1).forEach((img: GalleryImage) => {
      const targetUrl = img.url || img.displayUrl || img.originalUrl;
      if (targetUrl && !preloadedUrls.current.has(targetUrl)) {
        preloadedUrls.current.add(targetUrl);
        const preloadImg = new Image();
        preloadImg.src = formatMediaUrl(targetUrl);
      }
    });
  }, [firstImageLoaded, imageList]);

  // Open Lightbox isolated from background carousel
  const openLightbox = (index?: number) => {
    const targetIdx = index !== undefined ? index : currentIndex;
    setLightboxIndex(targetIdx);
    setIsLightboxOpen(true);
  };

  // Close Lightbox and synchronize background carousel once without background animation jitter
  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    if (api && lightboxIndex !== currentIndex) {
      api.scrollTo(lightboxIndex, true);
      setCurrentIndex(lightboxIndex);
    }
  }, [api, lightboxIndex, currentIndex]);

  // Bulletproof Background Scroll & Touch Lock while Fullscreen Lightbox is open
  useEffect(() => {
    if (!isLightboxOpen) return;

    const scrollY = window.scrollY;
    const originalStyle = document.body.style.cssText;

    // Strict fixed-position locking prevents any background page scrolling or bouncing
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    // Keyboard navigation (Esc to close, Left/Right arrow to navigate in lightbox ONLY)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setLightboxIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setLightboxIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.cssText = originalStyle;
      window.scrollTo(0, scrollY);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, closeLightbox, imageList.length]);

  // Main Page thumbnail navigation
  const handleMainThumbnailClick = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      if (api) {
        api.scrollTo(index);
      }
    },
    [api]
  );

  // Lightbox-only navigation (DOES NOT touch or animate background carousel)
  const handleLightboxPrev = () => {
    setLightboxIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const handleLightboxNext = () => {
    setLightboxIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  const handleLightboxThumbnailClick = (index: number) => {
    setLightboxIndex(index);
  };

  // Mobile Touch Swipe Handlers for Fullscreen Lightbox
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    const threshold = 40;

    if (diff > threshold) {
      handleLightboxPrev(); // Swiped right -> go to previous
    } else if (diff < -threshold) {
      handleLightboxNext(); // Swiped left -> go to next
    }
    touchStartXRef.current = null;
  };

  if (!hasImages) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-md aspect-[16/10] sm:aspect-[16/9] md:aspect-[2.1/1] max-h-[520px] w-full flex flex-col items-center justify-center text-zinc-500 gap-2 p-8">
        <ImageIcon className="h-14 w-14 opacity-30 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-500">No Photos Attached</span>
      </div>
    );
  }

  const currentLightboxRawUrl =
    imageList[lightboxIndex]?.url ||
    imageList[lightboxIndex]?.originalUrl ||
    imageList[lightboxIndex]?.displayUrl ||
    '';
  const currentLightboxImageUrl = formatMediaUrl(currentLightboxRawUrl);

  return (
    <div className="space-y-3">
      {/* 1. Main Carousel Viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-md group select-none">
        <Carousel
          setApi={setApi}
          opts={{
            loop: imageList.length > 1,
            duration: 25,
            align: 'start',
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-0">
            {imageList.map((image, index) => {
              const rawUrl = image.url || image.displayUrl || image.originalUrl || '';
              const imageUrl = formatMediaUrl(rawUrl);
              return (
                <CarouselItem key={image.id || index} className="pl-0">
                  <div
                    onClick={() => openLightbox(index)}
                    className="relative aspect-[16/10] sm:aspect-[16/9] md:aspect-[2.1/1] max-h-[520px] w-full flex items-center justify-center bg-zinc-950 overflow-hidden cursor-zoom-in"
                  >
                    <img
                      src={imageUrl}
                      alt={`${title} - Photo ${index + 1}`}
                      className="w-full h-full object-contain pointer-events-none transition-transform duration-300"
                      loading={index === 0 ? 'eager' : 'lazy'}
                      onLoad={() => {
                        if (index === 0) setFirstImageLoaded(true);
                      }}
                    />

                    {/* Gradient Overlay for Controls Readability */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>

          {/* Navigation Controls (Visible only when multiple photos exist) */}
          {imageList.length > 1 && (
            <>
              <CarouselPrevious className="left-3 border-0 bg-black/50 hover:bg-black/80 text-white shadow-lg transition-transform hover:scale-105" />
              <CarouselNext className="right-3 border-0 bg-black/50 hover:bg-black/80 text-white shadow-lg transition-transform hover:scale-105" />
            </>
          )}
        </Carousel>

        {/* Top Badges: Cover Photo & Fullscreen Trigger */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div>
            {imageList[currentIndex]?.isCover && (
              <Badge
                variant="secondary"
                className="bg-black/60 text-white border-0 backdrop-blur-xs font-semibold px-2.5 py-0.5 text-xs shadow-md"
              >
                Cover Photo
              </Badge>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => openLightbox(currentIndex)}
            className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs pointer-events-auto cursor-pointer shadow-md transition hover:scale-105"
            title="View Fullscreen Photo"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Bottom Floating Counter Badge */}
        <div className="absolute bottom-3 right-3 pointer-events-none z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-semibold backdrop-blur-xs shadow-md">
            <ImageIcon className="h-3 w-3 text-amber-400" />
            <span>
              {currentIndex + 1} / {imageList.length}
            </span>
          </span>
        </div>
      </div>

      {/* 2. Main Page Synchronized Thumbnails Strip (Shown when > 1 photos) */}
      {imageList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {imageList.map((img, idx) => {
            const isSelected = idx === currentIndex;
            const rawThumb = img.url || img.thumbnailUrl || img.displayUrl || img.originalUrl || '';
            const thumbUrl = formatMediaUrl(rawThumb);
            return (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => handleMainThumbnailClick(idx)}
                className={`relative h-16 w-20 sm:h-20 sm:w-24 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-zinc-900 ${
                  isSelected
                    ? 'border-teal-500 ring-2 ring-teal-500/30 scale-[1.03] shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                aria-label={`Jump to slide ${idx + 1}`}
              >
                <img
                  src={thumbUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 3. True Fullscreen, Immersive Lightbox Modal (Absolute Floating Overlays to Eliminate Layout Shifting) */}
      {isLightboxOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/95 sm:bg-black/98 backdrop-blur-md overflow-hidden animate-in fade-in duration-150 select-none"
            style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
            onWheel={(e) => {
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top Bar: Floating Overlay Header */}
            <div className="absolute top-0 inset-x-0 px-4 sm:px-8 py-3.5 flex items-center justify-between text-white border-b border-white/10 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-30 pointer-events-auto">
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white border border-white/10 shadow-xs">
                  {lightboxIndex + 1} / {imageList.length}
                </span>
                <span className="text-xs sm:text-sm font-medium text-zinc-300 truncate max-w-[200px] sm:max-w-md hidden sm:inline">
                  {title}
                </span>
              </div>

              {/* Single Clean Close Button */}
              <button
                type="button"
                onClick={closeLightbox}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition cursor-pointer backdrop-blur-md border border-white/10 shadow-md"
                title="Close Fullscreen (Esc)"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main Stage: Fixed Inset-0 Viewport (Zero Layout Shift Regardless of Image Ratio or Thumbnails) */}
            <div className="absolute inset-0 flex items-center justify-center p-4 pt-16 pb-24 sm:pt-16 sm:pb-28 overflow-hidden pointer-events-none">
              <img
                src={currentLightboxImageUrl}
                alt={`${title} - Photo ${lightboxIndex + 1}`}
                className="max-h-full max-w-full w-auto h-auto object-contain rounded-md shadow-2xl pointer-events-auto transition-opacity duration-150"
              />

              {/* Desktop Previous Button */}
              {imageList.length > 1 && (
                <button
                  type="button"
                  onClick={handleLightboxPrev}
                  className="hidden sm:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/15 hover:bg-white/30 active:scale-95 text-white items-center justify-center transition cursor-pointer backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto"
                  title="Previous Photo (Left Arrow)"
                  aria-label="Previous Photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* Desktop Next Button */}
              {imageList.length > 1 && (
                <button
                  type="button"
                  onClick={handleLightboxNext}
                  className="hidden sm:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/15 hover:bg-white/30 active:scale-95 text-white items-center justify-center transition cursor-pointer backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto"
                  title="Next Photo (Right Arrow)"
                  aria-label="Next Photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Bottom Bar: Floating Overlay Thumbnails (Fixed Height, No Layout Push) */}
            {imageList.length > 1 && (
              <div className="absolute bottom-0 inset-x-0 h-20 sm:h-24 px-4 pb-3 pt-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-30 flex items-center justify-center pointer-events-auto">
                <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1 scrollbar-none">
                  {imageList.map((img, idx) => {
                    const isSelected = idx === lightboxIndex;
                    const rawThumb =
                      img.url || img.thumbnailUrl || img.displayUrl || img.originalUrl || '';
                    const thumbUrl = formatMediaUrl(rawThumb);
                    return (
                      <button
                        key={img.id || idx}
                        type="button"
                        onClick={() => handleLightboxThumbnailClick(idx)}
                        className={`relative h-12 w-16 sm:h-14 sm:w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-opacity cursor-pointer bg-zinc-900 ${
                          isSelected
                            ? 'border-teal-400 ring-2 ring-teal-400/50 opacity-100 shadow-md'
                            : 'border-white/20 opacity-40 hover:opacity-80'
                        }`}
                        aria-label={`Jump to photo ${idx + 1}`}
                      >
                        <img
                          src={thumbUrl}
                          alt={`Thumb ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
