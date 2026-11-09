import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <div className="relative overflow-hidden rounded-3xl bg-[#002F34] text-white border border-[#003e45] shadow-xl">
        {/* Soft Ambient Radial Lights */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Tactile Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 lg:p-12">
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Context Label */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-300 mb-4 border border-white/15 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Peer-to-Peer Marketplace • India</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-bold tracking-tight text-white leading-[1.12]">
                Buy, sell, and discover pre-owned goods near you
              </h1>

              {/* Subhead */}
              <p className="mt-3.5 text-sm sm:text-base text-slate-300 font-normal max-w-xl leading-relaxed">
                Connect directly with verified neighbours. Inspect in person, negotiate fairly, and trade safely with zero platform commissions.
              </p>

              {/* Dynamic Category Chips from Database */}
              {popularCategories.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium mr-1">Trending:</span>
                  {popularCategories.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => navigate(`/search?category=${encodeURIComponent(chip.query)}`)}
                      className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all duration-150 cursor-pointer hover:border-emerald-400/50 hover:text-white"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Primary & Secondary Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/search')}
                  className="group relative inline-flex items-center gap-2 rounded-xl bg-[#FFCE32] hover:bg-[#fed653] px-6 py-3.5 text-sm font-bold text-[#002F34] transition-all duration-150 cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>Explore listings</span>
                  <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={handleStartSelling}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-6 py-3.5 text-sm font-semibold text-white border border-white/20 transition-all duration-150 cursor-pointer backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Tag size={16} className="text-amber-300" />
                  <span>Post an ad for free</span>
                </button>
              </div>
            </div>

            {/* Proof Points */}
            <div className="mt-10 pt-5 border-t border-white/10 grid grid-cols-3 gap-3 text-xs text-slate-300">
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
              <div
                onClick={() => navigate(`/ad/${spotlightAd.id}`)}
                className="w-full max-w-sm bg-white rounded-2xl p-3.5 shadow-2xl text-slate-900 border border-slate-200/90 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-3xl hover:border-slate-300 group"
              >
                {/* Real Product Visual from Database */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                  {adImage && !imageError ? (
                    <img
                      src={adImage}
                      alt={spotlightAd.title}
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-1.5 p-4 text-center">
                      <Tag size={28} className="text-slate-300" />
                      <span className="text-xs font-medium text-slate-500">Verified Marketplace Item</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="rounded-full bg-slate-900/85 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-white flex items-center gap-1 shadow-xs border border-white/10">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      Verified
                    </span>
                  </div>

                  <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/75 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium text-slate-200 border border-white/10">
                    Featured Spotlight
                  </span>
                </div>

                {/* Real Ad Details */}
                <div className="p-2 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                      {formatCurrency(spotlightAd.price)}
                    </span>
                    {spotlightAd.isNegotiable && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        Negotiable
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-[#002F34] transition-colors">
                    {spotlightAd.title}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1 truncate font-medium">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{spotlightAd.location?.name || 'India'}</span>
                    </div>
                    <span className="text-slate-400 shrink-0">{formatRelativeTime(spotlightAd.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
