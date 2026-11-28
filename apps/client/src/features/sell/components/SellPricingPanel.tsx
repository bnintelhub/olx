import React, { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowRight, Check, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CheckoutStep, CheckoutPlan } from './CheckoutStep';

interface SellPricingPanelProps {
  quota?: {
    usedThisMonth: number;
    usedFreeAds?: number;
    freeAdsLimit: number;
    paidAdsBalance?: number;
    remainingFreeAds?: number;
    extraPackages?: Array<{
      id: string;
      name: string;
      adsCount: number;
      priceInr: number;
      validityDays?: number;
      badge?: string;
    }>;
  } | null;
  onClose: () => void;
  onPaymentSuccess: (quota: any) => void;
}

export const SellPricingPanel: React.FC<SellPricingPanelProps> = ({
  quota,
  onClose,
  onPaymentSuccess,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'ONE_TIME' | 'SELLER'>('ONE_TIME');
  const [selectedPlanId, setSelectedPlanId] = useState('extra_15');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useLayoutEffect(() => {
    if (!panelRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.timeline()
        .fromTo(panelRef.current, { opacity: 0, y: 18, scale: 0.985 }, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.48,
          ease: 'power3.out',
        })
        .fromTo('[data-pricing-reveal]', { opacity: 0, y: 12 }, {
          opacity: 1,
          y: 0,
          duration: 0.38,
          stagger: 0.055,
          ease: 'power2.out',
        }, '-=0.28');
    }, panelRef);

    return () => ctx.revert();
  }, []);

  const oneTimePlans: CheckoutPlan[] = [
    { id: 'test_1', name: '1 Extra Ad', adsCount: 1, priceInr: 1, validityDays: 30, purpose: 'OTHER' },
    { id: 'extra_5', name: '5 Extra Ads', adsCount: 5, priceInr: 99, validityDays: 30, purpose: 'OTHER' },
    { id: 'extra_15', name: '15 Extra Ads', adsCount: 15, priceInr: 199, validityDays: 60, purpose: 'OTHER' },
    { id: 'extra_50', name: '50 Extra Ads', adsCount: 50, priceInr: 499, validityDays: 90, purpose: 'OTHER' },
  ];
  const sellerPlans: CheckoutPlan[] = [
    { id: 'pro_seller', name: 'Pro Seller', adsCount: 50, priceInr: 499, validityDays: 30, purpose: 'SELLER_SUBSCRIPTION' },
    { id: 'dealer_plan', name: 'Dealer Showcase', adsCount: 500, priceInr: 1999, validityDays: 30, purpose: 'SELLER_SUBSCRIPTION' },
  ];

  const plans = tab === 'ONE_TIME' ? oneTimePlans : sellerPlans;
  const activePlan = plans.find((plan) => plan.id === selectedPlanId) || plans[0];
  const usedAds = quota?.usedFreeAds ?? Math.min(quota?.usedThisMonth ?? 0, quota?.freeAdsLimit ?? 4);
  const paidBalance = quota?.paidAdsBalance ?? 0;

  // Wait for the exit animation before removing the inline pricing panel.
  const handleClose = () => {
    if (!panelRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    gsap.to(panelRef.current, {
      opacity: 0,
      y: 10,
      scale: 0.985,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: onClose,
    });
  };

  const selectTab = (nextTab: 'ONE_TIME' | 'SELLER') => {
    setTab(nextTab);
    setSelectedPlanId(nextTab === 'ONE_TIME' ? 'extra_15' : 'pro_seller');
    setIsCheckingOut(false);
  };

  const mainPlans = plans.filter((plan) => plan.id !== 'test_1');
  const testPlan = oneTimePlans.find((plan) => plan.id === 'test_1');

  return (
    <div
      ref={panelRef}
      className="overflow-hidden rounded-2xl border border-[#E5EAED] bg-white shadow-xs"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[#E5EAED] px-5 py-5 sm:px-8">
        <div data-pricing-reveal>
          <h2 className="text-xl font-semibold tracking-tight text-[#002f34] sm:text-2xl">
            Listing plans &amp; ad credits
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {paidBalance > 0
              ? `${paidBalance} paid listing credits available on your account.`
              : `You have used ${usedAds} of ${quota?.freeAdsLimit ?? 4} free monthly ads.`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close plans"
          title="Close plans"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5EAED] text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-[#002f34] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isCheckingOut ? (
        <div className="p-5 sm:p-8">
          <CheckoutStep
            selectedPlan={activePlan}
            onBack={() => setIsCheckingOut(false)}
            onSuccess={onPaymentSuccess}
            onClose={handleClose}
          />
        </div>
      ) : (
        <div className="space-y-6 p-5 sm:p-8">
          {/* Plan Type Switcher */}
          <div data-pricing-reveal className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg bg-[#F2F4F5] p-1">
              {(['ONE_TIME', 'SELLER'] as const).map((nextTab) => (
                <button
                  key={nextTab}
                  type="button"
                  onClick={() => selectTab(nextTab)}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition cursor-pointer ${
                    tab === nextTab
                      ? 'bg-white text-[#002f34] shadow-2xs'
                      : 'text-slate-600 hover:text-[#002f34]'
                  }`}
                >
                  {nextTab === 'ONE_TIME' ? 'Extra ad packs' : 'Seller plans'}
                </button>
              ))}
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              PayU verified checkout
            </span>
          </div>

          {/* Balanced Plan Cards Grid */}
          <div
            data-pricing-reveal
            className={`grid gap-4 ${
              mainPlans.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            }`}
          >
            {mainPlans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const perAd = Math.max(1, Math.round(plan.priceInr / plan.adsCount));

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative flex flex-col justify-between rounded-xl border p-5 text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-[#002f34] bg-[#F4F8F7] ring-1 ring-[#002f34]'
                      : 'border-[#E5EAED] bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#002f34]">{plan.name}</span>
                      {isSelected ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#002f34] text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : plan.id === 'extra_15' ? (
                        <span className="text-[11px] font-medium text-teal-700">Best value</span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-2xl font-semibold tabular-nums text-[#002f34]">
                        ₹{plan.priceInr}
                      </span>
                      <span className="text-xs tabular-nums text-slate-500">
                        ~₹{perAd} / ad
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#E5EAED] pt-3 flex items-center justify-between text-xs text-slate-500">
                    <span className="tabular-nums">{plan.adsCount} ad credits</span>
                    <span className="tabular-nums">{plan.validityDays} days</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Compact Payment Verification Option */}
          {tab === 'ONE_TIME' && testPlan && (
            <button
              data-pricing-reveal
              type="button"
              onClick={() => setSelectedPlanId(testPlan.id)}
              className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                selectedPlanId === testPlan.id
                  ? 'border-[#002f34] bg-[#F4F8F7] ring-1 ring-[#002f34]'
                  : 'border-dashed border-slate-300 bg-[#FAFAFA] hover:border-slate-400'
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#002f34]">
                  Single ad test pack — <span className="tabular-nums">1 credit for ₹{testPlan.priceInr}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  For quick payment verification ({testPlan.validityDays} days validity)
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold tabular-nums text-[#002f34]">₹{testPlan.priceInr}</span>
                {selectedPlanId === testPlan.id && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#002f34] text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
            </button>
          )}

          {/* Checkout Summary Footer */}
          <div
            data-pricing-reveal
            className="flex flex-col gap-3 border-t border-[#E5EAED] pt-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="text-xs text-slate-600">
              Selected: <span className="font-semibold text-[#002f34]">{activePlan.name}</span>{' '}
              <span className="tabular-nums text-slate-500">
                (₹{activePlan.priceInr} · {activePlan.validityDays} days)
              </span>
            </div>
            <Button
              type="button"
              onClick={() => setIsCheckingOut(true)}
              className="h-11 rounded-lg bg-[#002f34] px-6 text-sm font-medium text-white hover:bg-[#003d44] cursor-pointer"
            >
              Continue to checkout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
