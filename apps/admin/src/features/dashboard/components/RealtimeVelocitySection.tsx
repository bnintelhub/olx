import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency, cn } from '../../../lib/utils';
import {
  Users,
  ShoppingBag,
  Activity,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Clock,
  Radio,
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
import { io, Socket } from 'socket.io-client';
import { useRealtimeMetricsQuery } from '../../payments/hook/usePaymentsQuery';
import { RealtimeMetricsData } from '../../payments/service/payments.service';

export function RealtimeVelocitySection() {
  const { data: initialData } = useRealtimeMetricsQuery();
  const [metrics, setMetrics] = useState<RealtimeMetricsData | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    if (initialData && !metrics) {
      setMetrics(initialData);
    }
  }, [initialData, metrics]);

  useEffect(() => {
    const socket: Socket = io('/', {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      auth: { context: 'admin' },
      query: { context: 'admin' },
      withCredentials: true,
    });

    socket.on('connect', () => {
      setIsSocketConnected(true);
      socket.emit('join_admin_metrics');
    });

    socket.on('admin:metrics_update', (data: RealtimeMetricsData) => {
      setMetrics(data);
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    return () => {
      socket.emit('leave_admin_metrics');
      socket.disconnect();
    };
  }, []);

  const data = metrics || initialData;
  const velocity = data?.velocity;
  const trajectory = data?.platformGrowthTrajectory || [];
  const recents = data?.recentTransactions || [];

  return (
    <div className="space-y-6">
      {/* Velocity Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-foreground">
              Marketplace Throughput & Live Velocity
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Streaming real-time account registrations, listing publish frequency, and live checkouts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all',
              isSocketConnected
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              )}
            />
            <span>{isSocketConnected ? 'Socket.IO Synchronized' : 'Polling HTTP Fallback'}</span>
          </span>
          <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
            {data ? new Date(data.timestamp).toLocaleTimeString() : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* 4 Velocity Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Users Velocity */}
        <Card className="rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Users
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              {(velocity?.totalUsers ?? 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span>+{velocity?.usersToday ?? 0} today · +{velocity?.usersThisWeek ?? 0} this week</span>
            </div>
          </CardContent>
        </Card>

        {/* Listings Velocity */}
        <Card className="rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Listings
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              {(velocity?.totalAds ?? 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span>+{velocity?.adsToday ?? 0} today · +{velocity?.adsThisWeek ?? 0} this week</span>
            </div>
          </CardContent>
        </Card>

        {/* Active vs In-Review Listings */}
        <Card className="rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Active Listings
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 px-2 py-0.5"
              >
                Live on Board
              </Badge>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              {(velocity?.activeAds ?? 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
              {velocity?.pendingAds ?? 0} listings in review queue
            </div>
          </CardContent>
        </Card>

        {/* Today's Live Collections */}
        <Card className="rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Today’s Live Revenue
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                ₹
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              {formatCurrency(data?.todayRevenue ?? 0)}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Real-time payment settlements today
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real Platform Growth Trajectory & Live Feed */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Growth Trajectory Chart */}
        <Card className="rounded-3xl border border-border bg-card shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-foreground">Platform Growth Trajectory</h4>
              <p className="text-xs text-muted-foreground">
                Historical account and inventory accumulation over 4 weeks
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Velocity
            </Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="listingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
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
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-popover text-popover-foreground border border-border p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 animate-in zoom-in-95 duration-150">
                          <p className="font-bold text-foreground border-b border-border/50 pb-1">{item.date}</p>
                          <p className="text-blue-600 dark:text-blue-400 font-bold flex items-center justify-between gap-4">
                            <span>Users:</span>
                            <span className="font-mono">{item.users}</span>
                          </p>
                          <p className="text-purple-600 dark:text-purple-400 font-bold flex items-center justify-between gap-4">
                            <span>Listings:</span>
                            <span className="font-mono">{item.listings}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#usersGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="listings"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#listingsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs font-semibold pt-1">
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Users Trajectory
            </span>
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Listings Trajectory
            </span>
          </div>
        </Card>

        {/* Live Recent Transactions Ticker */}
        <Card className="rounded-3xl border border-border bg-card shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-foreground">Recent Transactions</h4>
              <p className="text-xs text-muted-foreground">Live real-time checkout stream</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Streaming</span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[290px] overflow-y-auto no-scrollbar pr-1">
            {recents.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground font-medium">
                No recent payment transactions recorded yet.
              </div>
            ) : (
              recents.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition border border-border/50 text-xs"
                >
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <p className="font-bold text-foreground truncate">{txn.customerName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{txn.listingTitle}</p>
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <p className="font-black font-mono text-foreground">{formatCurrency(txn.amount)}</p>
                    <span
                      className={cn(
                        'inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md',
                        txn.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      )}
                    >
                      {txn.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
