import React, { useState, useEffect } from 'react';
import { Heart, MapPin } from 'lucide-react';
import { AdItem } from '../types';
import { isAdWishlisted, toggleWishlist, WISHLIST_EVENT } from '../utils/wishlist';

interface AdCardProps {
  ad: AdItem;
  onClick: (ad: AdItem) => void;
  onToggleWishlist?: (adId: string, newState: boolean) => void;
  isWishlisted?: boolean;
}

export const AdCard: React.FC<AdCardProps> = ({
  ad,
  onClick,
  onToggleWishlist,
  isWishlisted,
}) => {
  const [liked, setLiked] = useState<boolean>(() => {
    if (typeof isWishlisted === 'boolean') return isWishlisted;
    return isAdWishlisted(ad.id);
  });

  useEffect(() => {
    setLiked(isAdWishlisted(ad.id));

    const handleWishlistChange = (e: any) => {
      if (e.detail?.adId === ad.id) {
        setLiked(e.detail.isWishlisted);
      }
    };
    window.addEventListener(WISHLIST_EVENT, handleWishlistChange);
    return () => window.removeEventListener(WISHLIST_EVENT, handleWishlistChange);
  }, [ad.id]);

  // Format price in Indian Rupee format
  const formatPrice = (price: number | string) => {
    const num = Number(price);
    if (isNaN(num)) return '₹ --';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Get cover image or fallback
  const coverImage =
    ad.images?.find((img) => img.isCover)?.displayUrl ||
    ad.images?.[0]?.displayUrl ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80';

  // Format relative time matching reference ("2 days ago", "Yesterday", etc.)
  const getRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours} hr ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 30) return `${diffDays} days ago`;
      return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await toggleWishlist(ad);
      setLiked(res.isWishlisted);
      if (onToggleWishlist) {
        onToggleWishlist(ad.id, res.isWishlisted);
      }
    } catch (err) {
      console.error('Error toggling wishlist on card:', err);
    }
  };

  return (
    <div
      onClick={() => onClick(ad)}
      className="group bg-white rounded-2xl border border-[#E5EAED] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
        <img
          src={coverImage}
          alt={ad.title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          loading="lazy"
        />

        {/* Wishlist Button floating over top-right */}
        <button
          type="button"
          onClick={handleLike}
          aria-label="Save to Wishlist"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs shadow-xs flex items-center justify-center text-gray-700 hover:text-red-500 hover:scale-110 active:scale-95 transition-all duration-150 z-10"
        >
          <Heart
            size={16}
            className={`transition-colors ${
              liked ? 'fill-red-500 text-red-500' : 'text-[#102A33]'
            }`}
          />
        </button>

        {/* Featured Tag */}
        {ad.price && Number(ad.price) > 1000000 && (
          <span className="absolute top-3 left-3 bg-[#FFD54A] text-[#102A33] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider shadow-xs">
            Featured
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-grow justify-between">
        <div>
          {/* Ad Title */}
          <h3 className="text-sm sm:text-[15px] font-bold text-[#102A33] truncate group-hover:text-[#003F46] transition-colors">
            {ad.title}
          </h3>

          {/* Prominent INR Price */}
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-[#102A33]">
              {formatPrice(ad.price)}
            </span>
          </div>
        </div>

        {/* Location & Time Footer */}
        <div className="mt-3 pt-2.5 border-t border-[#F0F3F5] flex items-center justify-between text-xs text-[#667784]">
          <span className="flex items-center gap-1 truncate max-w-[65%]">
            <MapPin size={13} className="flex-shrink-0 text-[#667784]" />
            <span className="truncate">{ad.location?.name || 'All India'}</span>
          </span>
          <span className="flex-shrink-0 text-[11px] font-normal">
            {getRelativeTime(ad.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
