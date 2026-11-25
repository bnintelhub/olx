import React from 'react';
import { ShieldCheck, Users, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/useAuth';

interface HeroBannerProps {
  onOpenPostAd?: () => void;
  onExploreListings?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onOpenPostAd,
  onExploreListings,
}) => {
  const { user, openAuthModal } = useAuth();

  const handleStartSelling = () => {
    if (!user) {
      openAuthModal(() => {
        if (onOpenPostAd) onOpenPostAd();
      });
    } else if (onOpenPostAd) {
      onOpenPostAd();
    }
  };

  return (
    <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-5">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#F4FAF6] text-[#053B24] border border-emerald-200/80 shadow-sm">
        {/* Clean white-to-mint readability gradient without dark blur */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="/bannerImage.webp"
            alt="Indian Marketplace Banner"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F7FBF8] via-[#F7FBF8]/92 to-transparent sm:w-[70%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#F7FBF8]/90 via-[#F7FBF8]/45 to-transparent sm:hidden" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center min-h-[360px] lg:min-h-[400px]">
          {/* Left Column: Hero Content */}
          <div className="lg:col-span-6 p-6 sm:p-10 lg:py-12 lg:pl-12 flex flex-col justify-between h-full min-w-0">
            <div className="min-w-0">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#F1FAF4] px-3.5 py-1.5 text-xs font-semibold text-[#053B24] mb-4 border border-[#C6E6D2]">
                <ShieldCheck size={15} className="text-[#007F3E]" />
                <span>Fast, Free & Safe Classifieds</span>
              </div>

              {/* Main Heading with single-line ellipsis truncation */}
              <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.1] text-[#053B24] truncate">
                Find it. Buy it.{' '}
                <span className="inline-block rounded-xl bg-[#007F3E] text-white px-3 py-0.5">Sell it.</span>
              </h1>

              {/* Subtitle */}
              <p className="mt-3 text-base sm:text-lg text-[#1D3B2C] font-medium truncate">
                Great deals from people around you.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={onExploreListings}
                  className="inline-flex items-center gap-2 rounded-full bg-[#053B24] hover:bg-[#075232] px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                >
                  <span>Explore Listings</span>
                  <ArrowRight size={17} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={handleStartSelling}
                  className="text-sm font-bold text-[#053B24] underline underline-offset-8 decoration-2 hover:text-[#007F3E] transition-colors cursor-pointer"
                >
                  Start Selling
                </button>
              </div>
            </div>

            {/* Trust Indicators along bottom */}
            <div className="mt-10 pt-4 flex flex-wrap items-center gap-6 text-xs text-[#1D3B2C]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#007F3E]" />
                <span className="font-semibold">Verified Listings</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#007F3E]" />
                <span className="font-semibold">Local Buyers & Sellers</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-[#007F3E]" />
                <span className="font-semibold">Safe & Secure Deals</span>
              </div>
            </div>
          </div>

          {/* Right Column: Product Collage */}
          <div className="lg:col-span-6 relative h-64 sm:h-80 lg:h-full min-h-[360px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F7FBF8] via-transparent to-transparent z-10 hidden lg:block w-24 pointer-events-none" />
            <img
              src="/hero-collage.jpg"
              alt="BLX Orbit Marketplace - Cars, Mobiles, Electronics, Furniture"
              className="w-full h-full object-cover object-center lg:object-right scale-100 transition-transform duration-700"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
