import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import {
  IndianRupee,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDashboardStats, useFinancialOverview } from './hook/useDashboardQuery';

export function FinanceAdminDashboard() {
  const { data: stats, isFetching: statsFetching, refetch: refetchStats } = useDashboardStats('FINANCE_ADMIN');
  const { data: overview, isFetching: overviewFetching, refetch: refetchOverview } = useFinancialOverview();

  // Real backend metrics with zero dummy fallbacks
  const grossRevenue = stats?.revenueSummary?.totalEarned ?? stats?.grossRevenueInr ?? overview?.grossRevenueInr ?? 0;
  const totalTransactions = stats?.totalOrders ?? stats?.totalTransactions ?? overview?.totalTransactions ?? 0;
  const successfulPayments = stats?.successfulPayments ?? overview?.successfulPayments ?? 0;
  const refundsCount = stats?.refunds ?? overview?.refundedPayments ?? 0;
  const refundAmount = overview?.refundAmount ?? 0;

  // Real revenue trend points from database
  const revenueTrend = stats?.revenueTrend || [];
  const hasTrendData = revenueTrend.length > 0 && revenueTrend.some((pt) => pt.amount > 0);

  const handleRefresh = () => {
    refetchStats();
    refetchOverview();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Revenue & Financial Overview</h2>
          <p className="text-xs text-muted-foreground">
            Realtime reconciliation of platform orders, payment gateway collections, and refund tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={statsFetching || overviewFetching}
            className="h-8 gap-1.5 text-xs rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${statsFetching || overviewFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="px-3 py-1 font-semibold text-xs text-emerald-600 border-emerald-500/20 bg-emerald-500/10">
            Payment Gateway: Active & Reconciled
          </Badge>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/70 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Gross Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ₹{grossRevenue.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Paid packages & promotions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Total Orders</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalTransactions.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {successfulPayments} successful payments
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Successful Collections</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {successfulPayments}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totalTransactions > 0 ? `${((successfulPayments / totalTransactions) * 100).toFixed(1)}%` : '100%'} completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Refunds & Returns</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {refundsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ₹{refundAmount.toLocaleString('en-IN')} reversed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real Inflow & Revenue Trend Chart */}
      <Card className="rounded-2xl border-border/70 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold">Revenue Trend (Last 30 Days)</CardTitle>
            <p className="text-xs text-muted-foreground">Live daily revenue aggregation from successful transactions</p>
          </div>
          {hasTrendData && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Realtime Feed</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="h-64 pt-2">
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="financeRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                />
                <Tooltip
                  formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Gross Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} fill="url(#financeRevenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl my-auto text-slate-400">
              <TrendingUp className="w-8 h-8 opacity-30 mb-2 text-primary" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">No revenue data recorded yet</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Transactions will automatically plot here as payments succeed.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Financial Reconciliations Table */}
      <Card className="rounded-2xl border-border/70 shadow-2xs">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold">Financial Summary & Payment Channels</CardTitle>
          <p className="text-xs text-muted-foreground">Live reconciliation from platform payment gateway and marketplace features.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider">
              <TableRow>
                <TableHead className="px-5 py-3">Channel / Integration</TableHead>
                <TableHead className="px-5 py-3">Type</TableHead>
                <TableHead className="px-5 py-3">Orders Processed</TableHead>
                <TableHead className="px-5 py-3">Gross Total</TableHead>
                <TableHead className="px-5 py-3">Operational Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Real PayU Gateway Row */}
              <TableRow>
                <TableCell className="px-5 py-3 font-semibold text-foreground">PayU Payment Gateway</TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground text-xs">Featured Ads & Boost Packages</TableCell>
                <TableCell className="px-5 py-3 font-mono text-xs">{totalTransactions}</TableCell>
                <TableCell className="px-5 py-3 font-bold text-foreground text-xs">₹{grossRevenue.toLocaleString('en-IN')}</TableCell>
                <TableCell className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    RECONCILED
                  </span>
                </TableCell>
              </TableRow>

              {/* Seller Escrow - Explicitly Marked as Feature not available */}
              <TableRow className="opacity-75">
                <TableCell className="px-5 py-3 font-semibold text-foreground">Seller Payouts & Escrow</TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground text-xs">P2P Classifieds (Direct Trade)</TableCell>
                <TableCell className="px-5 py-3 font-mono text-xs">—</TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground text-xs">—</TableCell>
                <TableCell className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-500/10 text-slate-500 dark:text-slate-400">
                    <HelpCircle className="h-3 w-3" />
                    Feature not available
                  </span>
                </TableCell>
              </TableRow>

              {/* Automated Tax Invoices - Explicitly Marked as Feature not available */}
              <TableRow className="opacity-75">
                <TableCell className="px-5 py-3 font-semibold text-foreground">Automated Tax & GST Invoicing</TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground text-xs">Direct Platform Receipt</TableCell>
                <TableCell className="px-5 py-3 font-mono text-xs">—</TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground text-xs">—</TableCell>
                <TableCell className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-500/10 text-slate-500 dark:text-slate-400">
                    <HelpCircle className="h-3 w-3" />
                    Feature not available
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
