import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MapPin, Sparkles } from 'lucide-react';
import { AdItem } from '@/types';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { isAdWishlisted, toggleWishlist, WISHLIST_EVENT } from '@/utils/wishlist';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';

interface AdCardProps {
  ad: AdItem;
  onClick?: (ad: AdItem) => void;
  onToggleWishlist?: (adId: string, newState: boolean) => void;
  isWishlisted?: boolean;
}

export const AdCard: React.FC<AdCardProps> = ({
  ad,
  onClick,
  onToggleWishlist,
  isWishlisted: propWishlisted,
}) => {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [liked, setLiked] = useState<boolean>(() => {
    if (typeof propWishlisted === 'boolean') return propWishlisted;
    return isAdWishlisted(ad.id) || Boolean(ad.isFavourited);
  });

  useEffect(() => {
    if (typeof propWishlisted === 'boolean') {
      setLiked(propWishlisted);
      return;
    }

    setLiked(isAdWishlisted(ad.id) || Boolean(ad.isFavourited));

    const handleWishlistChange = (e: any) => {
      if (e.detail?.adId === ad.id) {
        setLiked(e.detail.isWishlisted);
      }
    };
    window.addEventListener(WISHLIST_EVENT, handleWishlistChange);
    return () => window.removeEventListener(WISHLIST_EVENT, handleWishlistChange);
  }, [ad.id, ad.isFavourited, propWishlisted]);

  // Cover image with fallback
  const coverImage =
    ad.images?.find((img) => img.isCover)?.displayUrl ||
    ad.images?.[0]?.displayUrl ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80';

  const handleCardClick = () => {
    if (onClick) {
      onClick(ad);
    } else {
      // Navigate directly to dedicated Product Details Page
      navigate(`/ad/${ad.id}`);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await toggleWishlist(ad, token);
      setLiked(res.isWishlisted);
      if (onToggleWishlist) {
        onToggleWishlist(ad.id, res.isWishlisted);
      }
    } catch (err) {
      console.error('Error toggling wishlist on card:', err);
    }
  };

  const locationText =
    ad.location?.name ||
    (ad.location?.parent?.name ? `${ad.location.name}, ${ad.location.parent.name}` : 'India');

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={handleCardClick}
      className="group bg-white rounded-2xl border border-[#E5EAED] overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer flex flex-col h-full relative"
    >
      {/* Featured Badge */}
      {ad.isFeatured && (
        <div className="absolute top-3 left-3 z-10 bg-[#FFD54A] text-[#002f34] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
          <Sparkles className="w-3 h-3 text-[#002f34]" />
          <span>Featured</span>
        </div>
      )}

      {/* Cover Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
        <img
          src={coverImage}
          alt={ad.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleLike}
          aria-label="Save to Wishlist"
          className="absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-700 hover:text-red-500 hover:bg-white shadow-sm transition-all duration-200"
        >
          <Heart
            className={`w-5 h-5 transition-transform active:scale-125 ${
              liked ? 'fill-red-500 text-red-500' : 'text-gray-600'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Price */}
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-[#002f34] tracking-tight">
              {formatCurrency(ad.price)}
            </span>
            {ad.isNegotiable && (
              <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                Negotiable
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mt-1 leading-snug group-hover:text-teal-900 transition-colors">
            {ad.title}
          </h3>
        </div>

        {/* Footer: Location & Date */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1 truncate max-w-[65%]">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{locationText}</span>
          </div>
          <span className="shrink-0 text-gray-400">{formatRelativeTime(ad.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
};

