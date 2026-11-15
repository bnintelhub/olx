import { formatCurrency } from '../../../lib/utils';
import { RotateCcw, AlertCircle, TrendingDown, IndianRupee, ShieldCheck } from 'lucide-react';
import { useRefundAnalyticsQuery } from '../hook/usePaymentsQuery';

interface RefundAnalyticsSectionProps {
  period: string;
  from?: string;
  to?: string;
}

export function RefundAnalyticsSection({ period, from, to }: RefundAnalyticsSectionProps) {
  const { data: refundsData } = useRefundAnalyticsQuery(period, from, to);

  const total = refundsData?.totalRefunds ?? 0;
  const amount = refundsData?.refundAmount ?? 0;
  const avg = refundsData?.avgRefundAmount ?? 0;
  const rate = refundsData?.refundRate ?? 0;
  const reasons = refundsData?.topReasons || [];

  return (
    <div className="space-y-4">
      {/* Minimal 4 Refund KPI Cards with matching icon accents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Refunds */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Total Refunds</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{total}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Today: {refundsData?.refundsToday ?? 0} • Week: {refundsData?.refundsThisWeek ?? 0}
          </p>
        </div>

        {/* Refund Volume */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Refund Volume</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {formatCurrency(amount)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Total capital reversed back to users
          </p>
        </div>

        {/* Avg Refund Ticket */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Avg Refund Ticket</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(avg)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Per refunded transaction
          </p>
        </div>

        {/* Refund Rate */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Refund Rate</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{rate}%</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Target benchmark &lt; 2.5%</span>
          </p>
        </div>
      </div>

      {/* Top Reasons Breakdown */}
      <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Top Refund & Cancellation Reasons
        </h4>
        {reasons.length > 0 ? (
          <div className="space-y-2.5">
            {reasons.map((r) => (
              <div key={r.reason} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{r.reason}</span>
                  <span className="font-semibold text-slate-500">{r.count} ({r.percentage}%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-500"
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            No refund disputes or cancellation reasons recorded in this period.
          </div>
        )}
      </div>
    </div>
  );
}
