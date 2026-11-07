import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { formatCurrency } from '../../../lib/utils';
import {
  IndianRupee, ArrowUpRight, ArrowDownRight, RotateCcw, Calendar, Download, Activity, Sparkles, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  useRevenueOverviewQuery, useRevenueTrendQuery, useRevenueBreakdownQuery, usePaymentPerformanceQuery,
} from '../../payments/hook/usePaymentsQuery';
import { paymentsService } from '../../payments/service/payments.service';

export function RevenueOverviewSection() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<string>('30d');
  const [trendMetric, setTrendMetric] = useState<string>('grossCollection');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Live Socket streaming states
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const socket: Socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'], withCredentials: true });
    socket.on('connect', () => { setIsConnected(true); socket.emit('join_admin_metrics'); });
    socket.on('admin:metrics_update', () => {
      setIsFlashing(true);
      setLastSynced(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      void queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setTimeout(() => setIsFlashing(false), 1200);
    });
    socket.on('disconnect', () => setIsConnected(false));
    return () => { socket.emit('leave_admin_metrics'); socket.disconnect(); };
  }, [queryClient]);

  const { data: overview } = useRevenueOverviewQuery(period, showCustomRange ? customFrom : undefined, showCustomRange ? customTo : undefined);
  const { data: trendData } = useRevenueTrendQuery(period, trendMetric, showCustomRange ? customFrom : undefined, showCustomRange ? customTo : undefined);
  const { data: breakdownData } = useRevenueBreakdownQuery(period, showCustomRange ? customFrom : undefined, showCustomRange ? customTo : undefined);
  const { data: performanceData } = usePaymentPerformanceQuery(period, showCustomRange ? customFrom : undefined, showCustomRange ? customTo : undefined);

  const handlePeriodChange = (val: string) => {
    if (val === 'custom') { setShowCustomRange(true); setPeriod('custom'); }
    else { setShowCustomRange(false); setPeriod(val); }
  };

  const handleExport = () => {
    window.open(paymentsService.exportCsvUrl({ from: customFrom, to: customTo }), '_blank');
  };

  const metricColorMap: Record<string, string> = {
    grossCollection: '#0ea5e9', netRevenue: '#10b981', refunds: '#ef4444', paymentFees: '#f59e0b', platformEarnings: '#8b5cf6',
  };

  const metricLabelMap: Record<string, string> = {
    grossCollection: 'Gross Collection', netRevenue: 'Net Revenue', refunds: 'Refunds', paymentFees: 'Gateway Fees (MDR)', platformEarnings: 'Platform Earnings',
  };

  const kpiCards = [
    {
      id: 'totalEarned', title: 'Total Earned', value: formatCurrency(overview?.totalEarned ?? 0),
      subtext: 'Net platform profit', icon: <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />, iconBg: 'bg-emerald-500/10', badge: null, metricKey: 'platformEarnings',
    },
    {
      id: 'todayRevenue', title: "Today's Revenue", value: formatCurrency(overview?.todayRevenue ?? 0),
      subtext: 'Realtime midnight sync', icon: <Sparkles className="w-3.5 h-3.5 text-blue-600" />, iconBg: 'bg-blue-500/10',
      badge: { text: 'Live Sync', isLive: true }, metricKey: 'grossCollection',
    },
    {
      id: 'thisMonth', title: 'This Month', value: formatCurrency(overview?.thisMonthRevenue ?? 0),
      subtext: `Week: ${formatCurrency(overview?.thisWeekRevenue ?? 0)}`, icon: <Activity className="w-3.5 h-3.5 text-purple-600" />, iconBg: 'bg-purple-500/10', badge: null, metricKey: null,
    },
    {
      id: 'avgDaily', title: 'Avg Daily', value: formatCurrency(overview?.averageDailyRevenue ?? 0),
      subtext: `Over ${overview?.days ?? 30}d window`, icon: <Zap className="w-3.5 h-3.5 text-amber-600" />, iconBg: 'bg-amber-500/10', badge: null, metricKey: null,
    },
    {
      id: 'gross', title: 'Gross Collection', value: formatCurrency(overview?.grossCollection ?? 0),
      subtext: 'Total volume before deductions', icon: null, iconBg: null, badge: { text: `${overview?.trends.gross.change ?? 0}%`, isUp: overview?.trends.gross.trend === 'UP' }, metricKey: 'grossCollection',
    },
    {
      id: 'net', title: 'Net Revenue', value: formatCurrency(overview?.netRevenue ?? 0),
      subtext: 'Gross minus refunds & fees', icon: null, iconBg: null, badge: { text: `${overview?.trends.net.change ?? 0}%`, isUp: overview?.trends.net.trend === 'UP' }, metricKey: 'netRevenue',
    },
    {
      id: 'transactions', title: 'Transactions', value: (overview?.totalTransactions ?? 0).toLocaleString('en-IN'),
      subtext: `${overview?.successfulPayments ?? 0} Success • ${overview?.failedPayments ?? 0} Failed`, icon: null, iconBg: null, badge: { text: `${overview?.successRate ?? 0}%`, isUp: true }, metricKey: null,
    },
    {
      id: 'refundRate', title: 'Refund Rate', value: `${overview?.refundRate ?? 0}%`,
      subtext: `${overview?.refundedPayments ?? 0} refunds (${formatCurrency(overview?.refundAmount ?? 0)})`, icon: <RotateCcw className="w-3.5 h-3.5 text-rose-600" />, iconBg: 'bg-rose-500/10', badge: null, metricKey: 'refunds',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Global Date Range, Live Blinker & Export Header */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Financial Intelligence
            </span>

            {/* Prominent Live Feed Blinker */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-300 shadow-2xs ${
                isConnected
                  ? isFlashing
                    ? 'bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="tracking-wide">
                {isConnected ? (isFlashing ? 'SYNCING LIVE...' : 'LIVE FEED') : 'CONNECTING...'}
              </span>
              {lastSynced && (
                <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                  • {lastSynced}
                </span>
              )}
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Revenue & Transaction Analytics
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Period Dropdown with Dark Mode Options */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-2" />
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none pr-3 py-1 cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100"
            >
              <option value="today" className="bg-slate-900 text-slate-100 py-1">Today</option>
              <option value="yesterday" className="bg-slate-900 text-slate-100 py-1">Yesterday</option>
              <option value="7d" className="bg-slate-900 text-slate-100 py-1">Last 7 Days</option>
              <option value="30d" className="bg-slate-900 text-slate-100 py-1">Last 30 Days</option>
              <option value="this_month" className="bg-slate-900 text-slate-100 py-1">This Month</option>
              <option value="last_month" className="bg-slate-900 text-slate-100 py-1">Last Month</option>
              <option value="3m" className="bg-slate-900 text-slate-100 py-1">Last 3 Months</option>
              <option value="6m" className="bg-slate-900 text-slate-100 py-1">Last 6 Months</option>
              <option value="1y" className="bg-slate-900 text-slate-100 py-1">This Year</option>
              <option value="custom" className="bg-slate-900 text-slate-100 py-1">Custom Date Range</option>
            </select>
          </div>

          {/* Export Report */}
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            className="h-9 gap-1.5 text-xs font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Inputs if Selected */}
      {showCustomRange && (
        <div className="p-4 bg-muted/30 border border-border rounded-xl flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-muted-foreground">Custom Range:</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background"
          />
          <span>to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background"
          />
        </div>
      )}

      {/* 2. Main Analytics Row: 1st image (Graph) on Left + 2nd image (KPI List) on Right in SAME X-direction Row */}
      <div className="flex flex-col md:flex-row gap-5 items-stretch w-full min-w-0">
        {/* Left Side: Revenue Trend Performance Graph */}
        <div className="w-full md:w-1/2 flex flex-col min-w-0">
          <Card className="rounded-3xl border-border/80 shadow-xs overflow-hidden flex-1 flex flex-col">
            <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">Revenue Trend Performance</h3>
                <p className="text-[11px] text-muted-foreground">
                  Displaying timeline points for {metricLabelMap[trendMetric]}
                </p>
              </div>

              {/* Metric Switcher Tabs */}
              <div className="flex flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border/60">
                {Object.keys(metricLabelMap).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTrendMetric(k)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      trendMetric === k
                        ? 'bg-background text-foreground shadow-2xs scale-105'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {metricLabelMap[k].split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center min-w-0">
              <div className="h-72 sm:h-80 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metricColorMap[trendMetric] || '#0ea5e9'} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={metricColorMap[trendMetric] || '#0ea5e9'} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
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
                            <div className="bg-popover border border-border p-3 rounded-xl shadow-lg text-xs space-y-1 animate-in zoom-in-95 duration-150">
                              <p className="font-bold text-foreground">{data.date}</p>
                              <p className="text-primary font-black text-sm">₹{Number(data[trendMetric] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                              <p className="text-[10px] text-muted-foreground">{data.transactionCount} transactions on this day</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey={trendMetric} stroke={metricColorMap[trendMetric] || '#0ea5e9'} strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGradient)" isAnimationActive={true} animationDuration={1000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: KPI Cards in 2 Columns (Col-by-Col, No Sliding) */}
        <div className="w-full md:w-1/2 flex flex-col justify-between min-w-0 space-y-3">
          {/* Card Header with Live Blinker */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Key Performance Indicators
              </span>
              <span className="text-xs text-muted-foreground">• 8 Metrics</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Live Feed
              </span>
            </div>
          </div>

          {/* Cards Container: Col-by-Col Grid (No Sliding) */}
          <div className="grid grid-cols-2 gap-3 flex-1 content-between">
            {kpiCards.map((card, idx) => {
              const isSelectedMetric = card.metricKey && trendMetric === card.metricKey;

              return (
                <Card
                  key={card.id}
                  onClick={() => card.metricKey && setTrendMetric(card.metricKey)}
                  className={`rounded-2xl border transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col justify-between animate-in fade-in duration-300 ${
                    isSelectedMetric
                      ? 'border-primary ring-2 ring-primary/20 shadow-md bg-primary/5'
                      : 'border-border/70 hover:border-primary/50'
                  }`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <CardContent className="p-3 sm:p-3.5 space-y-1.5 flex flex-col justify-between h-full">
                    {/* Header: Title + Icon/Badge */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                        {card.title}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        {card.badge && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              card.badge.isLive
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : card.badge.isUp
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-rose-500/10 text-rose-600'
                            }`}
                          >
                            {card.badge.isLive ? (
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                              </span>
                            ) : card.badge.isUp ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            <span>{card.badge.text}</span>
                          </span>
                        )}

                        {card.icon && (
                          <div className={`w-6 h-6 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                            {card.icon}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                      {card.value}
                    </div>

                    {/* Subtext */}
                    <div className="text-[10px] text-muted-foreground font-medium truncate">
                      {card.subtext}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Revenue Breakdown & Payment Performance Two-Column */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Breakdown by Source */}
        <Card className="rounded-3xl border-border/80 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="space-y-1">
            <h4 className="text-base font-black text-foreground">Revenue Breakdown by Source</h4>
            <p className="text-xs text-muted-foreground">
              Total period collection: {formatCurrency(breakdownData?.totalRevenue ?? 0)}
            </p>
          </div>

          <div className="space-y-3.5">
            {breakdownData?.breakdown.map((item) => (
              <div key={item.purpose} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-foreground">{formatCurrency(item.amount)}</span>
                    <span className="font-semibold text-muted-foreground text-[11px] w-10 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment Performance & Gateway Benchmarks */}
        <Card className="rounded-3xl border-border/80 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="space-y-1">
            <h4 className="text-base font-black text-foreground">Payment Gateway Performance</h4>
            <p className="text-xs text-muted-foreground">
              Success vs failure metrics and gateway response breakdown
            </p>
          </div>

          {/* Quick Rates Row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5">
              <p className="text-[10px] font-bold uppercase text-emerald-800">Success</p>
              <p className="text-lg font-black text-emerald-700">{performanceData?.successRate}%</p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
              <p className="text-[10px] font-bold uppercase text-rose-800">Failed</p>
              <p className="text-lg font-black text-rose-700">{performanceData?.failureRate}%</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
              <p className="text-[10px] font-bold uppercase text-amber-800">Refund</p>
              <p className="text-lg font-black text-amber-700">{performanceData?.refundRate}%</p>
            </div>
          </div>

          {/* Failed Reasons Breakdown */}
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Top Failure Reasons</p>
            <div className="space-y-1.5">
              {performanceData?.failedReasons.slice(0, 4).map((r) => (
                <div key={r.reason} className="flex items-center justify-between text-xs py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">{r.reason}</span>
                  <span className="font-bold text-foreground">{r.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
