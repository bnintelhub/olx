import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle2, ShieldCheck, QrCode, Smartphone, CreditCard,
  ExternalLink, Loader2, AlertCircle, Package, Copy, Check, Lock, Sparkles, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paymentsService } from '@/features/payments/service/payments.service';
import { apiClient } from '@/lib/api-client';

export interface CheckoutPlan {
  id: string;
  name: string;
  priceInr: number;
  adsCount: number;
  validityDays: number;
  purpose?: 'OTHER' | 'SELLER_SUBSCRIPTION';
}

interface CheckoutStepProps {
  selectedPlan: CheckoutPlan;
  onBack: () => void;
  onSuccess: (updatedQuota: any) => void;
  onClose: () => void;
}

export const CheckoutStep: React.FC<CheckoutStepProps> = ({
  selectedPlan,
  onBack,
  onSuccess,
  onClose,
}) => {
  const [mainTab, setMainTab] = useState<'UPI' | 'CARD'>('UPI');
  const [upiMethod, setUpiMethod] = useState<'UPI_ID' | 'QR'>('UPI_ID');
  const [upiId, setUpiId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Card fields state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(300);

  // Strictly encoded, space-free RFC 3986 compliant UPI URI
  const cleanPa = 'payu.bharatmarket@axisbank';
  const cleanPn = encodeURIComponent('BharatMarket').replace(/\+/g, '%20');
  const cleanTn = encodeURIComponent(selectedPlan.name).replace(/\+/g, '%20');
  const cleanAm = Number(selectedPlan.priceInr).toFixed(2);
  const upiUri = `upi://pay?pa=${cleanPa}&pn=${cleanPn}&am=${cleanAm}&cu=INR&tn=${cleanTn}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;

  // Timer for QR code
  useEffect(() => {
    if (mainTab !== 'UPI' || upiMethod !== 'QR' || completedOrder) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [mainTab, upiMethod, completedOrder]);

  const handleCopyUpiLink = () => {
    navigator.clipboard.writeText(upiUri).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Card Number formatter (adds space every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
    setErrorMessage(null);
  };

  // Expiry formatter (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    setExpiry(raw);
    setErrorMessage(null);
  };

  const handlePay = async (paymentType: 'UPI' | 'CARD') => {
    if (paymentType === 'UPI' && upiMethod === 'UPI_ID' && upiId.trim() && !upiId.includes('@')) {
      setErrorMessage('Please enter a valid UPI ID (e.g. 9999999999@payu or name@okhdfcbank)');
      return;
    }
    if (paymentType === 'CARD') {
      const cleanNum = cardNumber.replace(/\s/g, '');
      if (cleanNum.length < 15) { setErrorMessage('Please enter a valid 16-digit card number.'); return; }
      if (!cardName.trim()) { setErrorMessage('Please enter the name on the card.'); return; }
      if (expiry.length < 5) { setErrorMessage('Please enter a valid expiry date (MM/YY).'); return; }
      if (cvv.length < 3) { setErrorMessage('Please enter a valid 3 or 4-digit CVV.'); return; }
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create order on backend configured with safe browser return URL
      const returnUrl = `${window.location.origin}/sell?planning`;
      const order = await paymentsService.createOrder({
        productId: selectedPlan.id,
        purpose: selectedPlan.purpose || 'OTHER',
        returnUrl,
      });

      // 2. Prepare PayU hosted checkout parameters for official sandbox simulator
      const checkoutParams: Record<string, string> = { ...order.checkoutParams };
      if (paymentType === 'UPI') {
        checkoutParams.pg = 'UPI';
        checkoutParams.bankcode = 'UPI';
        if (upiMethod === 'UPI_ID' && upiId.trim()) {
          checkoutParams.vpa = upiId.trim();
        }
      } else if (paymentType === 'CARD') {
        checkoutParams.pg = 'CC';
      }

      // 3. Launch PayU official test simulation checkout
      paymentsService.submitPayUForm(order.checkoutUrl, checkoutParams);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Payment initiation failed.');
      setIsProcessing(false);
    }
  };

  const handleDirectPayU = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const returnUrl = `${window.location.origin}/sell?planning`;
      const order = await paymentsService.createOrder({
        productId: selectedPlan.id,
        purpose: selectedPlan.purpose || 'OTHER',
        returnUrl,
      });
      paymentsService.submitPayUForm(order.checkoutUrl, order.checkoutParams);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to redirect to PayU gateway.');
      setIsProcessing(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="py-6 px-4 text-center space-y-5 animate-in zoom-in-95 fade-in duration-300">
        {/* Animated Celebration Icon with Pulsing Halo */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping duration-1000" />
          <div className="absolute inset-1 rounded-full bg-emerald-500/15 animate-pulse duration-700" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
        </div>

        {/* Success Headline */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Payment Verified & Confirmed</span>
          </div>
          <h3 className="text-2xl font-black text-[#002f34] tracking-tight">
            Listing Credits Activated!
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            ₹{completedOrder.amount} processed successfully via {completedOrder.method}.
          </p>
        </div>

        {/* Receipt Card */}
        <div className="max-w-md mx-auto bg-slate-50/90 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2.5 shadow-2xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Activated Package</span>
            <span className="font-extrabold text-slate-900 text-sm">{completedOrder.planName}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Balance Added</span>
            <span className="font-extrabold text-emerald-700 bg-emerald-100/70 border border-emerald-300/80 px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>+{completedOrder.adsCount} Available {completedOrder.adsCount === 1 ? 'Ad' : 'Ads'}</span>
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Transaction ID</span>
            <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
              {completedOrder.txnId}
            </span>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-1 max-w-md mx-auto space-y-1.5">
          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-[#002f34] hover:bg-[#002f34]/90 text-white font-bold h-11 rounded-xl text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            <span>Continue to Publish Ad</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-[10px] text-slate-400">
            Your ad listing balance has been instantly updated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#002f34] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Plans</span>
        </button>

        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>PayU 256-Bit SSL Checkout</span>
        </span>
      </div>

      {/* Selected Order Summary Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#002f34] text-white flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{selectedPlan.name}</h4>
            <p className="text-xs text-slate-500">
              +{selectedPlan.adsCount} Listings • Valid for {selectedPlan.validityDays} Days
            </p>
          </div>
        </div>

        <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
          <p className="text-[11px] text-slate-400 font-medium">Total Amount</p>
          <p className="text-xl font-black text-[#002f34]">₹{selectedPlan.priceInr}</p>
        </div>
      </div>

      {/* Primary Payment Method Tabs: UPI vs Card */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setMainTab('UPI'); setErrorMessage(null); }}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${mainTab === 'UPI' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Pay with UPI</span>
          </button>
          <button
            type="button"
            onClick={() => { setMainTab('CARD'); setErrorMessage(null); }}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${mainTab === 'CARD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Credit / Debit Card</span>
          </button>
        </div>

        {/* Tab 1: UPI Options */}
        {mainTab === 'UPI' && (
          <div className="space-y-4">
            <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setUpiMethod('UPI_ID'); setErrorMessage(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${upiMethod === 'UPI_ID' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                UPI ID / VPA
              </button>
              <button
                type="button"
                onClick={() => { setUpiMethod('QR'); setErrorMessage(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${upiMethod === 'QR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Scan UPI QR Code
              </button>
            </div>

            {upiMethod === 'UPI_ID' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Virtual Payment Address (VPA) / UPI ID
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => { setUpiId(e.target.value); setErrorMessage(null); }}
                    placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                    className="w-full h-11 px-3.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#002f34] focus:border-transparent bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">PayU Test VPA:</span>
                  <button
                    type="button"
                    onClick={() => { setUpiId('9999999999@payu'); setErrorMessage(null); }}
                    className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold transition cursor-pointer"
                  >
                    9999999999@payu
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUpiId('success@payu'); setErrorMessage(null); }}
                    className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold transition cursor-pointer"
                  >
                    success@payu
                  </button>
                  <span className="ml-1">Handles:</span>
                  {['@payu', '@okhdfcbank', '@paytm', '@ybl', '@okaxis'].map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => {
                        const prefix = upiId.split('@')[0] || 'user';
                        setUpiId(`${prefix}${handle}`);
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                    >
                      {handle}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-slate-400">
                  Powered by PayU Sandbox Simulator. Accepts PayU test VPAs or live handles.
                </div>
              </div>
            ) : (
              /* QR Code Mode — Strictly encoded parameters with no raw spaces */
              <div className="text-center py-2 space-y-3">
                <div className="inline-block p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-xs">
                  <img
                    src={qrImageUrl}
                    alt="PayU UPI QR Code"
                    className="w-40 h-40 mx-auto rounded-lg"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Scan with any UPI app to pay</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Expires in:{' '}
                    <span className="font-mono font-bold text-orange-600">
                      {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyUpiLink}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'UPI Link Copied!' : 'Copy UPI Link'}</span>
                  </button>

                  <Button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handlePay('UPI')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-8 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    )}
                    <span>I Have Sent ₹{selectedPlan.priceInr} (Verify)</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Credit / Debit Card Option */}
        {mainTab === 'CARD' && (
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">PayU Test Sandbox:</span>
              <button
                type="button"
                onClick={() => {
                  setCardNumber('4012 0010 3714 1112');
                  setCardName('Rahul Kumar');
                  setExpiry('05/30');
                  setCvv('123');
                  setErrorMessage(null);
                }}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition cursor-pointer"
              >
                Autofill Test Visa (4012...1112)
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Card Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="4532 •••• •••• 1234"
                  maxLength={19}
                  className="w-full h-11 pl-3.5 pr-20 text-sm font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#002f34] focus:border-transparent bg-white"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <span>Visa</span> • <span>Master</span> • <span>RuPay</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cardholder Name</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => { setCardName(e.target.value); setErrorMessage(null); }}
                placeholder="Full Name as on card"
                className="w-full h-11 px-3.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#002f34] focus:border-transparent bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full h-11 px-3.5 text-sm font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#002f34] focus:border-transparent bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CVV / CVC</label>
                <input
                  type="password"
                  value={cvv}
                  onChange={(e) => { setCvv(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrorMessage(null); }}
                  placeholder="•••"
                  maxLength={4}
                  className="w-full h-11 px-3.5 text-sm font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#002f34] focus:border-transparent bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Your card information is encrypted and never stored on our servers.</span>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <Button
          type="button"
          disabled={isProcessing}
          onClick={() => handlePay(mainTab)}
          className="w-full bg-[#002f34] hover:bg-[#002f34]/90 text-white font-bold h-11 rounded-xl text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting to PayU Test Gateway...</span>
            </>
          ) : (
            <span>
              {mainTab === 'UPI' && upiMethod === 'QR'
                ? `Proceed to Pay ₹${selectedPlan.priceInr} with PayU UPI`
                : `Pay ₹${selectedPlan.priceInr} with PayU (${mainTab === 'CARD' ? 'Card' : 'UPI'})`}
            </span>
          )}
        </Button>

        <button
          type="button"
          disabled={isProcessing}
          onClick={handleDirectPayU}
          className="w-full py-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>Or proceed to PayU Hosted Checkout (All payment methods)</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
