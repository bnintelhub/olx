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
import { formatCurrency, formatPostingDate } from '@/lib/utils';
import { adsService } from '../service/ads.service';
import { toast } from 'sonner';

interface AdSellerCardProps {
  ad: any;
  locationText: string;
  onStartChat: (initialMessage?: string) => void;
}

export const AdSellerCard: React.FC<AdSellerCardProps> = ({
  ad,
  locationText,
  onStartChat,
}) => {
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [isRevealingPhone, setIsRevealingPhone] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');

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
                Member since{' '}
                {ad.seller?.createdAt
                  ? new Date(ad.seller.createdAt).getFullYear()
                  : '2026'}
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
          <ul className="text-xs text-amber-800/90 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>Meet seller at a safe, public place.</li>
            <li>Check the item before you buy.</li>
            <li>Pay only after inspecting and taking possession.</li>
            <li>Never transfer advance money via UPI/QR codes to unknown sellers.</li>
          </ul>
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
    </div>
  );
};

