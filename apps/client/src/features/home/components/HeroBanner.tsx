import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, MapPin, CheckCircle2, MessageCircle, Tag } from 'lucide-react';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { useCategoriesTreeQuery } from '@/features/categories/hook/useCategoriesQuery';
import { useAdsQuery } from '@/features/ads/hook/useAdsQuery';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface HeroBannerProps {
  onOpenPostAd?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPostAd }) => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuthStore();
  const { data: categories = [] } = useCategoriesTreeQuery();
  const { data: adsData } = useAdsQuery({ limit: 8, sort: 'newest' });
  const [imageError, setImageError] = useState(false);

  // Extract popular categories dynamically from real database
  const popularCategories = React.useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return [];
    return categories
      .filter((c) => !c.parentId && c.isActive !== false)
      .slice(0, 5)
      .map((c) => ({ label: c.name, query: c.slug }));
  }, [categories]);

  // Find the first valid ad from database
  const spotlightAd = React.useMemo(() => {
    if (!adsData?.ads || adsData.ads.length === 0) return null;
    return adsData.ads.find((ad) => ad.images && ad.images.length > 0) || adsData.ads[0];
  }, [adsData]);

  const handleStartSelling = () => {
    if (!user) {
      openAuthModal(() => {
        if (onOpenPostAd) onOpenPostAd();
      });
    } else if (onOpenPostAd) {
      onOpenPostAd();
    }
  };

  const adImage =
    spotlightAd?.images?.find((img) => img.isCover)?.displayUrl ||
    spotlightAd?.images?.[0]?.displayUrl ||
    spotlightAd?.images?.[0]?.originalUrl;

  return (
    <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="relative overflow-hidden rounded-2xl bg-[#002F34] text-white border border-[#003d44] shadow-sm">
        {/* Subtle grid backdrop */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 lg:p-12">
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {/* Context Label */}
              <div className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-emerald-300 mb-4 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Local Classifieds • India</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight text-white leading-[1.15]">
                Buy, sell, and discover pre-owned goods near you
              </h1>

              {/* Subhead */}
              <p className="mt-3 text-sm sm:text-base text-slate-300 font-normal max-w-xl leading-relaxed">
                Connect directly with verified neighbours. Inspect in person, negotiate fairly, and trade without platform commissions.
              </p>

              {/* Dynamic Category Chips from Database */}
              {popularCategories.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium mr-1">Categories:</span>
                  {popularCategories.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => navigate(`/search?category=${encodeURIComponent(chip.query)}`)}
                      className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10 transition-colors cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Primary & Secondary Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => navigate('/search')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FFCE32] hover:bg-[#eec128] px-6 py-3 text-sm font-semibold text-[#002F34] transition-colors cursor-pointer shadow-xs"
                >
                  <span>Explore listings</span>
                  <ArrowRight size={16} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleStartSelling}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-6 py-3 text-sm font-semibold text-white border border-white/15 transition-colors cursor-pointer"
                >
                  <Tag size={16} className="text-amber-300" />
                  <span>Post an ad for free</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Proof Points */}
            <div className="mt-10 pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span className="font-normal truncate">Phone-verified sellers</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-teal-300 shrink-0" />
                <span className="font-normal truncate">Instant direct chat</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-amber-300 shrink-0" />
                <span className="font-normal truncate">Zero listing fees</span>
              </div>
            </div>
          </div>

          {/* Right Column: Spotlight of Real Listing from Database */}
          {spotlightAd && (
            <div className="lg:col-span-5 flex justify-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/ad/${spotlightAd.id}`)}
                className="w-full max-w-sm bg-white rounded-xl p-3 shadow-xl text-slate-900 border border-slate-200 cursor-pointer transition-shadow"
              >
                {/* Real Product Visual from Database */}
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                  {adImage && !imageError ? (
                    <img
                      src={adImage}
                      alt={spotlightAd.title}
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-1.5 p-4 text-center">
                      <Tag size={28} className="text-slate-300" />
                      <span className="text-xs font-medium text-slate-500">Verified Marketplace Item</span>
                    </div>
                  )}
                  <span className="absolute top-2.5 left-2.5 rounded bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 text-[11px] font-medium text-white flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    Verified listing
                  </span>
                  <span className="absolute bottom-2.5 right-2.5 rounded bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-slate-200">
                    Latest posting
                  </span>
                </div>

                {/* Real Ad Details */}
                <div className="p-2.5 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                      {formatCurrency(spotlightAd.price)}
                    </span>
                    {spotlightAd.isNegotiable && (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Negotiable
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-medium text-slate-800 line-clamp-1">
                    {spotlightAd.title}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{spotlightAd.location?.name || 'India'}</span>
                    </div>
                    <span className="text-slate-400 shrink-0">{formatRelativeTime(spotlightAd.createdAt)}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
