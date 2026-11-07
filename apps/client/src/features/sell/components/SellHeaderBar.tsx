import React from 'react';
import { ArrowLeft, Sparkles, Layers, AlertCircle, Plus, ChevronRight } from 'lucide-react';

interface SellHeaderBarProps {
  step: number;
  onBack: () => void;
  quota?: {
    usedThisMonth: number;
    usedFreeAds?: number;
    freeAdsLimit: number;
    paidAdsBalance?: number;
    totalAvailableListings?: number;
    remainingFreeAds?: number;
    isLimitReached?: boolean;
  } | null;
  onOpenPlans: () => void;
}

export const SellHeaderBar: React.FC<SellHeaderBarProps> = ({
  step,
  onBack,
  quota,
  onOpenPlans,
}) => {
  const isPaidActive = (quota?.paidAdsBalance ?? 0) > 0;
  const isLimitReached = Boolean(quota?.isLimitReached);
  const remainingFree = quota?.remainingFreeAds ?? Math.max(0, (quota?.freeAdsLimit ?? 4) - (quota?.usedThisMonth ?? 0));

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
      {/* Left: Back Action & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#002f34] bg-white border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl shadow-2xs transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{step > 1 && step < 5 ? 'Previous Step' : 'Back to Home'}</span>
        </button>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        <h1 className="text-base sm:text-lg font-black text-[#002f34] tracking-tight">
          Post Your Ad
        </h1>
      </div>

      {/* Right: Professional Account Posting Balance Badge */}
      {quota && (
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenPlans}
            className={`group inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs transition cursor-pointer shadow-2xs ${
              isLimitReached
                ? 'bg-amber-50/90 border-amber-300 text-amber-900 hover:bg-amber-100 hover:border-amber-400'
                : isPaidActive
                ? 'bg-white border-emerald-200 hover:border-emerald-300 text-slate-800 hover:shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:shadow-xs'
            }`}
          >
            {isLimitReached ? (
              /* State 1: Limit Exhausted */
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-bold">
                  Limit Reached ({quota.freeAdsLimit}/{quota.freeAdsLimit})
                </span>
                <span className="inline-flex items-center text-[10px] font-extrabold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                  Upgrade
                </span>
              </>
            ) : isPaidActive ? (
              /* State 2: Active Paid Balance (Clean, high-trust badge) */
              <>
                <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 stroke-[2.5]" />
                </div>
                <div className="text-left leading-tight">
                  <span className="font-extrabold text-slate-900 text-xs">
                    {quota.paidAdsBalance} Paid {quota.paidAdsBalance === 1 ? 'Ad' : 'Ads'} Available
                  </span>
                </div>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md group-hover:bg-emerald-100 transition">
                  <Plus className="w-2.5 h-2.5" />
                  <span>Add More</span>
                </span>
              </>
            ) : (
              /* State 3: Free Quota */
              <>
                <div className="w-5 h-5 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Layers className="w-3 h-3" />
                </div>
                <div className="text-left leading-tight">
                  <span className="font-bold text-slate-800 text-xs">
                    {remainingFree} of {quota.freeAdsLimit} Free Ads Left
                  </span>
                </div>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md group-hover:text-slate-800 transition">
                  <span>Plans</span>
                  <ChevronRight className="w-2.5 h-2.5" />
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

