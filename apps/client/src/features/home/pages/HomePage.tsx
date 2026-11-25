import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, Inbox, Sparkles, Loader2 } from 'lucide-react';
import { CategoryGrid } from '@/features/categories/components/CategoryGrid';
import { HeroBanner } from '../components/HeroBanner';
import { AdCard } from '@/features/ads/components/AdCard';
import { useInfiniteAdsQuery } from '@/features/ads/hook/useAdsQuery';
import { Button } from '@/components/ui/button';

interface HomePageProps {
  onOpenPostAd?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenPostAd }) => {
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteAdsQuery({
    sort: 'newest',
    limit: 16,
  });

  const ads = useMemo(() => {
    const all = data?.pages.flatMap((p) => p.ads) || [];
    const seen = new Set<string>();
    return all.filter((ad) => {
      if (seen.has(ad.id)) return false;
      seen.add(ad.id);
      return true;
    });
  }, [data]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Hero Banner */}
      <HeroBanner onOpenPostAd={onOpenPostAd} />

      {/* Category Grid */}
      <CategoryGrid />

      {/* Fresh Recommendations Section */}
      <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-12">
        <div className="mb-6 pb-3 border-b border-slate-200/60">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
            Fresh recommendations
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-body">
            Verified pre-owned listings across your locality
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
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
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
                {ads.map((ad) => (
                  <div key={ad.id} className="h-full">
                    <AdCard ad={ad} />
                  </div>
                ))}
              </div>
            )}

            {/* Cursor-based Load More + Search CTA */}
            {ads.length > 0 && (
              <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
                {hasNextPage && (
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    variant="default"
                    size="default"
                    className="rounded-xl px-7 py-2.5 font-semibold bg-[#002F34] hover:bg-[#003d44] text-white shadow-xs transition-all cursor-pointer active:scale-98"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load more listings</span>
                    )}
                  </Button>
                )}
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
