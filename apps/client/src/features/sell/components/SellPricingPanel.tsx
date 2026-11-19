import React, { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowLeft, ArrowRight, Briefcase, Check, Package, ShieldCheck, Sparkles } from 'lucide-react';
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

  return (
    <div
      ref={panelRef}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-32px_rgba(15,23,42,0.38)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-8">
        <div data-pricing-reveal>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
              <Package className="h-3 w-3" /> Marketplace plans
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Secure PayU checkout
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-[#002f34] sm:text-2xl">
            Keep your listing momentum
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {paidBalance > 0
              ? `Your account has ${paidBalance} paid listing credits available.`
              : `You have used ${usedAds} of ${quota?.freeAdsLimit ?? 4} free monthly ads.`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-[#002f34] cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back to ad</span>
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
        <div className="space-y-5 p-5 sm:p-8">
          <div data-pricing-reveal className="mx-auto flex max-w-sm rounded-2xl bg-slate-100 p-1">
            {(['ONE_TIME', 'SELLER'] as const).map((nextTab) => (
              <button
                key={nextTab}
                type="button"
                onClick={() => selectTab(nextTab)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                  tab === nextTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {nextTab === 'ONE_TIME' ? 'Extra ad packs' : (
                  <span className="inline-flex items-center justify-center gap-1.5"><Briefcase className="h-3 w-3" /> Seller plans</span>
                )}
              </button>
            ))}
          </div>

          {tab === 'ONE_TIME' && (
            <button
              data-pricing-reveal
              type="button"
              onClick={() => setSelectedPlanId('test_1')}
              className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition cursor-pointer ${
                selectedPlanId === 'test_1'
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10'
                  : 'border-blue-200 bg-blue-50/40 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-sm">₹1</span>
                <div>
                  <div className="flex items-center gap-2 text-sm font-black text-blue-950">
                    Quick payment verification
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] uppercase tracking-wider">Test pack</span>
                  </div>
                  <p className="mt-1 text-xs text-blue-700">Activate 1 extra ad instantly</p>
                </div>
              </div>
              {selectedPlanId === 'test_1' && <Check className="h-5 w-5 text-blue-600" />}
            </button>
          )}

          <div data-pricing-reveal className="grid gap-3 sm:grid-cols-2">
            {plans.filter((plan) => plan.id !== 'test_1').map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`relative rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                  selectedPlanId === plan.id
                    ? 'border-[#002f34] bg-[#f8faf9] shadow-[0_10px_30px_-20px_rgba(0,47,52,0.55)] ring-2 ring-[#002f34]/10'
                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {plan.id === 'extra_15' && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-700">
                    <Sparkles className="h-3 w-3" /> Popular
                  </span>
                )}
                <p className="text-sm font-black text-slate-900">{plan.name}</p>
                <p className="mt-1 text-xs text-slate-500">{plan.adsCount} listing credits</p>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-xl font-black text-[#002f34]">₹{plan.priceInr}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{plan.validityDays} days</span>
                </div>
              </button>
            ))}
          </div>

          <Button
            data-pricing-reveal
            type="button"
            onClick={() => setIsCheckingOut(true)}
            className="h-12 w-full rounded-xl bg-[#002f34] text-sm font-bold text-white shadow-lg shadow-teal-950/10 hover:bg-[#003d44]"
          >
            Continue with {activePlan.name}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
