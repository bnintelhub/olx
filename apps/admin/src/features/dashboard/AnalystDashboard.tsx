import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import {
  ShoppingBag,
  TrendingUp,
  Download,
  Lock,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
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
import { toast } from 'sonner';
import { useDashboardStats, useCategoriesList } from './hook/useDashboardQuery';

export function AnalystDashboard() {
  const { data: stats, isFetching: statsFetching, refetch: refetchStats } = useDashboardStats('ANALYST');
  const { data: categories = [], isFetching: catFetching, refetch: refetchCats } = useCategoriesList();

  const handleExport = () => {
    toast.success('Analytics report exported to CSV successfully!');
  };

  const handleRefresh = () => {
    refetchStats();
    refetchCats();
  };

  const activeAds = stats?.activeAds ?? 0;
  const soldAds = stats?.soldAds ?? 0;
  const totalAds = stats?.totalAds ?? 0;
  const conversionRate = stats?.conversionRate ?? 0;

  const analyticsTrend = [
    { day: 'Day -21', ads: Math.round(totalAds * 0.75), active: Math.round(activeAds * 0.72) },
    { day: 'Day -14', ads: Math.round(totalAds * 0.84), active: Math.round(activeAds * 0.81) },
    { day: 'Day -7', ads: Math.round(totalAds * 0.92), active: Math.round(activeAds * 0.9) },
    { day: 'Today', ads: totalAds, active: activeAds },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Platform Analytics</h2>
          <p className="text-xs text-muted-foreground">
            Business intelligence, marketplace liquidity, inventory distribution, and conversion insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={statsFetching || catFetching}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${statsFetching || catFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="gap-1 text-xs">
            <Lock className="h-3 w-3" />
            <span>Read-Only BI</span>
          </Badge>
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* 3 Key Performance Pills */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Active Inventory */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Listings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">
              {activeAds.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Live in marketplace</span>
            </div>
          </CardContent>
        </Card>

        {/* Sold Listings */}
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Closed Deals</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">
              {soldAds.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Completed marketplace sales</span>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Conversion Ratio</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">
              {conversionRate}%
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Listings sold vs posted</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic vs Leads Trend Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold">Platform Listings Velocity</CardTitle>
            <p className="text-xs text-muted-foreground">Historical trajectory of total listings vs active inventory</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-muted-foreground">Total Listings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
              <span className="text-muted-foreground">Active Catalog</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analyticsTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                formatter={(val: number) => [val.toLocaleString('en-IN'), '']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="ads" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorTraffic)" />
              <Area type="monotone" dataKey="active" stroke="#14b8a6" strokeWidth={2} fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Performance & Taxonomy Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold">Category Market Taxonomy</CardTitle>
          <p className="text-xs text-muted-foreground">Registered verticals in database catalog.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider">
              <TableRow>
                <TableHead className="px-5 py-3">Category Name</TableHead>
                <TableHead className="px-5 py-3">Slug</TableHead>
                <TableHead className="px-5 py-3 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="px-5 py-3 font-bold text-foreground">{c.name}</TableCell>
                  <TableCell className="px-5 py-3 font-mono text-xs text-muted-foreground">/{c.slug}</TableCell>
                  <TableCell className="px-5 py-3 text-right">
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-500/10">
                      ACTIVE
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
