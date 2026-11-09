import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div
      onClick={handleCardClick}
      className="group bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col h-full relative"
    >
      {/* Featured / Verified Badge */}
      {ad.isFeatured && (
        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm border border-white/10">
          <CheckCircle2 className="w-3 h-3 text-amber-400" />
          <span>Featured</span>
        </div>
      )}

      {/* Cover Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={coverImage}
          alt={ad.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          loading="lazy"
        />

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleLike}
          aria-label="Save to Wishlist"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-white shadow-xs border border-white/40 active:scale-90 hover:scale-105 transition-all duration-150 cursor-pointer"
        >
          <Heart
            size={16}
            className={`transition-colors duration-150 ${
              liked ? 'fill-red-500 text-red-500' : 'text-slate-600'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Price & Negotiation */}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl font-bold text-slate-900 tracking-tight tabular-nums font-heading">
              {formatCurrency(ad.price)}
            </span>
            {ad.isNegotiable && (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Negotiable
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-slate-800 line-clamp-2 mt-1.5 leading-snug group-hover:text-[#002F34] transition-colors font-body">
            {ad.title}
          </h3>
        </div>

        {/* Footer: Location & Time */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-body">
          <div className="flex items-center gap-1.5 truncate max-w-[65%]">
            <MapPin size={13} className="shrink-0 text-slate-400" />
            <span className="truncate">{locationText}</span>
          </div>
          <span className="shrink-0 text-slate-400">{formatRelativeTime(ad.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};
