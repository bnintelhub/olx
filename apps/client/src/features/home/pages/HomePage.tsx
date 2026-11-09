import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import { CategoryGrid } from '@/features/categories/components/CategoryGrid';
import { HeroBanner } from '../components/HeroBanner';
import { AdCard } from '@/features/ads/components/AdCard';
import { useAdsQuery } from '@/features/ads/hook/useAdsQuery';
import { Button } from '@/components/ui/button';

interface HomePageProps {
  onOpenPostAd?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenPostAd }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch, isFetching } = useAdsQuery({
    sort: 'newest',
    limit: 16,
  });

  const ads = data?.ads || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Hero Banner */}
      <HeroBanner onOpenPostAd={onOpenPostAd} />

      {/* Category Grid */}
      <CategoryGrid />

      {/* Fresh Recommendations Section */}
      <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                Fresh recommendations
              </h2>
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Recently listed pre-owned items near you</p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200/80 overflow-hidden animate-pulse flex flex-col"
              >
                <div className="aspect-[4/3] bg-slate-100" />
                <div className="p-3.5 space-y-2.5">
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2 pt-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto my-6">
            <AlertCircle className="w-9 h-9 text-rose-500 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-900 text-sm">Unable to load recommendations</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Could not retrieve fresh listings. Please check your connection.
            </p>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              Try again
            </Button>
          </div>
        )}

        {/* Ads Grid */}
        {!isLoading && !isError && (
          <>
            {ads.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center max-w-md mx-auto">
                <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-800 text-sm">No listings found</h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">
                  Be the first one to post an ad in this marketplace
                </p>
                <Button onClick={onOpenPostAd} className="bg-[#002F34] hover:bg-[#003d44] text-white">
                  Post an ad
                </Button>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.04 },
                  },
                }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
              >
                {ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </motion.div>
            )}

            {/* Load More Button */}
            {ads.length >= 8 && (
              <div className="mt-10 text-center">
                <Button
                  onClick={() => navigate('/search')}
                  variant="outline"
                  size="default"
                  className="rounded-lg px-6 font-semibold border-slate-300 text-slate-800 hover:bg-slate-100"
                >
                  <span>Explore all listings</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
