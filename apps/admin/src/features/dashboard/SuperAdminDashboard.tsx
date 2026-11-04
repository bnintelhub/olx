import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import {
  Users,
  ShoppingBag,
  AlertTriangle,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

// Growth timeline data matching visual
const GROWTH_DATA = [
  { date: 'Oct 1', users: 70000, listings: 40000 },
  { date: 'Oct 5', users: 95000, listings: 62000 },
  { date: 'Oct 8', users: 110000, listings: 78000 },
  { date: 'Oct 12', users: 130000, listings: 92000 },
  { date: 'Oct 15', users: 150000, listings: 105000 },
  { date: 'Oct 19', users: 175000, listings: 118000 },
  { date: 'Oct 22', users: 195000, listings: 130000 },
  { date: 'Oct 26', users: 220000, listings: 142000 },
  { date: 'Oct 29', users: 248930, listings: 155000 },
];

// Listing status breakdown donut slices
const STATUS_DATA = [
  { name: 'Active', value: 428357, percent: '48%', color: '#10b981' },
  { name: 'Pending Review', value: 133862, percent: '15%', color: '#f59e0b' },
  { name: 'Sold / Closed', value: 107089, percent: '12%', color: '#3b82f6' },
  { name: 'Expired', value: 133862, percent: '15%', color: '#94a3b8' },
  { name: 'Rejected', value: 89241, percent: '10%', color: '#ef4444' },
];

export function SuperAdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Platform Title Banner */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Platform Dashboard</h2>
          <p className="text-xs text-muted-foreground">
            Overview of your OLX marketplace, user traffic, listings velocity, and platform health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Platform 100% Operational
          </span>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Users</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">2,48,930</div>
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+6.2% vs previous 30 days</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Listings */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Listings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">8,92,410</div>
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+9.8% vs previous 30 days</span>
            </div>
          </CardContent>
        </Card>

        {/* Reported Items */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Reported Items</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">4,280</div>
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600">
              <ArrowDownRight className="h-3.5 w-3.5" />
              <span>-12.4% vs previous 30 days</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">₹12,46,530</div>
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+18.7% vs previous 30 days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dual Charts Section: Area Growth Chart & Status Donut Chart */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Growth Area Chart (60% width on desktop) */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold">Users & Listings Growth</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Platform adoption velocity over last 30 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="text-muted-foreground">Users</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
                <span className="text-muted-foreground">Listings</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={GROWTH_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorListings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val / 1000}K`}
                />
                <Tooltip
                  formatter={(val: number) => [val.toLocaleString('en-IN'), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
                <Area
                  type="monotone"
                  dataKey="listings"
                  stroke="#9333ea"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorListings)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Listing Status Donut Chart (40% width on desktop) */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Listing Status</CardTitle>
            <p className="text-xs text-muted-foreground">Distribution across marketplace inventory</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Donut Chart with Center Number */}
              <div className="relative h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={STATUS_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {STATUS_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [val.toLocaleString('en-IN'), '']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Stats Overlay */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-sm font-extrabold text-foreground">8,92,410</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Total Listings</div>
                </div>
              </div>

              {/* Status Breakdown Legend */}
              <div className="flex-1 space-y-2 w-full text-xs">
                {STATUS_DATA.map((s) => (
                  <div key={s.name} className="flex items-center justify-between border-b pb-1.5 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="font-medium text-foreground">{s.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground">{s.percent}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({s.value.toLocaleString('en-IN')})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Operational Shortcuts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div
          onClick={() => navigate('/reports')}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/50 transition cursor-pointer shadow-2xs group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 group-hover:scale-105 transition-transform">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">24 Pending Reviews</div>
            <div className="text-[11px] text-muted-foreground">Moderation queue awaiting decision</div>
          </div>
        </div>

        <div
          onClick={() => navigate('/support')}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/50 transition cursor-pointer shadow-2xs group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-105 transition-transform">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">8 High-Priority Reports</div>
            <div className="text-[11px] text-muted-foreground">Scam and counterfeit investigations</div>
          </div>
        </div>

        <div
          onClick={() => navigate('/payments')}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/50 transition cursor-pointer shadow-2xs group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:scale-105 transition-transform">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">₹1,18,400 Pending Escrow</div>
            <div className="text-[11px] text-muted-foreground">14 seller payouts ready for release</div>
          </div>
        </div>
      </div>
    </div>
  );
}
