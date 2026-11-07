import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Dialog, DialogContent } from '@/components/ui/dialog';

export interface GalleryImage {
  id: string;
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
  const [firstImageLoaded, setFirstImageLoaded] = useState(false);
  const preloadedUrls = useRef<Set<string>>(new Set());

  // Safe fallback if listing has zero photos
  const fallbackList: GalleryImage[] = images && images.length > 0 ? images : [
    {
      id: 'fallback',
      originalUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&auto=format&fit=crop&q=80',
      displayUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=300&auto=format&fit=crop&q=80',
      isCover: true,
      sortOrder: 0,
    },
  ];

  // Sync active slide index when user drags or clicks navigation
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

  // Preload all remaining gallery images in advance once the first image is loaded
  // This ensures subsequent slide transitions are instant and buttery-smooth
  useEffect(() => {
    if (!firstImageLoaded || fallbackList.length <= 1) return;

    fallbackList.slice(1).forEach((img) => {
      const targetUrl = img.displayUrl || img.originalUrl;
      if (targetUrl && !preloadedUrls.current.has(targetUrl)) {
        preloadedUrls.current.add(targetUrl);
        const preloadImg = new Image();
        preloadImg.src = targetUrl;
      }
    });
  }, [firstImageLoaded, fallbackList]);

  // Handle thumbnail navigation click
  const handleThumbnailClick = useCallback(
    (index: number) => {
      if (api) {
        api.scrollTo(index);
      }
    },
    [api]
  );

  return (
    <div className="space-y-3">
      {/* 1. Main Shadcn Carousel Viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-md group select-none">
        <Carousel
          setApi={setApi}
          opts={{
            loop: fallbackList.length > 1,
            duration: 25,
            align: 'start',
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-0">
            {fallbackList.map((image, index) => {
              const imageUrl = image.displayUrl || image.originalUrl || '';
              return (
                <CarouselItem key={image.id || index} className="pl-0">
                  <div className="relative aspect-[16/10] sm:aspect-[16/9] md:aspect-[2.1/1] max-h-[520px] w-full flex items-center justify-center bg-zinc-950 overflow-hidden">
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
          {fallbackList.length > 1 && (
            <>
              <CarouselPrevious className="left-3 border-0 bg-black/50 hover:bg-black/80 text-white shadow-lg transition-transform hover:scale-105" />
              <CarouselNext className="right-3 border-0 bg-black/50 hover:bg-black/80 text-white shadow-lg transition-transform hover:scale-105" />
            </>
          )}
        </Carousel>

        {/* Top Badges: Cover Photo & Fullscreen Trigger */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div>
            {fallbackList[currentIndex]?.isCover && (
              <Badge className="bg-amber-500/90 text-zinc-950 font-bold border-0 shadow-sm pointer-events-auto text-[10px]">
                Cover Photo
              </Badge>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsLightboxOpen(true)}
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
              {currentIndex + 1} / {fallbackList.length}
            </span>
          </span>
        </div>
      </div>

      {/* 2. Synchronized Thumbnails Strip (Shown when > 1 photos) */}
      {fallbackList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {fallbackList.map((img, idx) => {
            const isSelected = idx === currentIndex;
            const thumbUrl = img.thumbnailUrl || img.displayUrl || img.originalUrl || '';
            return (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => handleThumbnailClick(idx)}
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

      {/* 3. Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-[95vw] h-[92vh] p-0 bg-black/95 border-zinc-800 flex flex-col justify-center items-center overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={fallbackList[currentIndex]?.originalUrl || fallbackList[currentIndex]?.displayUrl || ''}
                alt={`${title} - Fullscreen`}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
              />

              {/* Lightbox Navigation Buttons */}
              {fallbackList.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const prev = currentIndex === 0 ? fallbackList.length - 1 : currentIndex - 1;
                      setCurrentIndex(prev);
                      api?.scrollTo(prev);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const next = currentIndex === fallbackList.length - 1 ? 0 : currentIndex + 1;
                      setCurrentIndex(next);
                      api?.scrollTo(next);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* Lightbox Header Bar */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20">
                  {currentIndex + 1} / {fallbackList.length}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsLightboxOpen(false)}
                  className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

