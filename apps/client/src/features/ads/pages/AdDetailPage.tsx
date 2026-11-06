import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  MapPin,
  Calendar,
  Phone,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Tag,
  DollarSign,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdDetailQuery, useSimilarAdsQuery } from '../hook/useAdsQuery';
import { AdCard } from '../components/AdCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatPostingDate } from '@/lib/utils';
import { isAdWishlisted, toggleWishlist, WISHLIST_EVENT } from '@/utils/wishlist';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { adsService } from '../service/ads.service';

interface AdDetailPageProps {
  onOpenChat?: (ad: any, initialMessage?: string) => void;
}

export const AdDetailPage: React.FC<AdDetailPageProps> = ({ onOpenChat }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token, openAuthModal } = useAuthStore();

  const { data: ad, isLoading, error } = useAdDetailQuery(id || null);
  const { data: similarAds = [] } = useSimilarAdsQuery(id || null);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [isRevealingPhone, setIsRevealingPhone] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');

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

  // Reset scroll and states when ID changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImageIndex(0);
    setRevealedPhone(null);
    setIsOfferOpen(false);
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

  const handleRevealPhone = async () => {
    if (!id || revealedPhone) return;
    setIsRevealingPhone(true);
    try {
      const phone = await adsService.revealContact(id);
      if (phone) {
        setRevealedPhone(phone);
      } else {
        toast.info('Seller has not shared a direct phone number');
      }
    } catch {
      toast.error('Unable to retrieve phone number');
    } finally {
      setIsRevealingPhone(false);
    }
  };

  const handleStartChat = (initialText?: string) => {
    if (!user) {
      openAuthModal(() => {
        if (onOpenChat && ad) onOpenChat(ad, initialText);
      });
      return;
    }
    if (onOpenChat && ad) {
      onOpenChat(ad, initialText);
    } else {
      toast.info('Opening chat with seller...');
    }
  };

  const handleSendOffer = () => {
    if (!offerPrice.trim() || !ad) return;
    const msg = `Hi, I am interested in "${ad.title}". Would you accept an offer of ₹${offerPrice.trim()}?`;
    setIsOfferOpen(false);
    handleStartChat(msg);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7F8] py-8">
        <div className="mx-auto max-w-[1300px] px-4 animate-pulse space-y-6">
          <div className="h-6 w-64 bg-gray-200 rounded-md" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="aspect-[16/10] bg-gray-200 rounded-2xl" />
              <div className="h-40 bg-gray-200 rounded-2xl" />
            </div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded-2xl" />
              <div className="h-64 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-screen bg-[#F5F7F8] flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-sm border border-[#E5EAED]">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#002f34]">Listing Not Found</h2>
          <p className="text-sm text-gray-500 mt-2 mb-6">
            This ad may have been sold, deleted by the seller, or expired.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  // Process images
  const defaultFallback =
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&auto=format&fit=crop&q=80';
  const images =
    ad.images && ad.images.length > 0
      ? ad.images
      : [
          {
            id: 'default',
            originalUrl: defaultFallback,
            displayUrl: defaultFallback,
            thumbnailUrl: defaultFallback,
            isCover: true,
            sortOrder: 0,
          },
        ];

  const currentImage = images[activeImageIndex] || images[0];

  // Key attributes
  const attrs = ad.attributesCache || {};
  const locationText =
    ad.location?.name ||
    (ad.location?.parent?.name ? `${ad.location.name}, ${ad.location.parent.name}` : 'India');

  return (
    <div className="min-h-screen bg-[#F5F7F8] pb-16">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-[#E5EAED] sticky top-0 z-20">
        <div className="mx-auto max-w-[1300px] px-4 py-3 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-gray-500 truncate">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 font-semibold text-[#002f34] hover:underline mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
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
            {/* Image Gallery */}
            <div className="bg-black rounded-2xl overflow-hidden relative shadow-sm select-none">
              <div className="relative aspect-[16/10] w-full flex items-center justify-center bg-zinc-950">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImage.id}
                    src={currentImage.displayUrl || currentImage.originalUrl}
                    alt={ad.title}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="max-h-full max-w-full object-contain"
                  />
                </AnimatePresence>

                {/* Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow-md transition-all cursor-pointer"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow-md transition-all cursor-pointer"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Index counter */}
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-xs text-white text-xs px-3 py-1 rounded-full font-medium">
                  {activeImageIndex + 1} / {images.length}
                </div>
              </div>

              {/* Thumbnails strip */}
              {images.length > 1 && (
                <div className="bg-zinc-900 p-3 flex gap-2 overflow-x-auto scrollbar-none">
                  {images.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        activeImageIndex === idx
                          ? 'border-[#FFD54A] scale-105'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.thumbnailUrl || img.displayUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

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
            </div>

            {/* Key Specifications / Attributes Grid */}
            {Object.keys(attrs).length > 0 && (
              <Card className="rounded-2xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-[#002f34] mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-teal-700" />
                    <span>Overview & Specifications</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {Object.entries(attrs).map(([key, value]) => {
                      if (!value || typeof value === 'object') return null;
                      const formattedKey = key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase());
                      return (
                        <div
                          key={key}
                          className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl flex flex-col justify-between"
                        >
                          <span className="text-xs text-gray-500 font-medium">{formattedKey}</span>
                          <span className="text-sm font-bold text-gray-900 mt-1 capitalize">
                            {String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ad Description */}
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-[#002f34] mb-4">Description</h2>
                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {ad.description || 'No description provided by the seller.'}
                </div>
              </CardContent>
            </Card>

            {/* Location & Safety */}
            <Card className="rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#002f34] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-teal-700" />
                  <span>Location</span>
                </h2>
                <p className="text-sm text-gray-600 font-medium">{locationText}</p>
                <div className="h-44 bg-teal-50/50 border border-teal-100 rounded-xl flex flex-col items-center justify-center text-teal-800 p-4 text-center">
                  <MapPin className="w-8 h-8 text-teal-600 mb-2" />
                  <span className="text-sm font-semibold">{locationText}</span>
                  <span className="text-xs text-gray-500 mt-1">
                    Map preview centered on seller's designated locality
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Price Card (Desktop) */}
            <Card className="hidden lg:block rounded-2xl shadow-sm border-[#E5EAED]">
              <CardContent className="p-6 space-y-5">
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-3xl font-black text-[#002f34] tracking-tight">
                      {formatCurrency(ad.price)}
                    </span>
                    {ad.isNegotiable && (
                      <Badge variant="success">Negotiable</Badge>
                    )}
                  </div>
                  <h1 className="text-base font-semibold text-gray-800 line-clamp-2 leading-snug">
                    {ad.title}
                  </h1>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 truncate max-w-[60%]">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{locationText}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatPostingDate(ad.createdAt)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => setIsOfferOpen(true)}
                    variant="sell"
                    className="w-full text-base font-bold shadow-md hover:scale-[1.01]"
                  >
                    Make an Offer
                  </Button>
                  <Button
                    onClick={() => handleStartChat()}
                    variant="default"
                    className="w-full text-base gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat with Seller</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Seller Profile Card */}
            <Card className="rounded-2xl shadow-sm border-[#E5EAED]">
              <CardContent className="p-6 space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                  Seller Details
                </h3>

                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                    {ad.seller?.profile?.name?.[0]?.toUpperCase() || <User className="w-6 h-6" />}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-gray-900 text-base truncate">
                      {ad.seller?.profile?.name || 'Verified Marketplace Seller'}
                    </h4>
                    <p className="text-xs text-gray-500">
                      Member since {ad.seller?.createdAt ? new Date(ad.seller.createdAt).getFullYear() : '2026'}
                    </p>
                    {ad.seller?.profile?.isIdentityVerified && (
                      <div className="flex items-center gap-1 text-emerald-700 text-xs font-semibold mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ID Verified</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Contact Phone Reveal */}
                <div>
                  {revealedPhone ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl text-center">
                      <div className="text-xs font-semibold uppercase text-emerald-700">Phone Number</div>
                      <a
                        href={`tel:${revealedPhone}`}
                        className="text-lg font-black tracking-wide hover:underline block mt-0.5"
                      >
                        {revealedPhone}
                      </a>
                    </div>
                  ) : (
                    <Button
                      onClick={handleRevealPhone}
                      disabled={isRevealingPhone}
                      variant="outline"
                      className="w-full gap-2 border-teal-800 text-teal-800 hover:bg-teal-50 font-bold"
                    >
                      <Phone className="w-4 h-4" />
                      <span>{isRevealingPhone ? 'Revealing...' : 'Show Phone Number'}</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Safety Guidelines Card */}
            <Card className="rounded-2xl bg-amber-50/60 border-amber-200 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-amber-700" />
                  <span>Safety Tips for Buyers</span>
                </div>
                <ul className="text-xs text-amber-800 space-y-2 list-disc list-inside leading-relaxed">
                  <li>Meet the seller at a public, well-lit place.</li>
                  <li>Check the item thoroughly before making any payment.</li>
                  <li>Never pay advance deposits or fees via unknown links.</li>
                  <li>Verify vehicle paperwork and identity documents in person.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Similar Listings Carousel / Grid */}
        {similarAds.length > 0 && (
          <div className="pt-8 border-t border-[#E5EAED] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#002f34]">Similar Listings</h2>
                <p className="text-xs text-gray-500">More recommendations matching this category</p>
              </div>
              <Link
                to={ad.category ? `/search?category=${ad.category.slug}` : '/search'}
                className="text-sm font-bold text-teal-800 hover:underline flex items-center gap-1"
              >
                <span>View More</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {similarAds.slice(0, 4).map((simAd) => (
                <AdCard key={simAd.id} ad={simAd} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Make an Offer Dialog */}
      <Dialog open={isOfferOpen} onOpenChange={setIsOfferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Make an Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-gray-500">
              Listing price: <span className="font-bold text-gray-800">{formatCurrency(ad.price)}</span>
            </p>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                ₹
              </span>
              <Input
                type="number"
                placeholder="Enter your offer amount"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="pl-8 text-base font-semibold"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOfferOpen(false)}>
              Cancel
            </Button>
            <Button variant="sell" onClick={handleSendOffer} disabled={!offerPrice.trim()}>
              Send Offer in Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

