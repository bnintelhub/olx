import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, AlertCircle, Inbox, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Hero Banner */}
      <HeroBanner onOpenPostAd={onOpenPostAd} />

      {/* Category Grid */}
      <CategoryGrid />

      {/* Fresh Recommendations Section */}
      <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-12">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200/60">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
                Fresh recommendations
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-2.5 py-0.5 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-body">
              Verified pre-owned listings refreshed across your locality
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white bg-slate-100/80 border border-slate-200/80 rounded-lg transition-all cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-xs active:scale-95"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200/70 overflow-hidden animate-pulse flex flex-col"
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
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto my-6 shadow-xs">
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
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-md mx-auto shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">No listings found</h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">
                  Be the first one to post a verified ad in this marketplace
                </p>
                <Button onClick={onOpenPostAd} className="bg-[#002F34] hover:bg-[#003d44] text-white shadow-xs">
                  <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
                  Post an ad for free
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {ads.map((ad) => (
                  <div key={ad.id} className="h-full">
                    <AdCard ad={ad} />
                  </div>
                ))}
              </div>
            )}

            {/* Load More Button */}
            {ads.length >= 8 && (
              <div className="mt-12 text-center">
                <Button
                  onClick={() => navigate('/search')}
                  variant="outline"
                  size="default"
                  className="rounded-xl px-7 py-2.5 font-semibold border-slate-300 text-slate-900 hover:bg-white hover:border-slate-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  <span>Explore all listings</span>
                  <ArrowRight className="w-4 h-4 ml-1.5 text-slate-500" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
