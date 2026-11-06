import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { CategoriesRibbon } from '@/features/categories/components/CategoriesRibbon';
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
  const { data, isLoading, isError, refetch } = useAdsQuery({
    sort: 'newest',
    limit: 16,
  });

  const ads = data?.ads || [];

  return (
    <div className="min-h-screen bg-[#F5F7F8] pb-16">
      {/* Category Ribbon */}
      <CategoriesRibbon />

      {/* Hero Banner */}
      <HeroBanner onOpenPostAd={onOpenPostAd} />

      {/* Category Grid */}
      <CategoryGrid />

      {/* Fresh Recommendations Section */}
      <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#002f34]">
                Fresh Recommendations
              </h2>
              <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Live
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Recently posted verified listings near you</p>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-teal-800 hover:bg-gray-100 rounded-full transition cursor-pointer"
            title="Refresh recommendations"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E5EAED] overflow-hidden animate-pulse flex flex-col"
              >
                <div className="aspect-[16/10] bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 pt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-md mx-auto my-6">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <h3 className="font-bold text-gray-800">Unable to load recommendations</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Could not retrieve fresh listings. Please check your connection.
            </p>
            <Button onClick={() => refetch()} size="sm">
              Try Again
            </Button>
          </div>
        )}

        {/* Ads Grid */}
        {!isLoading && !isError && (
          <>
            {ads.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5EAED] p-12 text-center max-w-md mx-auto">
                <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-800 text-base">No listings found</h3>
                <p className="text-xs text-gray-500 mt-1 mb-6">
                  Be the first one to post an ad in this marketplace!
                </p>
                <Button onClick={onOpenPostAd} variant="sell">
                  Post Free Ad Now
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            )}

            {/* Load More Button */}
            {ads.length >= 8 && (
              <div className="mt-12 text-center">
                <Button
                  onClick={() => navigate('/search')}
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 font-bold border-[#002f34] text-[#002f34] hover:bg-teal-50 hover:text-[#002f34]"
                >
                  <span>Explore More Listings</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

