import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Package,
  Briefcase,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { CheckoutStep, CheckoutPlan } from '@/features/sell/components/CheckoutStep';

export interface PlanItem extends CheckoutPlan {
  badge?: string;
  subtitle: string;
  features: string[];
}

export const PlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/sell';
  const { user } = useAuthStore();

  const [tab, setTab] = useState<'ONE_TIME' | 'SELLER'>('ONE_TIME');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('extra_15');
  const [quota, setQuota] = useState<any | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<{ type: 'success' | 'error'; message: string; txnId?: string } | null>(null);

  const paymentStatus = searchParams.get('status');

  useEffect(() => {
    if (paymentStatus === 'success') {
      const txnId = searchParams.get('txnId') || undefined;
      setPaymentBanner({
        type: 'success',
        message: 'Payment completed successfully via PayU! Your listing credits have been activated.',
        txnId,
      });
      setIsCheckingOut(false);
      apiClient.get('/revenue/quota').then((res) => {
        if (res.data?.success) setQuota(res.data.data);
      }).catch(() => {});
      const next = new URLSearchParams(searchParams);
      next.delete('status');
      next.delete('txnId');
      next.delete('orderId');
      const rest = next.toString();
      navigate({ pathname: '/plans', search: rest ? `?${rest}` : '' }, { replace: true });
    } else if (paymentStatus === 'failed') {
      setPaymentBanner({
        type: 'error',
        message: 'Payment was cancelled or failed with PayU. Please try again.',
      });
      const next = new URLSearchParams(searchParams);
      next.delete('status');
      next.delete('txnId');
      next.delete('orderId');
      const rest = next.toString();
      navigate({ pathname: '/plans', search: rest ? `?${rest}` : '' }, { replace: true });
    }
  }, [paymentStatus]);

  useEffect(() => {
    if (user) {
      apiClient.get('/revenue/quota').then((res) => {
        if (res.data?.success) setQuota(res.data.data);
      }).catch(() => {});
    }
  }, [user]);

  const oneTimePlans: PlanItem[] = [
    {
      id: 'test_1',
      name: '1 Extra Ad',
      adsCount: 1,
      priceInr: 1,
      validityDays: 30,
      badge: 'Test ₹1',
      subtitle: 'Instant test purchase for ₹1',
      features: ['1 additional ad listing', 'Valid for 30 days', 'Instant ₹1 payment verification', 'Live ad activation'],
      purpose: 'OTHER',
    },
    {
      id: 'extra_5',
      name: '5 Extra Ads',
      adsCount: 5,
      priceInr: 99,
      validityDays: 30,
      subtitle: 'Best for casual individual sellers',
      features: ['5 additional ad listings', 'Valid for 30 days', 'Standard search visibility', 'Direct buyer chats'],
      purpose: 'OTHER',
    },
    {
      id: 'extra_15',
      name: '15 Extra Ads',
      adsCount: 15,
      priceInr: 199,
      validityDays: 60,
      badge: 'Most Popular',
      subtitle: 'Great for regular active sellers',
      features: ['15 additional ad listings', 'Valid for 60 days', 'Enhanced search placement', 'Priority moderation review'],
      purpose: 'OTHER',
    },
    {
      id: 'extra_50',
      name: '50 Extra Ads',
      adsCount: 50,
      priceInr: 499,
      validityDays: 90,
      subtitle: 'Best value for frequent power sellers',
      features: ['50 additional ad listings', 'Valid for 90 days', 'Top tier search placement', 'Dedicated seller support'],
      purpose: 'OTHER',
    },
  ];

  const sellerPlans: PlanItem[] = [
    {
      id: 'pro_seller',
      name: 'Pro Seller',
      adsCount: 50,
      priceInr: 499,
      validityDays: 30,
      badge: 'Popular',
      subtitle: 'For independent brokers & dealers',
      features: ['50 Monthly active ads', '10 Free Boost credits', 'Verified Pro Seller badge', 'Detailed inquiry analytics'],
      purpose: 'SELLER_SUBSCRIPTION',
    },
    {
      id: 'dealer_plan',
      name: 'Dealer Showcase',
      adsCount: 500,
      priceInr: 1999,
      validityDays: 30,
      badge: 'Dealer',
      subtitle: 'For auto dealerships & property agents',
      features: ['500 Active listings', '50 Boost credits', 'Bulk CSV upload tool', 'Custom branded dealer page'],
      purpose: 'SELLER_SUBSCRIPTION',
    },
    {
      id: 'enterprise_plan',
      name: 'Enterprise Plan',
      adsCount: 9999,
      priceInr: 9999,
      validityDays: 30,
      subtitle: 'For retail franchises & high-volume teams',
      features: ['Unlimited listings', 'Direct REST API integration', 'Multi-agent staff accounts', 'Instant auto-approval'],
      purpose: 'SELLER_SUBSCRIPTION',
    },
  ];

  const currentPlans = tab === 'ONE_TIME' ? oneTimePlans : sellerPlans;
  const activePlan = currentPlans.find((p) => p.id === selectedPlanId) || currentPlans[0];

  const handleSelectTab = (newTab: 'ONE_TIME' | 'SELLER') => {
    setTab(newTab);
    setSelectedPlanId(newTab === 'ONE_TIME' ? 'extra_15' : 'pro_seller');
    setIsCheckingOut(false);
  };

  const handlePaymentSuccess = (updatedQuota: any) => {
    setQuota(updatedQuota);
  };

  return (
    <div className="min-h-screen bg-[#F5F7F8] py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Back Action */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(returnUrl)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#002f34] bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-xl shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Selling</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official PayU Payment Gateway</span>
            </span>
          </div>
        </div>

        {/* Hero Title & Live Balance */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
              Marketplace Ad Plans
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#002f34] tracking-tight">
              Publish More Ads & Boost Your Reach
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Exceeded your free monthly quota? Pick an affordable ad package or test our seamless payment flow for just ₹1.
            </p>
          </div>

          {quota && (
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 w-full md:w-auto shrink-0 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Account Status</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#002f34]">
                  {quota.paidAdsBalance > 0 ? `+${quota.paidAdsBalance}` : `${quota.remainingFreeAds ?? 0}`}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {quota.paidAdsBalance > 0 ? 'Paid Ads Available' : `of ${quota.freeAdsLimit} Free Ads Left`}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Used this month: {quota.usedThisMonth} ads
              </div>
            </div>
          )}
        </div>

        {paymentBanner && (
          <div
            className={`flex items-center justify-between p-4 rounded-2xl border text-xs animate-in fade-in duration-200 ${
              paymentBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {paymentBanner.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              )}
              <div>
                <p className="font-bold">{paymentBanner.message}</p>
                {paymentBanner.txnId && (
                  <p className="text-[11px] text-emerald-700/80 mt-0.5 font-mono">
                    Transaction ID: {paymentBanner.txnId}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPaymentBanner(null)}
              className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Checkout View or Plans Grid */}
        {isCheckingOut ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-3xl mx-auto">
            <CheckoutStep
              selectedPlan={activePlan}
              onBack={() => setIsCheckingOut(false)}
              onSuccess={handlePaymentSuccess}
              onClose={() => navigate(returnUrl)}
            />
          </div>
        ) : (
          <>
            {/* Segmented Control */}
            <div className="flex justify-center">
              <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-1 max-w-sm w-full shadow-inner">
                <button
                  type="button"
                  onClick={() => handleSelectTab('ONE_TIME')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    tab === 'ONE_TIME' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Extra Ad Packs
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTab('SELLER')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    tab === 'SELLER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Dealer Subscriptions</span>
                </button>
              </div>
            </div>

            {/* Distinct ₹1 Test Plan Banner */}
            {tab === 'ONE_TIME' && (
              <div
                onClick={() => setSelectedPlanId('test_1')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  selectedPlanId === 'test_1'
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/10'
                    : 'border-blue-200/80 bg-blue-50/30 hover:bg-blue-50/60 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    ₹1
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-blue-950">1 Rupee Payment Verification Pack</h4>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                        Testing Pack
                      </span>
                    </div>
                    <p className="text-xs text-blue-700/80 mt-0.5">
                      Verify our PayU UPI, QR scan, or Card payment pipeline with a live ₹1 transaction (+1 listing credit added).
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlanId('test_1');
                    setIsCheckingOut(true);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    selectedPlanId === 'test_1'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      : 'bg-white hover:bg-blue-50 text-blue-800 border border-blue-300'
                  }`}
                >
                  {selectedPlanId === 'test_1' ? 'Pay ₹1 Now →' : 'Select ₹1 Test'}
                </Button>
              </div>
            )}

            {/* Spacious Cards Grid (3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(tab === 'ONE_TIME' ? oneTimePlans.filter((p) => p.id !== 'test_1') : sellerPlans).map((pkg) => {
                const isSelected = selectedPlanId === pkg.id;
                const isPopular = pkg.badge === 'Most Popular';

                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPlanId(pkg.id)}
                    className={`relative rounded-3xl p-6 sm:p-7 transition-all flex flex-col justify-between cursor-pointer border-2 ${
                      isSelected
                        ? 'border-[#002f34] bg-white shadow-xl ring-4 ring-[#002f34]/10'
                        : isPopular
                        ? 'border-amber-300 hover:border-amber-400 bg-white shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white shadow-xs'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Top Label */}
                      <div className="flex items-center justify-between min-h-[24px]">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Package
                        </span>
                        {isPopular && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                            Most Popular
                          </span>
                        )}
                      </div>

                      {/* Title & Subtitle */}
                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-snug">{pkg.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pkg.subtitle}</p>
                      </div>

                      {/* Price Section */}
                      <div className="py-3.5 my-2 border-y border-slate-100">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-[#002f34]">₹{pkg.priceInr}</span>
                          <span className="text-xs text-slate-400 font-medium">incl. GST</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          ₹{(pkg.priceInr / pkg.adsCount).toFixed(1)} / ad • {pkg.validityDays} days validity
                        </p>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2.5 text-xs text-slate-600 pb-2">
                        {pkg.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-xs font-medium text-slate-700">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <div className="pt-5 mt-auto">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlanId(pkg.id);
                          setIsCheckingOut(true);
                        }}
                        className={`w-full py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#002f34] hover:bg-[#002f34]/90 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <span>Pay ₹{pkg.priceInr} Now</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <span>Select Plan</span>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Bar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#002f34] flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Selected Package</p>
                  <p className="text-base font-black text-slate-900">
                    {activePlan.name} • <span className="text-[#002f34]">₹{activePlan.priceInr}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate(returnUrl)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  Return to Sell Form
                </button>

                <Button
                  type="button"
                  onClick={() => setIsCheckingOut(true)}
                  className="flex-1 sm:flex-none bg-[#002f34] hover:bg-[#002f34]/90 text-white font-bold text-xs h-11 px-6 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Proceed to Pay ₹{activePlan.priceInr}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-slate-400" />
                <h3 className="text-base font-black text-slate-900">Frequently Asked Questions</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs text-slate-600">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800">How does the ₹1 test plan work?</h4>
                  <p className="leading-relaxed">
                    The ₹1 plan adds 1 listing credit instantly to test our PayU UPI, QR code, and card payment workflows with minimal real money.
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800">When will my ad go live?</h4>
                  <p className="leading-relaxed">
                    Immediately upon successful payment, your account balance is credited and your ad enters active status or moderation review right away.
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800">What payment methods are supported?</h4>
                  <p className="leading-relaxed">
                    We accept UPI (GPay, PhonePe, Paytm, BHIM), dynamic QR scan, and Credit/Debit cards (Visa, Mastercard, RuPay) via PayU.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

