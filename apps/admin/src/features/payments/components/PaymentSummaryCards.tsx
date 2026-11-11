import { Card, CardContent } from '../../../components/ui/card';
import { formatCurrency } from '../../../lib/utils';
import {
  IndianRupee,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Percent,
  Layers,
  ShieldCheck,
  ArrowDownRight,
  ArrowRight,
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
  const earnings = overview?.platformEarnings ?? 0;

  return (
    <div className="space-y-4">
      {/* 1. Strict Financial Waterfall Breakdown Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
              Financial Reconciliation Waterfall
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Gross Collection → Deductions (Fees & Refunds) → Net Settlement → Platform Earnings
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audited & Reconciled</span>
          </span>
        </div>

        {/* Horizontal Flow Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-xs">
          <div className="bg-muted/40 p-3 rounded-xl border border-border/60 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">1. Gross Collection</span>
            <p className="text-base font-black text-foreground">{formatCurrency(gross)}</p>
            <p className="text-[10px] text-muted-foreground">Processed orders</p>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-200/60 dark:border-rose-900/60 space-y-1">
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">2. Refunds</span>
            <p className="text-base font-black text-rose-700 dark:text-rose-400">-{formatCurrency(refunds)}</p>
            <p className="text-[10px] text-rose-600/80">{overview?.refundedPayments ?? 0} refunded</p>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/60 space-y-1">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">3. Gateway Fees</span>
            <p className="text-base font-black text-amber-700 dark:text-amber-400">-{formatCurrency(fees)}</p>
            <p className="text-[10px] text-amber-600/80">PayU MDR (2.0%)</p>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/60 space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">4. Net Collection</span>
            <p className="text-base font-black text-emerald-800 dark:text-emerald-400">{formatCurrency(net)}</p>
            <p className="text-[10px] text-emerald-600/80">Net bank deposit</p>
          </div>

          <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-primary uppercase">5. Platform Earnings</span>
            <p className="text-base font-black text-primary">{formatCurrency(earnings)}</p>
            <p className="text-[10px] text-primary/80">Retained revenue</p>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Transactions */}
        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
              <span>Total Transactions</span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {(overview?.totalTransactions ?? 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">{overview?.successfulPayments ?? 0} Successful</span>
              <span>•</span>
              <span className="text-rose-600 font-bold">{overview?.failedPayments ?? 0} Failed</span>
            </div>
          </CardContent>
        </Card>

        {/* Successful Volume */}
        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
              <span>Successful Amount</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {formatCurrency(gross)}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Success rate: <strong className="text-emerald-600">{overview?.successRate}%</strong>
            </div>
          </CardContent>
        </Card>

        {/* Refunded Amount */}
        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
              <span>Refunded Amount</span>
              <RotateCcw className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600">
              {formatCurrency(refunds)}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Refund rate: <strong className="text-rose-600">{overview?.refundRate}%</strong>
            </div>
          </CardContent>
        </Card>

        {/* Net Collection */}
        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
              <span>Net Collection</span>
              <IndianRupee className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {formatCurrency(net)}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Pending in pipeline: <strong className="text-amber-600">{overview?.pendingPayments ?? 0}</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

