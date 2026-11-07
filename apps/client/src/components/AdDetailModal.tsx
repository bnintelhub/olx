import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  Share2,
  MapPin,
  Calendar,
  Phone,
  MessageCircle,
  ExternalLink,
  Flag,
} from 'lucide-react';
import { AdItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { isAdWishlisted, toggleWishlist, WISHLIST_EVENT } from '../utils/wishlist';
import { resolveLocationCoordinates } from '../utils/locationCoordinates';
import { formatCurrency, formatPostingDate } from '@/lib/utils';
import { AdImageGallery } from '@/features/ads/components/AdImageGallery';
import { AdSpecifications } from '@/features/ads/components/AdSpecifications';
import { toast } from 'sonner';

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
  onOpenChat,
  onOpenReport,
}) => {
  const { token } = useAuth();
  const [ad, setAd] = useState<AdItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [isRevealingPhone, setIsRevealingPhone] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (!isOpen || !adId) {
      setAd(null);
      return;
    }

    setLoading(true);
    setRevealedPhone(null);
    setIsWishlisted(isAdWishlisted(adId));

    fetch(`/api/v1/ads/${adId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setAd(data.data);
          setIsWishlisted(isAdWishlisted(adId) || Boolean(data.data.isFavourited));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, adId]);

  useEffect(() => {
    const handleWishlistChange = (e: any) => {
      if (e.detail?.adId === adId) {
        setIsWishlisted(e.detail.isWishlisted);
      }
    };
    window.addEventListener(WISHLIST_EVENT, handleWishlistChange);
    return () => window.removeEventListener(WISHLIST_EVENT, handleWishlistChange);
  }, [adId]);

  if (!isOpen || !adId) return null;

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
      navigator.clipboard.writeText(`${window.location.origin}/ad/${adId}`);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleRevealPhone = async () => {
    if (!adId || revealedPhone) return;
    setIsRevealingPhone(true);
    try {
      const res = await fetch(`/api/v1/ads/${adId}/contact`);
      const data = await res.json();
      if (res.ok && data.success && data.data?.phoneNumber) {
        setRevealedPhone(data.data.phoneNumber);
      } else {
        toast.error('Unable to retrieve seller phone');
      }
    } catch {
      toast.error('Unable to retrieve seller phone');
    } finally {
      setIsRevealingPhone(false);
    }
  };

  const locationText =
    ad?.location?.name ||
    ad?.location?.parent?.name ||
    [(ad?.location as any)?.city, (ad?.location as any)?.state].filter(Boolean).join(', ') ||
    'All India';

  const coords = resolveLocationCoordinates(
    locationText,
    (ad as any)?.latitude,
    (ad as any)?.longitude,
    (ad?.location as any)?.latitude,
    (ad?.location as any)?.longitude
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
            {ad?.category?.name || 'Classified Ad Details'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-200 transition cursor-pointer"
              title="Share"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={handleToggleWishlist}
              className="p-2 rounded-full hover:bg-gray-200 transition cursor-pointer"
              title="Save to Wishlist"
            >
              <Heart
                size={16}
                className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-500'}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading || !ad ? (
            <div className="py-20 text-center text-xs text-gray-400">Loading details...</div>
          ) : (
            <>
              {/* Image Carousel */}
              <AdImageGallery images={ad.images || []} title={ad.title} />

              {/* Title & Price */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-snug">{ad.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-gray-400" />
                      {locationText}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-gray-400" />
                      {formatPostingDate(ad.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-black text-[#002f34]">
                  {formatCurrency(ad.price)}
                </div>
              </div>

              {/* Key Specifications (Flipkart Style) */}
              <AdSpecifications
                attributes={ad.attributes || ad.attributesCache}
                attributeValues={ad.attributeValues}
                categoryName={ad.category?.name}
              />

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Description
                </h3>
                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                  {ad.description || 'No description provided.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {onOpenChat && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenChat(ad);
                    }}
                    className="flex-1 min-w-[160px] py-2.5 px-4 bg-[#002f34] hover:bg-[#003d44] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <MessageCircle size={15} />
                    <span>Chat with Seller</span>
                  </button>
                )}

                {revealedPhone ? (
                  <a
                    href={`tel:${revealedPhone}`}
                    className="flex-1 min-w-[160px] py-2.5 px-4 bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm text-center"
                  >
                    <Phone size={15} />
                    <span>Call: {revealedPhone}</span>
                  </a>
                ) : (
                  <button
                    onClick={handleRevealPhone}
                    disabled={isRevealingPhone}
                    className="flex-1 min-w-[160px] py-2.5 px-4 border border-teal-800 text-teal-800 hover:bg-teal-50 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone size={15} />
                    <span>{isRevealingPhone ? 'Revealing...' : 'Show Phone Number'}</span>
                  </button>
                )}

                {onOpenReport && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenReport(ad.id, ad.title);
                    }}
                    className="p-2.5 text-gray-400 hover:text-rose-600 rounded-xl border border-gray-200 transition cursor-pointer"
                    title="Report Listing"
                  >
                    <Flag size={15} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
