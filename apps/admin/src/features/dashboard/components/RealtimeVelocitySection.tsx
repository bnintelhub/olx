import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency } from '../../../lib/utils';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Activity,
  Radio,
  Clock,
  ArrowUpRight,
  ShieldCheck,
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
      transports: ['websocket', 'polling'],
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">Users & Listings Velocity</h3>
            <p className="text-[11px] text-muted-foreground">Real-time marketplace activity & throughput</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isSocketConnected
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{isSocketConnected ? 'Socket.io Live Sync' : 'Polling HTTP Sync'}</span>
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            {data ? new Date(data.timestamp).toLocaleTimeString() : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* 4 Velocity Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Users Velocity */}
        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Users</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {velocity?.totalUsers.toLocaleString('en-IN') ?? 0}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{velocity?.usersToday ?? 0} today • +{velocity?.usersThisWeek ?? 0} this week</span>
            </div>
          </CardContent>
        </Card>

        {/* Listings Velocity */}
        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Listings</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {velocity?.totalAds.toLocaleString('en-IN') ?? 0}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{velocity?.adsToday ?? 0} today • +{velocity?.adsThisWeek ?? 0} this week</span>
            </div>
          </CardContent>
        </Card>

        {/* Active vs In-Review Listings */}
        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Listings</span>
              <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50">Live</Badge>
            </div>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {velocity?.activeAds.toLocaleString('en-IN') ?? 0}
            </div>
            <div className="text-[11px] text-amber-700 font-semibold">
              {velocity?.pendingAds ?? 0} listings awaiting review
            </div>
          </CardContent>
        </Card>

        {/* Today's Live Collections */}
        <Card className="rounded-2xl border-border/70 hover:shadow-md transition">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today’s Live Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">₹</div>
            </div>
            <div className="text-2xl font-black tracking-tight text-foreground">
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
        <Card className="rounded-3xl border-border/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h4 className="text-base font-black text-foreground">Platform Growth Trajectory</h4>
            <p className="text-xs text-muted-foreground">Historical account and listing accumulation over 4 weeks</p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="listingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-foreground">{item.date}</p>
                          <p className="text-blue-600 font-bold">Users: {item.users}</p>
                          <p className="text-purple-600 font-bold">Listings: {item.listings}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#usersGradient)" />
                <Area type="monotone" dataKey="listings" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#listingsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs font-semibold pt-1">
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Users Trajectory
            </span>
            <span className="flex items-center gap-1.5 text-purple-600">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Listings Trajectory
            </span>
          </div>
        </Card>

        {/* Live Recent Transactions Ticker */}
        <Card className="rounded-3xl border-border/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-base font-black text-foreground">Recent Transactions</h4>
              <p className="text-xs text-muted-foreground">Live real-time checkout stream</p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">Live Feed</Badge>
          </div>

          <div className="space-y-2.5">
            {recents.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground font-medium">
                No recent payment transactions recorded yet.
              </div>
            ) : (
              recents.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition border border-border/50 text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground">{txn.customerName}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{txn.listingTitle}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="font-black text-foreground">{formatCurrency(txn.amount)}</p>
                    <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                      txn.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
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

