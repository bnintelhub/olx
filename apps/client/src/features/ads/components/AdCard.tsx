import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MapPin, CheckCircle2 } from 'lucide-react';
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

  // Cover image with high quality fallback
  const coverImage =
    ad.images?.find((img) => img.isCover)?.displayUrl ||
    ad.images?.[0]?.displayUrl ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80';

  const handleCardClick = () => {
    if (onClick) {
      onClick(ad);
    } else {
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
      console.error('Error toggling wishlist:', err);
    }
  };

  const locationText =
    ad.location?.name ||
    (ad.location?.parent?.name ? `${ad.location.name}, ${ad.location.parent.name}` : 'India');

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.18, ease: 'easeOut' } }}
      onClick={handleCardClick}
      className="group bg-white rounded-xl border border-slate-200/85 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col h-full relative"
    >
      {/* Featured / Verified Badge */}
      {ad.isFeatured && (
        <div className="absolute top-2.5 left-2.5 z-10 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1 shadow-xs">
          <CheckCircle2 className="w-3 h-3 text-amber-400" />
          <span>Featured</span>
        </div>
      )}

      {/* Cover Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={coverImage}
          alt={ad.title}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 ease-out"
          loading="lazy"
        />

        {/* Wishlist Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={handleLike}
          aria-label="Save to Wishlist"
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-white shadow-xs transition-colors cursor-pointer"
        >
          <Heart
            size={16}
            className={`transition-colors ${
              liked ? 'fill-red-500 text-red-500' : 'text-slate-600'
            }`}
          />
        </motion.button>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          {/* Price & Negotiation */}
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-slate-900 tracking-tight tabular-nums">
              {formatCurrency(ad.price)}
            </span>
            {ad.isNegotiable && (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Negotiable
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-2 mt-1 leading-snug group-hover:text-[#002F34] transition-colors">
            {ad.title}
          </h3>
        </div>

        {/* Footer: Location & Time */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1 truncate max-w-[65%]">
            <MapPin size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">{locationText}</span>
          </div>
          <span className="shrink-0 text-slate-400">{formatRelativeTime(ad.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
};
