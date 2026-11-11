import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../../components/ui/dropdown-menu';
import { cn, formatCurrency } from '../../../lib/utils';
import {
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Calendar,
  Download,
  Activity,
  Sparkles,
  Zap,
  ChevronDown,
  Check,
  TrendingUp,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useRevenueOverviewQuery,
  useRevenueTrendQuery,
  useRevenueBreakdownQuery,
  usePaymentPerformanceQuery,
} from '../../payments/hook/usePaymentsQuery';
import { paymentsService } from '../../payments/service/payments.service';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'This Year' },
  { value: 'custom', label: 'Custom Date Range' },
];

export function RevenueOverviewSection() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<string>('30d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Active series toggles to display all in one combined graph
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>({
    grossCollection: true,
    netRevenue: true,
    platformEarnings: true,
    paymentFees: true,
    refunds: true,
  });

  // Live Socket streaming states
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>(
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const socket: Socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_admin_metrics');
    });
    socket.on('admin:metrics_update', () => {
      setIsFlashing(true);
      setLastSynced(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      void queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setTimeout(() => setIsFlashing(false), 1200);
    });
    socket.on('disconnect', () => setIsConnected(false));
    return () => {
      socket.emit('leave_admin_metrics');
      socket.disconnect();
    };
  }, [queryClient]);

  const { data: overview } = useRevenueOverviewQuery(
    period,
    showCustomRange ? customFrom : undefined,
    showCustomRange ? customTo : undefined
  );
  const { data: trendData } = useRevenueTrendQuery(
    period,
    'all',
    showCustomRange ? customFrom : undefined,
    showCustomRange ? customTo : undefined
  );
  const { data: breakdownData } = useRevenueBreakdownQuery(
    period,
    showCustomRange ? customFrom : undefined,
    showCustomRange ? customTo : undefined
  );
  const { data: performanceData } = usePaymentPerformanceQuery(
    period,
    showCustomRange ? customFrom : undefined,
    showCustomRange ? customTo : undefined
  );

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const hasAny = Object.values(next).some(Boolean);
      return hasAny ? next : { ...prev, [key]: true };
    });
  };

  const handleToggleAllSeries = () => {
    const allActive = Object.values(activeSeries).every(Boolean);
    const updated: Record<string, boolean> = {};
    Object.keys(metricLabelMap).forEach((k) => {
      updated[k] = !allActive;
    });
    if (allActive) updated.grossCollection = true;
    setActiveSeries(updated);
  };

  const handlePeriodChange = (val: string) => {
    if (val === 'custom') {
      setShowCustomRange(true);
      setPeriod('custom');
    } else {
      setShowCustomRange(false);
      setPeriod(val);
    }
  };

  const handleExport = () => {
    window.open(paymentsService.exportCsvUrl({ from: customFrom, to: customTo }), '_blank');
  };

  const metricColorMap: Record<string, string> = {
    grossCollection: '#0ea5e9',
    netRevenue: '#10b981',
    refunds: '#ef4444',
    paymentFees: '#f59e0b',
    platformEarnings: '#8b5cf6',
  };

  const metricLabelMap: Record<string, string> = {
    grossCollection: 'Gross Collection',
    netRevenue: 'Net Revenue',
    refunds: 'Refunds',
    paymentFees: 'Gateway Fees (MDR)',
    platformEarnings: 'Platform Earnings',
  };

  const kpiCards = [
    {
      id: 'totalEarned',
      title: 'Total Earned',
      value: formatCurrency(overview?.totalEarned ?? 0),
      subtext: 'Net platform profit after fees',
      icon: <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      badge: null,
      metricKey: 'platformEarnings',
    },
    {
      id: 'todayRevenue',
      title: "Today's Revenue",
      value: formatCurrency(overview?.todayRevenue ?? 0),
      subtext: 'Realtime midnight sync',
      icon: <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
      badge: { text: 'Live Sync', isLive: true },
      metricKey: 'grossCollection',
    },
    {
      id: 'thisMonth',
      title: 'This Month',
      value: formatCurrency(overview?.thisMonthRevenue ?? 0),
      subtext: `Week: ${formatCurrency(overview?.thisWeekRevenue ?? 0)}`,
      icon: <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
      badge: null,
      metricKey: null,
    },
    {
      id: 'avgDaily',
      title: 'Avg Daily Revenue',
      value: formatCurrency(overview?.averageDailyRevenue ?? 0),
      subtext: `Over ${overview?.days ?? 30}d active window`,
      icon: <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      badge: null,
      metricKey: null,
    },
    {
      id: 'gross',
      title: 'Gross Collection',
      value: formatCurrency(overview?.grossCollection ?? 0),
      subtext: 'Total marketplace volume',
      icon: <CreditCard className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
      badge: {
        text: `${overview?.trends.gross.change ?? 0}%`,
        isUp: overview?.trends.gross.trend === 'UP',
      },
      metricKey: 'grossCollection',
    },
    {
      id: 'net',
      title: 'Net Revenue',
      value: formatCurrency(overview?.netRevenue ?? 0),
      subtext: 'Gross minus refunds & fees',
      icon: <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      badge: {
        text: `${overview?.trends.net.change ?? 0}%`,
        isUp: overview?.trends.net.trend === 'UP',
      },
      metricKey: 'netRevenue',
    },
    {
      id: 'transactions',
      title: 'Total Transactions',
      value: (overview?.totalTransactions ?? 0).toLocaleString('en-IN'),
      subtext: `${overview?.successfulPayments ?? 0} Success · ${overview?.failedPayments ?? 0} Failed`,
      icon: <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      badge: {
        text: `${overview?.successRate ?? 0}% Success`,
        isUp: true,
      },
      metricKey: null,
    },
    {
      id: 'refundRate',
      title: 'Refund Rate',
      value: `${overview?.refundRate ?? 0}%`,
      subtext: `${overview?.refundedPayments ?? 0} refunds (${formatCurrency(overview?.refundAmount ?? 0)})`,
      icon: <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
      badge: null,
      metricKey: 'refunds',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Global Date Range, Live Blinker & Export Controls Header */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Financial Intelligence
            </span>

            {/* Prominent Live Feed Blinker */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-300 ${
                isConnected
                  ? isFlashing
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="tracking-wide text-[11px] font-bold">
                {isConnected ? (isFlashing ? 'SYNCING LIVE...' : 'LIVE FEED') : 'CONNECTING...'}
              </span>
              {lastSynced && (
                <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                  • {lastSynced}
                </span>
              )}
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Revenue & Payment Overview
          </h2>
          <p className="text-xs text-muted-foreground">
            Monitor real-time cash flow, net earnings, transaction health, and gateway performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Period Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 bg-muted/60 hover:bg-muted px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-foreground transition focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{PERIOD_OPTIONS.find((opt) => opt.value === period)?.label || 'Last 30 Days'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-popover border border-border text-popover-foreground p-1.5 shadow-xl rounded-xl z-50"
            >
              {PERIOD_OPTIONS.map((opt) => {
                const isSelected = period === opt.value;
                return (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => handlePeriodChange(opt.value)}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-2" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Report */}
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            className="h-9 gap-1.5 text-xs font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Inputs if Selected */}
      {showCustomRange && (
        <div className="p-4 bg-muted/40 border border-border rounded-xl flex flex-wrap items-center gap-3 text-xs animate-in fade-in duration-200">
          <span className="font-semibold text-muted-foreground">Custom Date Filter:</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
          />
        </div>
      )}

      {/* 2. Main Executive Telemetry Block: Left Graph + Right Overview Metrics List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT SIDE: Revenue Trend Performance Graph (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col min-w-0">
          <Card className="rounded-3xl border border-border shadow-xs overflow-hidden flex-1 flex flex-col justify-between">
            <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-80" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <h3 className="text-base font-extrabold text-foreground tracking-tight">
                    Revenue Trend Performance
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Consolidated timeline: Gross, Net, Earnings, Fees & Refunds
                </p>
              </div>

              {/* All-in-One Series Legend / Toggle Pills */}
              <div className="flex flex-wrap items-center gap-1 bg-muted/50 p-1 rounded-2xl border border-border/70">
                <button
                  type="button"
                  onClick={handleToggleAllSeries}
                  className="px-2 py-1 rounded-xl text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border/50 bg-background/50 shadow-2xs"
                >
                  All
                </button>

                {Object.keys(metricLabelMap).map((k) => {
                  const isSeriesVisible = activeSeries[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleSeries(k)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border',
                        isSeriesVisible
                          ? 'bg-background text-foreground shadow-2xs border-border/80'
                          : 'opacity-40 hover:opacity-75 text-muted-foreground border-transparent'
                      )}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: metricColorMap[k] }}
                      />
                      <span>{metricLabelMap[k].split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Graph Canvas */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center min-w-0">
              <div className="h-80 sm:h-96 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData || []} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grossCollectionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metricColorMap.grossCollection} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={metricColorMap.grossCollection} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="netRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metricColorMap.netRevenue} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={metricColorMap.netRevenue} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="platformEarningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metricColorMap.platformEarnings} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={metricColorMap.platformEarnings} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="paymentFeesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metricColorMap.paymentFees} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={metricColorMap.paymentFees} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="refundsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metricColorMap.refunds} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={metricColorMap.refunds} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.6}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover text-popover-foreground border border-border p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 min-w-[220px] animate-in zoom-in-95 duration-150 backdrop-blur-md">
                              <div className="flex items-center justify-between border-b border-border/50 pb-1.5 font-bold">
                                <span className="text-foreground">{data.date}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {data.transactionCount} transactions
                                </span>
                              </div>
                              <div className="space-y-1.5 font-mono text-[11px]">
                                {Object.keys(metricLabelMap).map((key) => {
                                  const isVisible = activeSeries[key];
                                  return (
                                    <div
                                      key={key}
                                      className={cn(
                                        'flex items-center justify-between gap-3',
                                        !isVisible && 'opacity-35 line-through'
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className="w-2 h-2 rounded-full shrink-0"
                                          style={{ backgroundColor: metricColorMap[key] }}
                                        />
                                        <span className="text-muted-foreground font-sans text-xs">
                                          {metricLabelMap[key]}:
                                        </span>
                                      </div>
                                      <span className="font-bold text-foreground">
                                        ₹{Number(data[key] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {activeSeries.grossCollection && (
                      <Area
                        type="monotone"
                        dataKey="grossCollection"
                        name="Gross Collection"
                        stroke={metricColorMap.grossCollection}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#grossCollectionGradient)"
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                    )}
                    {activeSeries.netRevenue && (
                      <Area
                        type="monotone"
                        dataKey="netRevenue"
                        name="Net Revenue"
                        stroke={metricColorMap.netRevenue}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#netRevenueGradient)"
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                    )}
                    {activeSeries.platformEarnings && (
                      <Area
                        type="monotone"
                        dataKey="platformEarnings"
                        name="Platform Earnings"
                        stroke={metricColorMap.platformEarnings}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#platformEarningsGradient)"
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                    )}
                    {activeSeries.paymentFees && (
                      <Area
                        type="monotone"
                        dataKey="paymentFees"
                        name="Gateway Fees (MDR)"
                        stroke={metricColorMap.paymentFees}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#paymentFeesGradient)"
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                    )}
                    {activeSeries.refunds && (
                      <Area
                        type="monotone"
                        dataKey="refunds"
                        name="Refunds"
                        stroke={metricColorMap.refunds}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#refundsGradient)"
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT SIDE: Key Performance Indicators Converted into Clean Overview Metrics List (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col min-w-0">
          <Card className="rounded-3xl border border-border shadow-xs p-5 sm:p-6 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold uppercase tracking-tight text-foreground">
                  Key Performance Indicators
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Live marketplace financial telemetry overview
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                8 Metrics
              </Badge>
            </div>

            {/* Clean Structured Metrics List (No click focus, purely overview monitoring) */}
            <div className="divide-y divide-border/40 flex-1 flex flex-col justify-between py-1">
              {kpiCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between py-2 sm:py-2.5 text-xs transition-colors hover:bg-muted/20 px-1.5 rounded-lg"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', card.iconBg)}>
                      {card.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate text-xs">
                        {card.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {card.subtext}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="font-black font-mono text-sm sm:text-base text-foreground tracking-tight">
                      {card.value}
                    </div>
                    {card.badge && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                          card.badge.isLive
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : card.badge.isUp
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {card.badge.isLive ? (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                          </span>
                        ) : card.badge.isUp ? (
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        ) : (
                          <ArrowDownRight className="w-2.5 h-2.5" />
                        )}
                        <span>{card.badge.text}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Revenue Breakdown & Payment Performance Two-Column */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Breakdown by Source */}
        <Card className="rounded-3xl border border-border shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-foreground">Revenue by Feature / Source</h4>
              <p className="text-xs text-muted-foreground">
                Total collection: <strong className="text-foreground">{formatCurrency(breakdownData?.totalRevenue ?? 0)}</strong>
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Marketplace Add-ons
            </Badge>
          </div>

          <div className="space-y-4">
            {breakdownData?.breakdown.map((item) => (
              <div key={item.purpose} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black font-mono text-foreground">{formatCurrency(item.amount)}</span>
                    <span className="font-semibold text-muted-foreground text-[11px] w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted/70 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment Performance & Gateway Benchmarks with Circle Donut Gauge + Data Display */}
        <Card className="rounded-3xl border border-border shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-foreground">Gateway Settlement Reliability</h4>
              <p className="text-xs text-muted-foreground">
                Payment success vs failure rates across online checkouts
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Live Gateway Health
            </Badge>
          </div>

          {/* Side-by-side: Left Visualization & Right Data Display */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pt-1">
            {/* Left Side: Donut Circle Gauge (Identical to user image) */}
            {(() => {
              const successRate = performanceData?.successRate ?? (overview?.totalTransactions ? Math.round(((overview?.successfulPayments ?? 0) / overview.totalTransactions) * 100) : 98);
              const failureRate = performanceData?.failureRate ?? (overview?.totalTransactions ? Math.round(((overview?.failedPayments ?? 0) / overview.totalTransactions) * 100) : 2);
              const refundRate = performanceData?.refundRate ?? (overview?.totalTransactions ? Math.round(((overview?.refundedPayments ?? 0) / overview.totalTransactions) * 100) : 0);

              const donutSegments = [
                { name: 'Successful', value: successRate, color: '#10b981', label: 'Settled', count: overview?.successfulPayments },
                { name: 'Failed', value: failureRate, color: '#ef4444', label: 'Declined', count: overview?.failedPayments },
                { name: 'Refunded', value: refundRate, color: '#3b82f6', label: 'Reversed', count: overview?.refundedPayments },
              ].filter((s) => s.value > 0);

              const totalDisplay = overview?.totalTransactions
                ? overview.totalTransactions.toLocaleString('en-IN')
                : `${successRate}%`;
              const labelDisplay = overview?.totalTransactions ? 'Orders' : 'Reliability';

              return (
                <div className="relative h-44 w-44 shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutSegments}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutSegments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-popover text-popover-foreground border border-border p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                                <p className="font-bold">{item.name}</p>
                                <p className="font-mono font-bold text-primary">
                                  {item.value}% {item.count !== undefined ? `(${item.count} checkouts)` : ''}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Text (Exact match to uploaded image) */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="text-xl font-black font-mono tracking-tight text-foreground">
                      {totalDisplay}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                      {labelDisplay}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Right Side: Displaying Data Breakdown List */}
            <div className="flex-1 w-full space-y-2.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Settlement Distribution
              </span>
              <div className="space-y-2 text-xs">
                {/* Successful */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-[#10b981]" />
                    <span className="font-semibold text-foreground">Successful Checkouts</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {performanceData?.successRate ?? 0}%
                    </span>
                    {overview?.successfulPayments !== undefined && (
                      <span className="text-[11px] text-muted-foreground ml-1.5 font-mono">
                        ({overview.successfulPayments.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                </div>

                {/* Failed */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-[#ef4444]" />
                    <span className="font-semibold text-foreground">Failed Transactions</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                      {performanceData?.failureRate ?? 0}%
                    </span>
                    {overview?.failedPayments !== undefined && (
                      <span className="text-[11px] text-muted-foreground ml-1.5 font-mono">
                        ({overview.failedPayments.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                </div>

                {/* Refunded */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-[#3b82f6]" />
                    <span className="font-semibold text-foreground">Customer Refunds</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                      {performanceData?.refundRate ?? 0}%
                    </span>
                    {overview?.refundedPayments !== undefined && (
                      <span className="text-[11px] text-muted-foreground ml-1.5 font-mono">
                        ({overview.refundedPayments.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Underneath: Top Failure Diagnostics Root Causes List */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Top Failure Diagnostics
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">Root causes</span>
            </div>
            <div className="space-y-1.5">
              {performanceData?.failedReasons && performanceData.failedReasons.length > 0 ? (
                performanceData.failedReasons.slice(0, 3).map((r) => (
                  <div
                    key={r.reason}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-muted/40 border border-border/50"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500/70 shrink-0" />
                      <span className="text-muted-foreground font-medium truncate">{r.reason}</span>
                    </div>
                    <span className="font-bold font-mono text-foreground shrink-0">{r.percentage}%</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-2 text-center rounded-xl bg-muted/20 border border-border/40">
                  Zero recent gateway failures detected.
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
