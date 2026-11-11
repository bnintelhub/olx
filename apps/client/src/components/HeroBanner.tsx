import React from 'react';
import { ShieldCheck, Users, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#003F46] text-white shadow-sm">
        {/* Banner Background Image with slight blur and readable overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="/bannerImage.webp"
            alt="Indian Marketplace Banner"
            className="w-full h-full object-cover object-center scale-105 filter blur-[3px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#003F46]/95 via-[#003F46]/85 to-[#003F46]/70" />
        </div>

        {/* Subtle geometric circles background overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full border border-white/20" />
          <div className="absolute left-40 -top-40 w-[500px] h-[500px] rounded-full border border-white/10" />
          <div className="absolute left-1/3 -bottom-20 w-80 h-80 rounded-full bg-teal-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center min-h-[360px] lg:min-h-[400px]">
          {/* Left Column: Hero Content */}
          <div className="lg:col-span-6 p-6 sm:p-10 lg:py-12 lg:pl-12 flex flex-col justify-between h-full">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3.5 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur-sm mb-4 border border-white/10">
                <ShieldCheck size={15} className="text-emerald-400" />
                <span>Fast, Free & Safe Classifieds</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.1] text-white">
                Find it. Buy it.{' '}
                <span className="text-[#FFD54A]">Sell it.</span>
              </h1>

              {/* Subtitle */}
              <p className="mt-3 text-base sm:text-lg text-gray-200 font-normal">
                Great deals from people around you.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={onExploreListings}
                  className="inline-flex items-center gap-2 rounded-full bg-[#FFD54A] hover:bg-[#f5c62d] px-7 py-3.5 text-sm font-bold text-[#102A33] shadow-md transition-all duration-200 hover:scale-[1.02]"
                >
                  <span>Explore Listings</span>
                  <ArrowRight size={17} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={handleStartSelling}
                  className="text-sm font-bold text-white underline underline-offset-8 decoration-2 hover:text-[#FFD54A] transition-colors"
                >
                  Start Selling
                </button>
              </div>
            </div>

            {/* Trust Indicators along bottom */}
            <div className="mt-10 pt-4 flex flex-wrap items-center gap-6 text-xs text-gray-200">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-white" />
                <span className="font-medium">Verified Listings</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-white" />
                <span className="font-medium">Local Buyers & Sellers</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-white" />
                <span className="font-medium">Safe & Secure Deals</span>
              </div>
            </div>
          </div>

          {/* Right Column: Product Collage */}
          <div className="lg:col-span-6 relative h-64 sm:h-80 lg:h-full min-h-[360px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#003F46] via-transparent to-transparent z-10 hidden lg:block w-24 pointer-events-none" />
            <img
              src="/hero-collage.jpg"
              alt="OLX Marketplace - Cars, Mobiles, Electronics, Furniture"
              className="w-full h-full object-cover object-center lg:object-right scale-100 transition-transform duration-700"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
