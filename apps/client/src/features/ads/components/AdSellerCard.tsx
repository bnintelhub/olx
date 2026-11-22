import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Phone,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  User,
  Flag,
  Store,
  Building2,
  Star,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatPostingDate, formatMediaUrl } from '@/lib/utils';
import { adsService } from '../service/ads.service';
import { useUIStore } from '@/stores/useUIStore';
import { toast } from 'sonner';

interface AdSellerCardProps {
  ad: any;
  locationText: string;
  onStartChat: (initialMessage?: string) => void;
  isOfferOpen?: boolean;
  setIsOfferOpen?: (open: boolean) => void;
}

export const AdSellerCard: React.FC<AdSellerCardProps> = ({
  ad,
  locationText,
  onStartChat,
  isOfferOpen: externalOfferOpen,
  setIsOfferOpen: externalSetIsOfferOpen,
}) => {
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [isRevealingPhone, setIsRevealingPhone] = useState(false);
  const [internalOfferOpen, setInternalOfferOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const seller = ad?.seller;
  const profile = seller?.profile;
  const sellerName = profile?.name || seller?.maskedPhone || 'Verified Marketplace Seller';
  const nameForInitial = profile?.name || profile?.businessName || 'Seller';
  const fallbackInitial = nameForInitial.trim().charAt(0).toUpperCase() || 'S';
  const avatarUrl = profile?.avatarUrl ? formatMediaUrl(profile.avatarUrl) : null;
  const bio = profile?.bio?.trim();
  const businessName = profile?.businessName?.trim();
  const isIdentityVerified = Boolean(profile?.isIdentityVerified);
  const accountType = profile?.accountType;
  const adsCount = seller?.adsCount;
  const ratingAverage = profile?.ratingAverage ? Number(profile.ratingAverage) : 0;
  const ratingCount = profile?.ratingCount || 0;

  const memberSinceText = seller?.createdAt
    ? new Date(seller.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '2026';

  const isOfferOpen = externalOfferOpen !== undefined ? externalOfferOpen : internalOfferOpen;
  const setIsOfferOpen = externalSetIsOfferOpen || setInternalOfferOpen;

  const handleRevealPhone = async () => {
    if (!ad?.id || revealedPhone) return;
    setIsRevealingPhone(true);
    try {
      const phone = await adsService.revealContact(ad.id);
      setRevealedPhone(phone);
      toast.success('Seller phone number revealed');
    } catch {
      toast.error('Unable to retrieve phone number. Please try chat.');
    } finally {
      setIsRevealingPhone(false);
    }
  };

  const handleSendOffer = () => {
    if (!offerPrice) return;
    const msg = `Hi, I am interested in your ad "${ad.title}". Would you accept ₹${Number(
      offerPrice
    ).toLocaleString('en-IN')}?`;
    setIsOfferOpen(false);
    setOfferPrice('');
    onStartChat(msg);
  };

  return (
    <div className="space-y-6">
      {/* Price Card (Desktop) */}
      <Card className="hidden lg:block rounded-2xl shadow-sm border-[#E5EAED]">
        <CardContent className="p-6 space-y-5">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-black text-[#002f34] tracking-tight">
                {formatCurrency(ad.price)}
              </span>
              {ad.isNegotiable && <Badge variant="success">Negotiable</Badge>}
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
              onClick={() => onStartChat()}
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
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Seller Details
            </h3>
            {isIdentityVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Verified Seller</span>
              </span>
            )}
          </div>

          <div className="flex items-start gap-3.5">
            {avatarUrl && !avatarError ? (
              <div className="w-14 h-14 sm:w-16 sm:h-16 min-w-[56px] min-h-[56px] sm:min-w-[64px] sm:min-h-[64px] rounded-2xl overflow-hidden shrink-0 shadow-xs border border-slate-200/90 bg-slate-100 flex items-center justify-center">
                <img
                  src={avatarUrl}
                  alt={sellerName}
                  onError={() => setAvatarError(true)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 min-w-[56px] min-h-[56px] sm:min-w-[64px] sm:min-h-[64px] rounded-2xl bg-gradient-to-tr from-[#002f34] to-[#005f63] text-teal-300 font-black text-xl sm:text-2xl flex items-center justify-center shrink-0 shadow-xs border border-teal-900/20 uppercase select-none">
                {fallbackInitial}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[#002f34] text-base leading-snug truncate">
                {sellerName}
              </h4>

              {businessName && (
                <div className="flex items-center gap-1.5 text-xs text-teal-800 font-medium truncate mt-0.5">
                  <Store className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="truncate">{businessName}</span>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mt-1">
                <span>Member since {memberSinceText}</span>
                {typeof adsCount === 'number' && adsCount > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-teal-700 font-medium">
                      {adsCount} Active {adsCount === 1 ? 'Ad' : 'Ads'}
                    </span>
                  </>
                )}
              </div>

              {/* Status / Type Pills */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {accountType === 'BUSINESS' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                    <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>Business Account</span>
                  </span>
                )}
                {ratingAverage > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                    <span>
                      {ratingAverage.toFixed(1)}
                      {ratingCount > 0 ? ` (${ratingCount})` : ''}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio Description */}
          {bio && (
            <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>About Seller</span>
              </div>
              <p className="whitespace-pre-line line-clamp-4 text-slate-600">{bio}</p>
            </div>
          )}

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
          <ul className="text-xs text-amber-800/90 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>Meet seller at a safe, public place.</li>
            <li>Check the item before you buy.</li>
            <li>Pay only after inspecting and taking possession.</li>
            <li>Never transfer advance money via UPI/QR codes to unknown sellers.</li>
          </ul>

          <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
            <span className="text-[11px] text-amber-800/80">See something suspicious?</span>
            <button
              type="button"
              onClick={() => useUIStore.getState().openReportAd({ id: ad.id, title: ad.title })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline transition"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report this ad</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Make Offer Dialog */}
      <Dialog open={isOfferOpen} onOpenChange={setIsOfferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#002f34]">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <span>Make an Offer</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-gray-500">
              The listed price is <strong>{formatCurrency(ad.price)}</strong>. Enter your
              reasonable proposed price below to notify the seller:
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                ₹
              </span>
              <Input
                type="number"
                placeholder="e.g. 24000"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="pl-8"
              />
            </div>
            {offerPrice && Number(offerPrice) > 0 && (
              <p className="text-xs text-teal-700 font-medium">
                Your offer: <strong>{formatCurrency(Number(offerPrice))}</strong>
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsOfferOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              disabled={!offerPrice || Number(offerPrice) <= 0}
              onClick={handleSendOffer}
            >
              Send Offer via Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky Mobile Bottom Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5EAED] px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div className="flex flex-col min-w-0">
            <span className="text-lg font-black text-[#002f34] leading-tight truncate">
              {formatCurrency(ad.price)}
            </span>
            {ad.isNegotiable && (
              <span className="text-[10px] text-emerald-600 font-semibold leading-none">
                Negotiable
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => setIsOfferOpen(true)}
              variant="sell"
              size="sm"
              className="font-bold text-xs h-9 px-3.5 shadow-xs"
            >
              Make Offer
            </Button>
            <Button
              type="button"
              onClick={() => onStartChat()}
              variant="default"
              size="sm"
              className="font-bold text-xs gap-1.5 h-9 px-3.5"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Chat</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

