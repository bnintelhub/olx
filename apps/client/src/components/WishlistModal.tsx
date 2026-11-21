import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { X, Heart, Trash2, Eye, MapPin, Image as ImageIcon } from 'lucide-react';
import { AdItem } from '../types';
import { getWishlistItems, removeFromWishlist, WISHLIST_EVENT } from '../utils/wishlist';
import { apiClient, getInMemoryAccessToken } from '@/lib/api-client';
import { formatMediaUrl } from '@/lib/utils';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAd: (ad: AdItem) => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  onClose,
  onSelectAd,
}) => {
  const [favouriteAds, setFavouriteAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const syncFavourites = async () => {
    setLoading(true);
    try {
      const localItems = getWishlistItems();
      const token = getInMemoryAccessToken();

      if (!token) {
        setFavouriteAds(localItems);
        return;
      }

      const res = await apiClient.get('/user/favourites');
      const data = res.data;
      if (data.success && data.data?.ads) {
        // Merge backend and local items, deduplicated by ad ID
        const backendAds: AdItem[] = data.data.ads;
        const seenIds = new Set(backendAds.map((a) => a.id));
        const merged = [...backendAds];
        for (const localAd of localItems) {
          if (!seenIds.has(localAd.id)) {
            merged.push(localAd);
            seenIds.add(localAd.id);
          }
        }
        setFavouriteAds(merged);
      } else {
        setFavouriteAds(localItems);
      }
    } catch (err) {
      console.error('Error fetching favourites:', err);
      setFavouriteAds(getWishlistItems());
    } finally {
      setLoading(false);
    }
  };

  // Open / Close animation lifecycle
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      syncFavourites();
    } else if (shouldRender) {
      handleCloseAnimation();
    }
  }, [isOpen]);

  // Wishlist event listener
  useEffect(() => {
    const handleWishlistUpdate = () => {
      setFavouriteAds(getWishlistItems());
    };

    window.addEventListener(WISHLIST_EVENT, handleWishlistUpdate);
    return () => window.removeEventListener(WISHLIST_EVENT, handleWishlistUpdate);
  }, []);

  // GSAP Right Slide-In Animation
  useLayoutEffect(() => {
    if (shouldRender && isOpen && drawerRef.current) {
      gsap.killTweensOf([drawerRef.current, backdropRef.current]);

      // Fade-in backdrop
      if (backdropRef.current) {
        gsap.fromTo(
          backdropRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.25, ease: 'power2.out' }
        );
      }

      // Slide in from right edge
      gsap.fromTo(
        drawerRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.35, ease: 'power3.out' }
      );
    }
  }, [shouldRender, isOpen]);

  const handleCloseAnimation = () => {
    if (!drawerRef.current) {
      setShouldRender(false);
      return;
    }

    gsap.killTweensOf([drawerRef.current, backdropRef.current]);

    gsap.to(drawerRef.current, {
      x: '100%',
      duration: 0.24,
      ease: 'power2.in',
    });

    if (backdropRef.current) {
      gsap.to(backdropRef.current, {
        opacity: 0,
        duration: 0.22,
        onComplete: () => {
          setShouldRender(false);
        },
      });
    } else {
      setShouldRender(false);
    }
  };

  const handleUserClose = () => {
    handleCloseAnimation();
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleUserClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleRemove = async (adId: string) => {
    await removeFromWishlist(adId);
    setFavouriteAds((prev) => prev.filter((a) => a.id !== adId));
  };

  const formatPrice = (price?: number | string) => {
    if (!price) return '₹ --';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  const getWishlistCoverImage = (ad: AdItem): string | null => {
    const images = (ad as any).images;
    if (Array.isArray(images) && images.length > 0) {
      const coverObj = images.find((img: any) => img?.isCover) || images[0];
      const raw =
        coverObj?.url ||
        coverObj?.displayUrl ||
        coverObj?.thumbnailUrl ||
        coverObj?.originalUrl ||
        coverObj?.mediaAsset?.storageKey ||
        (typeof coverObj === 'string' ? coverObj : null);
      if (raw) return formatMediaUrl(raw);
    }
    if (typeof (ad as any).coverImage === 'string') {
      return formatMediaUrl((ad as any).coverImage);
    }
    return null;
  };

  if (!shouldRender) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleUserClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
    >
      <div
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:w-[480px] max-w-full h-full bg-white shadow-2xl flex flex-col border-l border-gray-200"
      >
        {/* Header */}
        <div className="bg-[#002f34] text-white px-5 py-4 flex items-center justify-between border-b border-[#003d44] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Saved Listings (Wishlist)</h2>
              <p className="text-[11px] text-gray-300">
                {favouriteAds.length} {favouriteAds.length === 1 ? 'item' : 'items'} bookmarked
              </p>
            </div>
          </div>
          <button
            onClick={handleUserClose}
            className="text-gray-300 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 sm:p-5 flex-grow space-y-3">
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-3 border-[#002f34] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-gray-500">Loading saved ads...</p>
            </div>
          ) : favouriteAds.length === 0 ? (
            <div className="py-24 text-center space-y-3 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-800 text-base">Your Wishlist is Empty</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                Found something you like? Click the heart icon on any ad card to save it here for quick access.
              </p>
            </div>
          ) : (
            favouriteAds.map((ad) => {
              const coverImage = getWishlistCoverImage(ad);

              return (
                <div
                  key={ad.id}
                  className="p-3.5 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-teal-600/40 transition flex items-center justify-between gap-3 group"
                >
                  <div
                    onClick={() => {
                      onSelectAd(ad);
                      handleUserClose();
                    }}
                    className="flex items-center gap-3.5 cursor-pointer flex-grow min-w-0"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 flex-shrink-0 border border-gray-200 overflow-hidden flex items-center justify-center">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={ad.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const parent = (e.currentTarget as HTMLElement).parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.wishlist-thumb-fallback') as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className={`wishlist-thumb-fallback ${coverImage ? 'hidden' : 'flex'} items-center justify-center text-gray-400`}>
                        <ImageIcon className="h-6 w-6 opacity-40" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-grow">
                      <span className="text-sm sm:text-base font-extrabold text-[#002f34] block">
                        {formatPrice(ad.price)}
                      </span>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-800 truncate mt-0.5 group-hover:text-[#00a49f] transition">
                        {ad.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                        <span className="flex items-center gap-1 truncate max-w-[120px]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{ad.location?.name || 'All India'}</span>
                        </span>
                        <span>•</span>
                        <span className="truncate">{ad.category?.name || 'Category'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        onSelectAd(ad);
                        handleUserClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-[#002f34] hover:bg-teal-100 text-xs font-bold transition flex items-center gap-1"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">View</span>
                    </button>
                    <button
                      onClick={() => handleRemove(ad.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                      title="Remove from Wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
