import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Heart,
  Share2,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  ExternalLink,
  Flag,
  Gauge,
  Fuel,
  Sparkles,
  Crown,
} from 'lucide-react';
import { AdItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { isAdWishlisted, toggleWishlist, WISHLIST_EVENT } from '../utils/wishlist';

interface AdDetailModalProps {
  adId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectAd?: (adId: string) => void;
  onOpenPostAd?: () => void;
  onOpenChat?: (ad: AdItem, initialMessage?: string) => void;
  onOpenReport?: (adId: string, adTitle: string) => void;
}

export const AdDetailModal: React.FC<AdDetailModalProps> = ({
  adId,
  isOpen,
  onClose,
  onSelectAd,
  onOpenPostAd,
  onOpenChat,
  onOpenReport,
}) => {
  const { token } = useAuth();
  const [ad, setAd] = useState<AdItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [isRevealingPhone, setIsRevealingPhone] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistToast, setWishlistToast] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Related ads state
  const [relatedAds, setRelatedAds] = useState<AdItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Make offer state
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');

  // Fetch Ad Details & Related Ads
  useEffect(() => {
    if (!adId || !isOpen) {
      setAd(null);
      setRevealedPhone(null);
      setActiveImageIndex(0);
      setRelatedAds([]);
      setIsOfferModalOpen(false);
      return;
    }

    setIsWishlisted(isAdWishlisted(adId));

    const fetchAdDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/ads/${adId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setAd(data.data);
          setIsWishlisted(isAdWishlisted(data.data.id) || Boolean(data.data.isFavourited));
        }
      } catch (err) {
        console.error('Error fetching ad detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdDetails();

    // Fetch related ads from same category / location
    setLoadingRelated(true);
    fetch(`/api/v1/ads/${adId}/similar`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data.length > 0) {
          setRelatedAds(data.data);
        } else {
          // Fallback to latest ads excluding current one
          fetch('/api/v1/ads?limit=6&sort=newest')
            .then((r) => r.json())
            .then((d) => {
              if (d.success && d.data?.ads) {
                setRelatedAds(
                  d.data.ads.filter((item: AdItem) => item.id !== adId).slice(0, 4)
                );
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRelated(false));
  }, [adId, isOpen]);

  // Sync with global wishlist events
  useEffect(() => {
    const handleWishlistChange = (e: any) => {
      if (e.detail?.adId === adId) {
        setIsWishlisted(e.detail.isWishlisted);
      }
    };
    window.addEventListener(WISHLIST_EVENT, handleWishlistChange);
    return () => window.removeEventListener(WISHLIST_EVENT, handleWishlistChange);
  }, [adId]);

  // Keyboard navigation (Escape to close, arrows for images)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (ad?.images && ad.images.length > 1) {
          setActiveImageIndex((prev) => (prev === 0 ? ad.images!.length - 1 : prev - 1));
        }
      } else if (e.key === 'ArrowRight') {
        if (ad?.images && ad.images.length > 1) {
          setActiveImageIndex((prev) => (prev === ad.images!.length - 1 ? 0 : prev + 1));
        }
      }
    },
    [isOpen, onClose, ad?.images]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  // Images list
  const rawImages = ad?.images && ad.images.length > 0 ? ad.images : [];
  const defaultFallback =
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&auto=format&fit=crop&q=80';

  const images =
    rawImages.length > 0
      ? rawImages
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

  const handleRevealPhone = async () => {
    if (!adId || revealedPhone) return;
    setIsRevealingPhone(true);
    try {
      const res = await fetch(`/api/v1/ads/${adId}/contact`);
      const data = await res.json();
      if (data.success && data.data?.phoneNumber) {
        setRevealedPhone(data.data.phoneNumber);
      }
    } catch (err) {
      console.error('Error revealing phone:', err);
    } finally {
      setIsRevealingPhone(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleToggleWishlist = async () => {
    if (!ad) return;
    try {
      const res = await toggleWishlist(ad, token);
      setIsWishlisted(res.isWishlisted);
      setAd((prev) =>
        prev
          ? {
              ...prev,
              favouriteCount: res.isWishlisted
                ? (prev.favouriteCount || 0) + 1
                : Math.max(0, (prev.favouriteCount || 1) - 1),
            }
          : null
      );
      setWishlistToast(res.message);
      setTimeout(() => setWishlistToast(null), 2500);
    } catch (err) {
      console.error('Error toggling favourite:', err);
    }
  };

  const formatPrice = (price?: number | string) => {
    if (!price) return '₹ --';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  // Format Posting Date e.g. "09-OCT-26" exactly as shown in screenshot
  const formatPostingDate = (dateString?: string) => {
    if (!dateString) return '09-OCT-26';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Determine key specs from attributesCache
  const attrs = ad?.attributesCache || {};
  const mileage =
    attrs.mileage || attrs.km_driven || attrs.kms_driven || attrs.mileage_kmpl || '0 km';
  const fuel =
    attrs.fuel || attrs.fuel_type || attrs.fuelType || (ad?.category?.slug?.includes('bike') ? 'PETROL' : undefined);
  const locationName =
    ad?.location?.name ||
    (ad?.location?.parent?.name
      ? `${ad.location.name}, ${ad.location.parent.name}`
      : 'Adambakkam, Chennai');

  // Lat and Long for map
  const lat = ad?.latitude || 12.988;
  const lng = ad?.longitude || 80.205;

  const handleSendOffer = () => {
    if (!offerPrice.trim() || !ad) return;
    const msg = `Hi, I am interested in "${ad.title}". Would you accept my offer of ₹${offerPrice.trim()}?`;
    setIsOfferModalOpen(false);
    if (onOpenChat) {
      onOpenChat(ad, msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6 animate-fadeIn">
      <div className="relative w-full max-w-[1240px] bg-[#F2F4F5] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh]">
        {/* Top Dark Teal Header / Breadcrumbs */}
        <div className="bg-[#10363A] text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-[#00343A] flex-shrink-0 z-20">
          <div className="flex items-center gap-2 truncate text-xs sm:text-sm text-gray-300">
            <span className="hover:text-white cursor-pointer transition">Home</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-white font-semibold truncate">
              {ad?.category?.name || 'Bikes'}
            </span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-gray-200 truncate">
              {ad?.location?.parent?.name || 'Tamil Nadu'}
            </span>
            <span className="text-gray-400">&gt;</span>
            <span className="truncate text-gray-200">{locationName}</span>
          </div>

          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-3 sm:p-5 md:p-6 space-y-6 flex-grow">
          {loading || !ad ? (
            <div className="py-28 text-center">
              <div className="w-12 h-12 border-4 border-[#003F46] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium text-sm">Loading listing details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ========================================================================= */}
              {/* TOP HERO MEDIA SHOWCASE: Black Letterbox Image Gallery */}
              {/* ========================================================================= */}
              <div className="relative w-full bg-[#080B0E] rounded-xl overflow-hidden border border-slate-800 shadow-lg">
                <div className="relative aspect-[16/9] sm:aspect-[21/9] md:aspect-[2.4/1] max-h-[460px] w-full flex items-center justify-center">
                  <img
                    src={images[activeImageIndex]?.displayUrl || images[0]?.displayUrl}
                    alt={ad.title}
                    className="max-h-full max-w-full object-contain mx-auto select-none transition-all duration-300"
                  />

                  {/* Left / Right Carousel Controls */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === 0 ? images.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition z-10 cursor-pointer shadow-md"
                        aria-label="Previous Photo"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === images.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition z-10 cursor-pointer shadow-md"
                        aria-label="Next Photo"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}

                  {/* Top-Right Quick Action Icons: Share & Favorite */}
                  <div className="absolute top-4 right-4 flex items-center gap-2.5 z-10">
                    <button
                      type="button"
                      onClick={handleShare}
                      title="Share this listing"
                      className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition cursor-pointer shadow-sm"
                    >
                      <Share2 size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleWishlist}
                      title="Save to Wishlist"
                      className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center backdrop-blur-xs transition cursor-pointer shadow-sm"
                    >
                      <Heart
                        size={19}
                        className={`transition-colors ${
                          isWishlisted ? 'fill-red-500 text-red-500' : 'text-white'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Top-Left Image Counter Badge */}
                  <div className="absolute top-4 left-4 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md backdrop-blur-xs">
                    {activeImageIndex + 1} / {images.length}
                  </div>

                  {/* Bottom-Right OLX Watermark */}
                  <div className="absolute bottom-3 right-4 opacity-50 pointer-events-none select-none text-white font-black text-xl tracking-tighter">
                    olx
                  </div>
                </div>

                {/* Thumbnail Strip (if multiple photos) */}
                {images.length > 1 && (
                  <div className="bg-[#12161A] p-2 sm:p-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-slate-800">
                    {images.map((img, idx) => (
                      <button
                        key={img.id || idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${
                          activeImageIndex === idx
                            ? 'border-[#FFC439] ring-2 ring-[#FFC439]/30 scale-102'
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

              {/* Toast Feedback */}
              {copiedLink && (
                <div className="text-xs text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 py-2 px-4 rounded-xl text-center animate-fadeIn shadow-xs">
                  ✓ Listing link copied to clipboard!
                </div>
              )}
              {wishlistToast && (
                <div className="text-xs text-rose-800 font-bold bg-rose-50 border border-rose-300 py-2 px-4 rounded-xl text-center animate-fadeIn flex items-center justify-center gap-2 shadow-xs">
                  <Heart size={14} className="fill-rose-500 text-rose-500" />
                  <span>{wishlistToast}</span>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TWO COLUMN GRID: Left (Details, Overview, Description, Related) vs Right (Price, Seller, Map) */}
              {/* ========================================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
                {/* ----------------------------------------------------------------------- */}
                {/* LEFT MAIN COLUMN (8 COLS) */}
                {/* ----------------------------------------------------------------------- */}
                <div className="lg:col-span-8 space-y-4 sm:space-y-5">
                  {/* CARD 1: Title & Main Tag */}
                  <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#E2E8EC] shadow-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#FFC439] text-[#102A33] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider shadow-xs">
                        FEATURED
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#102A33] leading-snug">
                      {ad.title}
                    </h1>
                    {fuel && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 pt-0.5 uppercase tracking-wide">
                        <Fuel size={14} className="text-slate-500" />
                        <span>{fuel}</span>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: Overview Card (Exactly matching the bike listing reference) */}
                  <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#E2E8EC] shadow-xs">
                    <h2 className="text-base font-bold text-[#102A33] border-b border-slate-100 pb-3 mb-4">
                      Overview
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                      {/* Mileage */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                          <Gauge size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-500 font-medium block">
                            mileage
                          </span>
                          <span className="text-sm font-bold text-[#102A33] truncate block">
                            {mileage}
                          </span>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                          <MapPin size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-500 font-medium block">
                            Location
                          </span>
                          <span className="text-sm font-bold text-[#102A33] truncate block" title={locationName}>
                            {locationName}
                          </span>
                        </div>
                      </div>

                      {/* Posting date */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                          <Calendar size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-500 font-medium block">
                            Posting date
                          </span>
                          <span className="text-sm font-bold text-[#102A33] truncate block">
                            {formatPostingDate(ad.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Extra Dynamic Attributes (Year, Transmission, Brand, etc.) */}
                      {Object.entries(attrs)
                        .filter(
                          ([key]) =>
                            !['mileage', 'km_driven', 'kms_driven', 'mileage_kmpl', 'fuel', 'fuel_type'].includes(
                              key.toLowerCase()
                            )
                        )
                        .slice(0, 3)
                        .map(([key, val]) => (
                          <div key={key} className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                              <Sparkles size={18} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] text-slate-500 font-medium block capitalize">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className="text-sm font-bold text-[#102A33] truncate block">
                                {String(val)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* CARD 3: Description Card */}
                  <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#E2E8EC] shadow-xs">
                    <h2 className="text-base font-bold text-[#102A33] border-b border-slate-100 pb-3 mb-4">
                      Description
                    </h2>
                    <div className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                      {ad.description || 'No description provided by seller.'}
                    </div>
                  </div>

                  {/* CARD 4: Related Ads Card (Exactly requested by user) */}
                  <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#E2E8EC] shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h2 className="text-base font-bold text-[#102A33]">
                        Related ads
                      </h2>
                      <span className="text-xs text-slate-500 font-medium">
                        More from {ad.category?.name || 'this category'}
                      </span>
                    </div>

                    {loadingRelated ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Finding related listings...
                      </div>
                    ) : relatedAds.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        No related ads found in this category right now.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {relatedAds.slice(0, 4).map((rel) => {
                          const relThumb =
                            rel.images?.[0]?.thumbnailUrl ||
                            rel.images?.[0]?.displayUrl ||
                            defaultFallback;
                          return (
                            <div
                              key={rel.id}
                              onClick={() => {
                                if (onSelectAd) onSelectAd(rel.id);
                              }}
                              className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col"
                            >
                              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                                <img
                                  src={relThumb}
                                  alt={rel.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                                <div className="absolute top-2 left-2 bg-[#FFC439] text-[#102A33] text-[9px] font-black px-1.5 py-0.2 rounded">
                                  FEATURED
                                </div>
                              </div>
                              <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                                <div className="text-sm font-extrabold text-[#102A33]">
                                  {formatPrice(rel.price)}
                                </div>
                                <h3 className="text-xs font-medium text-slate-800 line-clamp-1 group-hover:text-blue-600 transition">
                                  {rel.title}
                                </h3>
                                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100">
                                  <span className="truncate max-w-[90px]">
                                    {rel.location?.name || 'Chennai'}
                                  </span>
                                  <span>{formatPostingDate(rel.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ----------------------------------------------------------------------- */}
                {/* RIGHT SIDEBAR COLUMN (4 COLS) */}
                {/* ----------------------------------------------------------------------- */}
                <div className="lg:col-span-4 space-y-4 sm:space-y-5 lg:sticky lg:top-4">
                  {/* CARD 1: Price & Make Offer */}
                  <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#E2E8EC] shadow-xs space-y-4">
                    <div className="text-3xl sm:text-4xl font-black text-[#102A33] tracking-tight">
                      {formatPrice(ad.price)}
                    </div>

                    {/* Make Offer Button */}
                    <button
                      type="button"
                      onClick={() => setIsOfferModalOpen(true)}
                      className="w-full bg-[#1A56DB] hover:bg-[#1546B4] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition shadow-sm cursor-pointer text-center block"
                    >
                      Make offer
                    </button>

                    {/* Inline Make Offer Input Popup */}
                    {isOfferModalOpen && (
                      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2.5 animate-fadeIn">
                        <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                          <span>Enter Your Offer (₹)</span>
                          <button
                            type="button"
                            onClick={() => setIsOfferModalOpen(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={offerPrice}
                            onChange={(e) => setOfferPrice(e.target.value)}
                            placeholder="e.g. 90000"
                            className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSendOffer}
                            className="bg-[#1A56DB] hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Have a similar Item? Sell Now promo */}
                    <div
                      onClick={() => {
                        if (onOpenPostAd) onOpenPostAd();
                      }}
                      className="bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#FFC439] flex items-center justify-center text-[#102A33] font-bold text-sm">
                          +
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#102A33] block">
                            Have a similar Item? Sell Now
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Post your ad in seconds!
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>
                  </div>

                  {/* CARD 2: Posted By (Seller Profile Card) */}
                  <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#E2E8EC] shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#10363A] text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-xs">
                          {ad.seller?.profile?.name?.charAt(0)?.toUpperCase() || 'B'}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs text-slate-500 block">Posted By</span>
                          <h3 className="text-sm font-bold text-[#102A33] truncate">
                            {ad.seller?.profile?.name || 'Bikewale'}
                          </h3>
                          <span className="text-[11px] text-slate-500 block">
                            Member since{' '}
                            {new Date(ad.seller?.createdAt || Date.now()).toLocaleDateString(
                              'en-IN',
                              { month: 'short', year: 'numeric' }
                            )}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-400" />
                    </div>

                    {/* Items Listed Box */}
                    <div className="border border-slate-200 rounded-xl py-2.5 px-4 text-center bg-slate-50/70">
                      <div className="text-sm font-extrabold text-[#102A33]">
                        {ad.seller?.adsCount || 1}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        Items listed
                      </div>
                    </div>

                    {/* Chat with seller button */}
                    <button
                      type="button"
                      onClick={() => onOpenChat && onOpenChat(ad)}
                      className="w-full border-2 border-[#10363A] bg-white hover:bg-[#F2F4F5] text-[#10363A] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <MessageCircle size={18} />
                      <span>Chat with seller</span>
                    </button>

                    {/* Call Seller Button with ELITE badge */}
                    {revealedPhone ? (
                      <a
                        href={`tel:${revealedPhone}`}
                        className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition text-center shadow-xs"
                      >
                        <Phone size={16} className="text-emerald-700" />
                        <span>{revealedPhone} (Click to Call)</span>
                      </a>
                    ) : (
                      <div className="relative">
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#10363A] text-[#FFC439] text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs z-10">
                          <Crown size={10} className="fill-[#FFC439]" />
                          <span>ELITE</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRevealPhone}
                          disabled={isRevealingPhone}
                          className="w-full bg-[#FFF9E6] hover:bg-[#FFF3CC] border border-[#FFDE7A] text-[#081426] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <Phone size={16} className="text-[#081426]" />
                          <span>
                            {isRevealingPhone
                              ? 'Revealing...'
                              : 'Call Seller'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CARD 3: Have a similar Item? Banner */}
                  <div className="bg-white rounded-xl p-4 border border-[#E2E8EC] shadow-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#102A33]">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        +
                      </div>
                      <span>Have a similar Item?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenPostAd) onOpenPostAd();
                      }}
                      className="border border-[#1A56DB] text-[#1A56DB] hover:bg-blue-50 font-bold text-xs px-3 py-1.5 rounded-lg transition"
                    >
                      Sell For Free
                    </button>
                  </div>

                  {/* CARD 4: Location Map Card (Exactly requested by user) */}
                  <div className="bg-white rounded-xl p-5 border border-[#E2E8EC] shadow-xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <MapPin size={14} className="text-rose-500" />
                      <span>Seller Location</span>
                    </h3>

                    {/* OpenStreetMap Real Map Embed with Marker */}
                    <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <iframe
                        title="Seller Location Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight={0}
                        marginWidth={0}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.015}%2C${lat - 0.01}%2C${lng + 0.015}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
                        className="w-full h-full pointer-events-auto"
                      />
                    </div>

                    {/* Address details below map */}
                    <div className="space-y-1 pt-1">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin size={14} className="text-rose-600 flex-shrink-0" />
                        <span>{locationName}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 pl-5">
                        Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
                      </p>
                      <div className="pt-2 text-right">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                        >
                          <span>Open in Google Maps</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Report Listing Link */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (ad && onOpenReport) {
                          onOpenReport(ad.id, ad.title);
                        }
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1.5 hover:underline py-1"
                    >
                      <Flag size={13} />
                      <span>Report this listing</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
