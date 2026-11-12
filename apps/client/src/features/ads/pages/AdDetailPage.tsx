import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Share2,
  MapPin,
  ArrowLeft,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdDetailQuery, useSimilarAdsQuery } from '../hook/useAdsQuery';
import { AdCard } from '../components/AdCard';
import { AdImageGallery } from '../components/AdImageGallery';
import { AdLocationMap } from '../components/AdLocationMap';
import { AdSpecifications } from '../components/AdSpecifications';
import { AdSellerCard } from '../components/AdSellerCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPostingDate } from '@/lib/utils';
import { isAdWishlisted, toggleWishlist, WISHLIST_EVENT } from '@/utils/wishlist';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { resolveLocationCoordinates } from '@/utils/locationCoordinates';

interface AdDetailPageProps {
  onOpenChat?: (ad: any, initialMessage?: string) => void;
}

export const AdDetailPage: React.FC<AdDetailPageProps> = ({ onOpenChat }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token, openAuthModal } = useAuthStore();
  const ui = useUIStore();

  const { data: ad, isLoading, error } = useAdDetailQuery(id || null);
  const { data: similarAds = [] } = useSimilarAdsQuery(id || null);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);

  // Sync wishlist status
  useEffect(() => {
    if (!id) return;
    setIsWishlisted(isAdWishlisted(id) || Boolean(ad?.isFavourited));

    const handleWishlistChange = (e: any) => {
      if (e.detail?.adId === id) {
        setIsWishlisted(e.detail.isWishlisted);
      }
    };
    window.addEventListener(WISHLIST_EVENT, handleWishlistChange);
    return () => window.removeEventListener(WISHLIST_EVENT, handleWishlistChange);
  }, [id, ad?.isFavourited]);

  // Reset scroll on ID change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const handleToggleWishlist = async () => {
    if (!ad) return;
    try {
      const res = await toggleWishlist(ad, token);
      setIsWishlisted(res.isWishlisted);
      toast.success(res.message);
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleStartChat = (initialMessage?: string) => {
    if (!ad) return;
    if (onOpenChat) {
      onOpenChat(ad, initialMessage);
      return;
    }
    const targetUrl = initialMessage
      ? `/chat?adId=${ad.id}&message=${encodeURIComponent(initialMessage)}`
      : `/chat?adId=${ad.id}`;
    if (!user) {
      openAuthModal(() => navigate(targetUrl));
      return;
    }
    navigate(targetUrl);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-teal-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-500">Loading ad details...</p>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-gray-900">Ad Not Found</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          This classified listing may have been sold, deleted, or expired.
        </p>
        <Button onClick={() => navigate('/')} variant="default">
          Back to Browse
        </Button>
      </div>
    );
  }

  const attrs = (ad as any).attributes || (ad as any).attributesCache || {};
  const locationText =
    ad.location?.name ||
    ad.location?.parent?.name ||
    [(ad.location as any)?.city, (ad.location as any)?.state].filter(Boolean).join(', ') ||
    'All India';

  const coords = resolveLocationCoordinates(
    locationText,
    (ad as any)?.latitude,
    (ad as any)?.longitude,
    (ad.location as any)?.latitude,
    (ad.location as any)?.longitude
  );

  return (
    <div className="min-h-screen bg-[#F5F7F8] pb-24 lg:pb-16">
      {/* Top Breadcrumb & Share Strip */}
      <div className="bg-white border-b border-[#E5EAED] sticky top-0 z-20">
        <div className="mx-auto max-w-[1300px] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500 overflow-hidden whitespace-nowrap">
            <button
              onClick={() => navigate(-1)}
              className="font-bold text-[#002f34] hover:underline flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="text-gray-300">/</span>
            <Link to="/" className="hover:text-[#002f34]">
              Home
            </Link>
            {ad.category?.parent && (
              <>
                <span className="text-gray-300">/</span>
                <Link to={`/search?category=${ad.category.parent.slug}`} className="hover:text-[#002f34]">
                  {ad.category.parent.name}
                </Link>
              </>
            )}
            {ad.category && (
              <>
                <span className="text-gray-300">/</span>
                <Link to={`/search?category=${ad.category.slug}`} className="hover:text-[#002f34]">
                  {ad.category.name}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-1.5 rounded-lg text-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleWishlist}
              className="gap-1.5 rounded-lg text-xs"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
                }`}
              />
              <span className="hidden sm:inline">
                {isWishlisted ? 'Saved' : 'Wishlist'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-4 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Smooth Shadcn Carousel with Advance Image Preloading */}
            <AdImageGallery images={ad.images || []} title={ad.title} />

            {/* Mobile Price & Details Card (hidden on desktop) */}
            <div className="lg:hidden bg-white p-5 rounded-2xl border border-[#E5EAED] shadow-sm space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-[#002f34]">
                  {formatCurrency(ad.price)}
                </span>
                {ad.isNegotiable && (
                  <Badge variant="success">Price Negotiable</Badge>
                )}
              </div>
              <h1 className="text-lg font-bold text-gray-900 leading-snug">{ad.title}</h1>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{locationText}</span>
                </div>
                <span>Posted {formatPostingDate(ad.createdAt)}</span>
              </div>

              {/* Action buttons for mobile */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Button
                  type="button"
                  onClick={() => setIsOfferOpen(true)}
                  variant="sell"
                  className="w-full text-sm font-bold shadow-xs py-4"
                >
                  Make an Offer
                </Button>
                <Button
                  type="button"
                  onClick={() => handleStartChat()}
                  variant="default"
                  className="w-full text-sm font-bold gap-2 py-4"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Chat with Seller</span>
                </Button>
              </div>
            </div>

            {/* 1. Ad Description (First) */}
            <Card className="rounded-2xl border-[#E5EAED] shadow-xs">
              <CardContent className="p-5 sm:p-6">
                <h2 className="text-base sm:text-lg font-bold text-[#002f34] mb-3">Description</h2>
                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {ad.description || 'No description provided by the seller.'}
                </div>
              </CardContent>
            </Card>

            {/* 2. Key Specifications / Dynamic Attributes List (Flipkart Style - Then) */}
            <AdSpecifications
              attributes={attrs}
              attributeValues={(ad as any).attributeValues}
              categoryName={ad.category?.name}
            />
          </div>

          {/* Right Sidebar Column (4 cols on desktop, responsive stack on mobile) */}
          <div className="lg:col-span-4 space-y-6">
            <AdSellerCard
              ad={ad}
              locationText={locationText}
              onStartChat={handleStartChat}
              isOfferOpen={isOfferOpen}
              setIsOfferOpen={setIsOfferOpen}
            />

            {/* Right Side Location & Live Map Embed */}
            <AdLocationMap locationText={locationText} coords={coords} />
          </div>
        </div>

        {/* Similar Classified Listings */}
        {similarAds.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-[#002f34] tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>Similar Recommendations</span>
                </h2>
                <p className="text-xs text-gray-500">Related listings you might find interesting</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {similarAds.map((simAd) => (
                <AdCard key={simAd.id} ad={simAd} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
