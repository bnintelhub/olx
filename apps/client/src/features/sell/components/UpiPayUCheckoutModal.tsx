import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Smartphone,
  ExternalLink,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paymentsService, PaymentOrderResponse } from '@/features/payments/service/payments.service';
import { apiClient } from '@/lib/api-client';

interface UpiPayUCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: {
    id: string;
    name: string;
    priceInr: number;
    adsCount: number;
    validityDays: number;
    purpose?: 'OTHER' | 'SELLER_SUBSCRIPTION';
  };
  onSuccess: (updatedQuota: any) => void;
}

export const UpiPayUCheckoutModal: React.FC<UpiPayUCheckoutModalProps> = ({
  isOpen,
  onClose,
  selectedPlan,
  onSuccess,
}) => {
  const [method, setMethod] = useState<'UPI_ID' | 'QR'>('UPI_ID');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(300);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCountdown(300);
      setErrorMessage(null);
      setCompletedOrder(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Timer for QR code
  useEffect(() => {
    if (!isOpen || method !== 'QR' || completedOrder) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, method, completedOrder]);

  if (!isOpen) return null;

  const handlePayUpi = async () => {
    if (method === 'UPI_ID' && !upiId.includes('@')) {
      setErrorMessage('Please enter a valid UPI ID (e.g. mobile@upi or name@okhdfcbank)');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create order on backend
      const order = await paymentsService.createOrder({
        productId: selectedPlan.id,
        purpose: selectedPlan.purpose || 'OTHER',
      });

      // 2. Verify / settle payment via PayU
      const verifyRes = await paymentsService.verifyPayment(order.paymentOrderId);

      if (verifyRes.status === 'SUCCESS') {
        // 3. Fetch refreshed quota
        const quotaRes = await apiClient.get('/revenue/quota');
        setCompletedOrder({
          txnId: verifyRes.transactionId,
          amount: verifyRes.amount,
          planName: selectedPlan.name,
          adsCount: selectedPlan.adsCount,
        });

        if (quotaRes.data?.success) {
          onSuccess(quotaRes.data.data);
        }
      } else {
        setErrorMessage(verifyRes.message || 'Payment could not be completed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct PayU Hosted Checkout redirect
  const handleDirectPayU = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const order = await paymentsService.createOrder({
        productId: selectedPlan.id,
        purpose: selectedPlan.purpose || 'OTHER',
      });
      paymentsService.submitPayUForm(order.checkoutUrl, order.checkoutParams);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to redirect to PayU gateway.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900">Pay with UPI</h3>
              <p className="text-xs text-slate-500">PayU 256-bit Encrypted Checkout</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {completedOrder ? (
            /* Success State */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-extrabold text-slate-900">Payment Successful!</h4>
                <p className="text-sm text-slate-600">
                  ₹{completedOrder.amount} paid via PayU UPI Gateway
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-mono font-bold text-slate-800">{completedOrder.txnId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan Activated:</span>
                  <span className="font-bold text-slate-800">{completedOrder.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Credits Added:</span>
                  <span className="font-bold text-emerald-600">+{completedOrder.adsCount} Ads Balance</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={onClose}
                className="w-full bg-[#002f34] hover:bg-[#002f34]/90 text-white font-bold h-11 rounded-xl"
              >
                Continue to Publish Ad
              </Button>
            </div>
          ) : (
            /* Checkout Form */
            <>
              {/* Order Summary Pill */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Details</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedPlan.name}</p>
                  <p className="text-xs text-slate-500">+{selectedPlan.adsCount} Listings • {selectedPlan.validityDays} Days Validity</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total Payable</p>
                  <p className="text-xl font-extrabold text-[#002f34]">₹{selectedPlan.priceInr}</p>
                </div>
              </div>

              {/* UPI Sub-Tabs */}
              <div className="space-y-3">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setMethod('UPI_ID'); setErrorMessage(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                      method === 'UPI_ID'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>UPI ID / VPA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMethod('QR'); setErrorMessage(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                      method === 'QR'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan QR Code</span>
                  </button>
                </div>

                {/* Method 1: Enter UPI ID */}
                {method === 'UPI_ID' ? (
                  <div className="space-y-3 pt-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Enter UPI ID / Virtual Payment Address (VPA)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => { setUpiId(e.target.value); setErrorMessage(null); }}
                        placeholder="e.g. mobile@upi or username@okhdfcbank"
                        className="w-full h-11 px-3.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#002f34] focus:border-transparent"
                      />
                    </div>

                    {/* Quick Handle Suggestions */}
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                      <span className="text-slate-400 self-center">Popular:</span>
                      {['@okaxis', '@okhdfcbank', '@paytm', '@ybl', '@ibl'].map((handle) => (
                        <button
                          key={handle}
                          type="button"
                          onClick={() => {
                            const base = upiId.split('@')[0] || 'user';
                            setUpiId(`${base}${handle}`);
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                        >
                          {handle}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
                      <span>Supported Apps:</span>
                      <span className="font-semibold text-slate-700">Google Pay • PhonePe • Paytm • BHIM • Cred</span>
                    </div>
                  </div>
                ) : (
                  /* Method 2: Scan QR */
                  <div className="text-center py-3 space-y-3">
                    <div className="inline-block p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-xs">
                      {/* Generates standard UPI QR format string */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          `upi://pay?pa=payu.bharatmarket@axisbank&pn=BharatMarket&am=${selectedPlan.priceInr}&cu=INR&tn=${selectedPlan.name}`
                        )}`}
                        alt="PayU UPI QR Code"
                        className="w-44 h-44 mx-auto rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">Scan with any UPI App</p>
                      <p className="text-[11px] text-slate-500">
                        Code expires in: <span className="font-mono font-bold text-orange-600">
                          {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                        </span>
                      </p>
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
                  onClick={handlePayUpi}
                  className="w-full bg-[#002f34] hover:bg-[#002f34]/90 text-white font-bold h-11 rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Contacting PayU UPI Gateway...</span>
                    </>
                  ) : (
                    <span>Pay ₹{selectedPlan.priceInr} via UPI</span>
                  )}
                </Button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleDirectPayU}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Or use PayU Hosted Checkout (Cards / NetBanking)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Trust Footer */}
              <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>PayU Certified Merchant • End-to-end Encrypted</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

