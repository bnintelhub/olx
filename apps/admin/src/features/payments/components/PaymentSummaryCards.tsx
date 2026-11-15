import { formatCurrency } from '../../../lib/utils';
import {
  TrendingUp,
  CheckCircle2,
  RotateCcw,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { RevenueOverviewData } from '../service/payments.service';

interface PaymentSummaryCardsProps {
  overview?: RevenueOverviewData;
  isLoading: boolean;
}

export function PaymentSummaryCards({ overview }: PaymentSummaryCardsProps) {
  const gross = overview?.grossCollection ?? 0;
  const fees = overview?.paymentFees ?? 0;
  const refunds = overview?.refundAmount ?? 0;
  const net = overview?.netRevenue ?? 0;
  const totalTransactions = overview?.totalTransactions ?? 0;
  const successfulPayments = overview?.successfulPayments ?? 0;
  const failedPayments = overview?.failedPayments ?? 0;
  const successRate = overview?.successRate ?? 0;
  const refundedPayments = overview?.refundedPayments ?? 0;

  return (
    <div className="space-y-3">
      {/* 1. Minimal 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gross Collection */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Gross Collection</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(gross)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{successfulPayments}</span>
            <span>orders processed</span>
          </p>
        </div>

        {/* Net Settlement */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Net Settlement</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(net)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Bank deposit after fees & refunds
          </p>
        </div>

        {/* Refunds & Deductions */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Refunds & Fees</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(refunds + fees)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>{refundedPayments} refunded ({formatCurrency(refunds)})</span>
            <span>•</span>
            <span>Fees: {formatCurrency(fees)}</span>
          </p>
        </div>

        {/* Total Volume & Success */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Total Transactions</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {totalTransactions.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-600 font-semibold">{successRate}% success</span>
            <span>•</span>
            <span className="text-rose-500 font-medium">{failedPayments} failed</span>
          </p>
        </div>
      </div>

      {/* 2. Compact Minimal Reconciliation Flow Strip */}
      <div className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/60 text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Reconciliation:</span>
          <span className="text-slate-800 dark:text-slate-200">Gross {formatCurrency(gross)}</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="text-rose-600 dark:text-rose-400">Refunds -{formatCurrency(refunds)}</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="text-amber-600 dark:text-amber-400">Fees -{formatCurrency(fees)}</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="font-bold text-emerald-600 dark:text-emerald-400">Net {formatCurrency(net)}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Reconciled</span>
        </div>
      </div>
    </div>
  );
}
