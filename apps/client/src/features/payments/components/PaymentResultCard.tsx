import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { AlertCircle, ArrowRight, Check, CheckCircle2, RotateCcw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentResultCardProps {
  type: 'success' | 'error';
  title?: string;
  message: string;
  txnId?: string;
  amount?: number;
  method?: string;
  planName?: string;
  adsCount?: number;
  onContinue?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export const PaymentResultCard: React.FC<PaymentResultCardProps> = ({
  type,
  title,
  message,
  txnId,
  amount,
  method,
  planName,
  adsCount,
  onContinue,
  onRetry,
  onDismiss,
  compact = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isSuccess = type === 'success';

  useLayoutEffect(() => {
    if (!cardRef.current) return;

    // Success cards celebrate while failure cards provide a clear, subtle shake cue.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set([cardRef.current, iconRef.current, contentRef.current], { clearProps: 'all' });
      return;
    }

    const card = cardRef.current;
    const icon = iconRef.current;
    const content = contentRef.current;
    const particles = card.querySelectorAll('[data-confetti]');
    const ctx = gsap.context(() => {
      gsap.timeline()
        .fromTo(card, { opacity: 0, y: 24, scale: 0.96 }, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'power3.out',
        })
        .fromTo(icon, { scale: 0, rotation: isSuccess ? -18 : 8 }, {
          scale: 1,
          rotation: 0,
          duration: 0.55,
          ease: 'back.out(1.9)',
        }, '-=0.28')
        .fromTo(content ? content.children : [], { opacity: 0, y: 12 }, {
          opacity: 1,
          y: 0,
          duration: 0.38,
          stagger: 0.07,
          ease: 'power2.out',
        }, '-=0.24');

      if (isSuccess) {
        gsap.to(icon, {
          boxShadow: '0 18px 38px rgba(16, 185, 129, 0.28)',
          duration: 0.8,
          yoyo: true,
          repeat: 1,
          ease: 'power1.inOut',
        });
        gsap.fromTo(particles, {
          opacity: 1,
          scale: 0,
          x: 0,
          y: 0,
        }, {
          opacity: 0,
          scale: 1,
          x: () => gsap.utils.random(-82, 82),
          y: () => gsap.utils.random(-74, 44),
          rotation: () => gsap.utils.random(-180, 180),
          duration: () => gsap.utils.random(0.7, 1.25),
          stagger: 0.025,
          ease: 'power2.out',
        });
      } else {
        gsap.fromTo(icon, { x: 0 }, {
          x: 7,
          duration: 0.07,
          repeat: 5,
          yoyo: true,
          ease: 'power1.inOut',
        });
      }
    }, card);

    return () => ctx.revert();
  }, [type, isSuccess]);

  const successTitle = title || 'Payment successful';
  const failureTitle = title || 'Payment unsuccessful';

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-3xl border text-center ${
        compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'
      } ${
        isSuccess
          ? 'border-emerald-200 bg-[linear-gradient(145deg,#ffffff_0%,#f0fdf4_58%,#ecfeff_100%)]'
          : 'border-rose-200 bg-[linear-gradient(145deg,#ffffff_0%,#fff1f2_58%,#fff7ed_100%)]'
      }`}
    >
      {isSuccess && (
        <div className="pointer-events-none absolute inset-x-0 top-2 h-24" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              data-confetti
              className="absolute left-1/2 top-10 h-2 w-1 rounded-full"
              style={{
                backgroundColor: ['#10b981', '#14b8a6', '#f59e0b', '#38bdf8'][index % 4],
                transform: `rotate(${index * 30}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white/85 text-slate-400 transition hover:text-slate-700 cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="relative mx-auto mb-5 h-20 w-20" ref={iconRef}>
        <div className={`absolute inset-0 rounded-full ${isSuccess ? 'bg-emerald-400/20' : 'bg-rose-400/20'}`} />
        <div className={`absolute inset-2 grid place-items-center rounded-full shadow-lg ${
          isSuccess
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/25'
            : 'bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-600/25'
        }`}>
          {isSuccess
            ? <CheckCircle2 className="h-9 w-9 text-white stroke-[2.4]" />
            : <AlertCircle className="h-9 w-9 text-white stroke-[2.4]" />}
        </div>
      </div>

      <div ref={contentRef} className="relative space-y-3">
        <div className={`mx-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${
          isSuccess
            ? 'border-emerald-200 bg-white/80 text-emerald-700'
            : 'border-rose-200 bg-white/80 text-rose-700'
        }`}>
          {isSuccess ? <Sparkles className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {isSuccess ? 'Transaction confirmed' : 'Transaction declined'}
        </div>

        <h3 className="text-2xl font-black tracking-tight text-[#002f34] sm:text-3xl">
          {isSuccess ? successTitle : failureTitle}
        </h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600">{message}</p>

        {txnId && (
          <div className="mx-auto flex max-w-md items-center justify-between rounded-xl border border-slate-200/80 bg-white/75 px-3.5 py-2.5 text-xs">
            <span className="font-medium text-slate-500">Transaction ID</span>
            <span className="font-mono font-bold text-slate-800">{txnId}</span>
          </div>
        )}

        {isSuccess && (planName || adsCount || amount) && (
          <div className="mx-auto max-w-md space-y-2 rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left text-xs">
            {planName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Package</span>
                <span className="font-bold text-slate-900">{planName}</span>
              </div>
            )}
            {typeof amount === 'number' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Amount paid</span>
                <span className="font-bold text-slate-900">₹{amount.toLocaleString('en-IN')}{method ? ` via ${method}` : ''}</span>
              </div>
            )}
            {typeof adsCount === 'number' && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-500">Listing credits</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-extrabold text-emerald-700">
                  <Check className="h-3 w-3 stroke-[3]" />
                  +{adsCount} {adsCount === 1 ? 'ad' : 'ads'}
                </span>
              </div>
            )}
          </div>
        )}

        {(onContinue || onRetry) && (
          <Button
            type="button"
            onClick={isSuccess ? onContinue : onRetry}
            className={`mx-auto mt-2 h-11 rounded-xl px-6 font-bold text-white ${
              isSuccess
                ? 'bg-[#002f34] hover:bg-[#003d44]'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSuccess ? (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Try payment again
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
