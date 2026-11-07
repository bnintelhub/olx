import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Check,
  Package,
  ArrowRight,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CheckoutStep, CheckoutPlan } from './CheckoutStep';

export interface ExtraPackage extends CheckoutPlan {
  badge?: string;
  subtitle?: string;
  features?: string[];
}

interface PricingUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota?: {
    usedThisMonth: number;
    usedFreeAds?: number;
    freeAdsLimit: number;
    paidAdsBalance?: number;
    totalAvailableListings?: number;
    extraPackages?: any[];
  } | null;
  onPaymentSuccess?: (updatedQuota: any) => void;
}

export const PricingUpgradeModal: React.FC<PricingUpgradeModalProps> = ({
  isOpen,
  onClose,
  quota,
  onPaymentSuccess,
}) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'ONE_TIME' | 'SELLER'>('ONE_TIME');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('extra_15');
  const [view, setView] = useState<'PLANS' | 'CHECKOUT'>('PLANS');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setView('PLANS');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const usedAds = quota?.usedFreeAds ?? Math.min(quota?.usedThisMonth ?? 0, quota?.freeAdsLimit ?? 4);
  const freeLimit = quota?.freeAdsLimit ?? 4;
  const paidBalance = quota?.paidAdsBalance ?? 0;

  // Combine packages guaranteeing test_1 is always present
  const rawPackages = quota?.extraPackages && quota.extraPackages.length > 0 ? quota.extraPackages : [];
  const merged = [...rawPackages];

  if (!merged.some((p: any) => p.id === 'test_1')) {
    merged.unshift({
      id: 'test_1',
      name: '1 Extra Ad',
      adsCount: 1,
      priceInr: 1,
      validityDays: 30,
      badge: 'Testing ₹1',
      description: 'Quick test purchase',
    });
  }
  if (!merged.some((p: any) => p.id === 'extra_5')) {
    merged.push({ id: 'extra_5', name: '5 Extra Ads', adsCount: 5, priceInr: 99, validityDays: 30 });
  }
  if (!merged.some((p: any) => p.id === 'extra_15')) {
    merged.push({ id: 'extra_15', name: '15 Extra Ads', adsCount: 15, priceInr: 199, validityDays: 60, badge: 'Most Popular' });
  }
  if (!merged.some((p: any) => p.id === 'extra_50')) {
    merged.push({ id: 'extra_50', name: '50 Extra Ads', adsCount: 50, priceInr: 499, validityDays: 90 });
  }

  const allOneTimePlans: ExtraPackage[] = merged.map((pkg: any) => ({
    id: pkg.id,
    name: pkg.name.replace(/\(Test ₹1\)/i, '').replace(/Package/i, '').trim(),
    adsCount: pkg.adsCount,
    priceInr: pkg.priceInr,
    validityDays: pkg.validityDays || 30,
    badge: pkg.id === 'test_1' ? 'Testing' : pkg.id === 'extra_15' ? 'Most Popular' : pkg.badge,
    subtitle: pkg.priceInr === 1 ? 'Quick ₹1 test verification' : pkg.adsCount === 15 ? 'Great for regular sellers' : pkg.adsCount === 5 ? 'Best for casual sellers' : 'Best value for power sellers',
    features: [
      `${pkg.adsCount} additional ${pkg.adsCount === 1 ? 'listing' : 'listings'}`,
      `Valid for ${pkg.validityDays || 30} days`,
      pkg.priceInr === 1 ? 'Instant ₹1 test payment' : 'Higher search ranking',
      'Instant live upon submission',
    ],
    purpose: 'OTHER' as const,
  }));

  const testPlan = allOneTimePlans.find((p) => p.id === 'test_1') || allOneTimePlans[0];
  const commercialOneTimePlans = allOneTimePlans.filter((p) => p.id !== 'test_1');

  const sellerPlans: ExtraPackage[] = [
    {
      id: 'pro_seller',
      name: 'Pro Seller',
      adsCount: 50,
      priceInr: 499,
      validityDays: 30,
      badge: 'Popular',
      subtitle: 'For active individual dealers',
      features: ['50 Monthly active ads', '10 Free Boost credits', 'Verified Pro Seller badge', 'Seller analytics'],
      purpose: 'SELLER_SUBSCRIPTION',
    },
    {
      id: 'dealer_plan',
      name: 'Dealer Showcase',
      adsCount: 500,
      priceInr: 1999,
      validityDays: 30,
      badge: 'Dealer',
      subtitle: 'For auto/property brokers',
      features: ['500 Active listings', '50 Boost credits', 'Bulk CSV upload', 'Dealer showcase page'],
      purpose: 'SELLER_SUBSCRIPTION',
    },
    {
      id: 'enterprise_plan',
      name: 'Enterprise',
      adsCount: 9999,
      priceInr: 9999,
      validityDays: 30,
      subtitle: 'For high-volume retail teams',
      features: ['Unlimited listings', 'Direct REST API access', 'Multi-agent accounts', 'Instant auto-moderation'],
      purpose: 'SELLER_SUBSCRIPTION',
    },
  ];

  const currentCards = tab === 'ONE_TIME' ? commercialOneTimePlans : sellerPlans;
  const activePlan = [...allOneTimePlans, ...sellerPlans].find((p) => p.id === selectedPlanId) || commercialOneTimePlans[1];

  const handleSelectTab = (newTab: 'ONE_TIME' | 'SELLER') => {
    setTab(newTab);
    setSelectedPlanId(newTab === 'ONE_TIME' ? 'extra_15' : 'pro_seller');
  };

  const handleCheckoutSuccess = (updatedQuota: any) => {
    if (onPaymentSuccess) {
      onPaymentSuccess(updatedQuota);
    }
  };

  const handleOpenFullPage = () => {
    onClose();
    navigate('/plans?returnUrl=/sell');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="space-y-1.5 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-0.5 rounded-full border border-slate-200">
                Monthly Ad Limit
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>PayU 256-Bit SSL</span>
              </span>
              {paidBalance > 0 && (
                <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-0.5 rounded-full">
                  +{paidBalance} Paid Credits Active
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-[#002f34] tracking-tight">
              {view === 'PLANS' ? 'Choose an Ad Package to Keep Selling' : 'Complete Your Purchase'}
            </h2>

            {view === 'PLANS' && (
              <p className="text-xs text-slate-500">
                {paidBalance > 0
                  ? `Active balance: +${paidBalance} paid ad credits. Select another package below to expand your balance.`
                  : `You have used ${usedAds} of ${freeLimit} free ads for this period. Choose an ad pack below to post more ads immediately.`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenFullPage}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#002f34] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
              title="Open full page view"
            >
              <span>Full Page</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 space-y-5">
          {view === 'CHECKOUT' ? (
            <CheckoutStep
              selectedPlan={activePlan}
              onBack={() => setView('PLANS')}
              onSuccess={handleCheckoutSuccess}
              onClose={onClose}
            />
          ) : (
            <>
              {/* Segmented Control Tabs */}
              <div className="flex justify-center">
                <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 max-w-xs w-full shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('ONE_TIME')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      tab === 'ONE_TIME' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Extra Ad Packs
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('SELLER')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      tab === 'SELLER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Seller Plans</span>
                  </button>
                </div>
              </div>

              {/* Distinct ₹1 Test Plan Banner (Clean & Non-Congested) */}
              {tab === 'ONE_TIME' && testPlan && (
                <div
                  onClick={() => setSelectedPlanId(testPlan.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    selectedPlanId === testPlan.id
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/10'
                      : 'border-blue-200/80 bg-blue-50/30 hover:bg-blue-50/60 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                      ₹1
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-blue-950">1 Rupee Payment Verification Pack</h4>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                          Testing Pack
                        </span>
                      </div>
                      <p className="text-xs text-blue-700/80 mt-0.5">
                        Test PayU UPI, dynamic QR scan, or Card payment with a live ₹1 transaction (+1 listing credit added).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlanId(testPlan.id);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                      selectedPlanId === testPlan.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white hover:bg-blue-50 text-blue-800 border border-blue-300'
                    }`}
                  >
                    {selectedPlanId === testPlan.id ? '✓ Selected (₹1)' : 'Select ₹1 Test'}
                  </button>
                </div>
              )}

              {/* Spacious 3-Column Cards Grid (Zero Congestion) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {currentCards.map((pkg) => {
                  const isSelected = selectedPlanId === pkg.id;
                  const isPopular = pkg.badge === 'Most Popular';

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPlanId(pkg.id)}
                      className={`relative rounded-3xl p-6 transition-all flex flex-col justify-between cursor-pointer border-2 ${
                        isSelected
                          ? 'border-[#002f34] bg-teal-50/20 shadow-md ring-3 ring-[#002f34]/10'
                          : isPopular
                          ? 'border-amber-300 hover:border-amber-400 bg-white shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white shadow-xs'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Top Line */}
                        <div className="flex items-center justify-between min-h-[24px]">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Package
                          </span>
                          {isPopular && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                              Most Popular
                            </span>
                          )}
                        </div>

                        {/* Title & Subtitle */}
                        <div>
                          <h3 className="text-lg font-black text-slate-900 leading-snug">{pkg.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{pkg.subtitle}</p>
                        </div>

                        {/* Price Presentation */}
                        <div className="py-3 my-2 border-y border-slate-100">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-[#002f34]">₹{pkg.priceInr}</span>
                            <span className="text-xs text-slate-400 font-medium">incl. GST</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            ₹{(pkg.priceInr / pkg.adsCount).toFixed(1)} / ad • {pkg.validityDays} days validity
                          </p>
                        </div>

                        {/* Features Checklist */}
                        <ul className="space-y-2 text-xs text-slate-600 pb-2">
                          {pkg.features?.map((feat, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="text-xs font-medium text-slate-700">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Card Action Button */}
                      <div className="pt-4 mt-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanId(pkg.id);
                          }}
                          className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#002f34] text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <span>Select Plan</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Pro Seller Note */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Are you a regular dealer or broker?</h4>
                    <p className="text-xs text-slate-500">Get 50 ads/month + 10 boost credits + verified dealer profile for ₹499/month.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTab('SELLER');
                    setSelectedPlanId('pro_seller');
                  }}
                  className="text-xs font-bold text-[#002f34] hover:underline shrink-0 cursor-pointer"
                >
                  View Seller Plans →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sticky Bottom Bar */}
        {view === 'PLANS' && (
          <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#002f34] flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Selection</p>
                <p className="text-sm font-black text-slate-900">
                  {activePlan.name} • <span className="text-[#002f34]">₹{activePlan.priceInr}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>

              <Button
                type="button"
                onClick={() => setView('CHECKOUT')}
                className="flex-1 sm:flex-none bg-[#002f34] hover:bg-[#002f34]/90 text-white font-bold text-xs h-11 px-6 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Continue to Pay ₹{activePlan.priceInr}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
