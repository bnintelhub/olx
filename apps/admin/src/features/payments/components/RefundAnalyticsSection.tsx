import { Card, CardContent } from '../../../components/ui/card';
import { formatCurrency } from '../../../lib/utils';
import { RotateCcw, AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-foreground">Refund Analytics & Top Chargeback Reasons</h3>
          <p className="text-xs text-muted-foreground">Reversal patterns, dispute prevention, and return rates</p>
        </div>
      </div>

      {/* 4 Refund KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Refunds</span>
            <div className="text-2xl font-black text-foreground">{total}</div>
            <p className="text-[11px] text-muted-foreground">
              Today: {refundsData?.refundsToday ?? 0} • This week: {refundsData?.refundsThisWeek ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Refund Volume</span>
            <div className="text-2xl font-black text-rose-600">{formatCurrency(amount)}</div>
            <p className="text-[11px] text-muted-foreground">
              Total capital reversed back to users
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Refund Ticket</span>
            <div className="text-2xl font-black text-foreground">{formatCurrency(avg)}</div>
            <p className="text-[11px] text-muted-foreground">
              Per refunded transaction
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Refund Rate</span>
            <div className="text-2xl font-black text-foreground">{rate}%</div>
            <p className="text-[11px] text-muted-foreground">
              Target benchmark: &lt; 2.5%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Reasons Breakdown */}
      <Card className="rounded-2xl border-border/80 shadow-xs p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Top Refund & Cancellation Reasons
        </h4>
        <div className="space-y-3">
          {refundsData?.topReasons.map((r) => (
            <div key={r.reason} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-foreground">{r.reason}</span>
                <span className="font-bold text-muted-foreground">{r.count} ({r.percentage}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${r.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

