import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!isOpen) return;
    syncFavourites();

    const handleWishlistUpdate = () => {
      setFavouriteAds(getWishlistItems());
    };

    window.addEventListener(WISHLIST_EVENT, handleWishlistUpdate);
    return () => window.removeEventListener(WISHLIST_EVENT, handleWishlistUpdate);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-200">
        {/* Header */}
        <div className="bg-[#002f34] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#003d44]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Saved Listings (Wishlist)</h2>
              <p className="text-[11px] text-gray-300">
                {favouriteAds.length} items bookmarked
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-grow">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-[#002f34] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-500">Loading saved ads...</p>
            </div>
          ) : favouriteAds.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-800 text-base">Your Wishlist is Empty</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Found something you like? Click the heart icon on any ad card to save it here for later.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {favouriteAds.map((ad) => {
                const rawCover = ad.images?.[0]?.url || ad.images?.[0]?.displayUrl;
                const coverImage = rawCover ? formatMediaUrl(rawCover) : null;

                return (
                  <div
                    key={ad.id}
                    className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => {
                        onSelectAd(ad);
                        onClose();
                      }}
                      className="flex items-center gap-3 cursor-pointer flex-grow min-w-0"
                    >
                      <div className="w-16 h-16 rounded bg-gray-100 flex-shrink-0 border border-gray-200 overflow-hidden flex items-center justify-center">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt=""
                            className="w-full h-full object-cover"
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
                          <ImageIcon className="h-5 w-5 opacity-40" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-extrabold text-[#002f34] block">
                          {formatPrice(ad.price)}
                        </span>
                        <h4 className="text-xs font-semibold text-gray-800 truncate mt-0.5 hover:text-[#00a49f]">
                          {ad.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {ad.location?.name || 'All India'}
                          </span>
                          <span>•</span>
                          <span>{ad.category?.name || 'Category'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <button
                        onClick={() => {
                          onSelectAd(ad);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded bg-teal-50 text-[#002f34] hover:bg-teal-100 text-xs font-bold transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => handleRemove(ad.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        title="Remove from Wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
