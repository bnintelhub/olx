import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  ShieldCheck,
  Zap,
  Activity,
  RefreshCw,
  ShoppingBag,
  IndianRupee,
  LayoutDashboard,
  CreditCard,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useDashboardStats } from './hook/useDashboardQuery';
import { RevenueOverviewSection } from './components/RevenueOverviewSection';
import { RealtimeVelocitySection } from './components/RealtimeVelocitySection';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const { data: stats, isFetching, refetch } = useDashboardStats('SUPER_ADMIN');

  const totalAds = stats?.totalAds ?? 0;
  const openReports = stats?.openReports ?? 0;
  const pendingAds = stats?.pendingAds ?? 0;
  const grossRevenue = stats?.grossRevenueInr ?? 0;

  const statusData = stats?.statusDistribution?.filter((s) => s.value > 0).length
    ? stats.statusDistribution.filter((s) => s.value > 0)
    : [
        { name: 'Active', value: stats?.activeAds ?? 0, color: '#10b981' },
        { name: 'Pending Review', value: stats?.pendingAds ?? 0, color: '#f59e0b' },
        { name: 'Sold / Closed', value: stats?.soldAds ?? 0, color: '#3b82f6' },
        { name: 'Expired', value: stats?.expiredAds ?? 0, color: '#94a3b8' },
        { name: 'Rejected', value: stats?.rejectedAds ?? 0, color: '#ef4444' },
      ].filter((s) => s.value > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Executive Dashboard Header & Real-time Platform Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Executive Overview
            </h1>
            <Badge
              variant="outline"
              className="px-2.5 py-0.5 text-xs font-bold border-primary/30 text-primary bg-primary/5"
            >
              Control Center
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Centralized telemetry for marketplace activity, financial performance, and moderation health.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Platform Active</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-2 text-xs font-semibold border-border hover:bg-muted"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh Feed'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Glanceable Quick Operational Summary Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Listings */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="group p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Listings Inventory</span>
            <ShoppingBag className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {totalAds.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            {stats?.activeAds ?? 0} active on platform
          </div>
        </div>

        {/* Gross Revenue */}
        <div
          onClick={() => setActiveTab('payments')}
          className="group p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Gross Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
            ₹{grossRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-muted-foreground font-medium mt-1">
            From ads promotions & badges
          </div>
        </div>

        {/* Moderation Queue */}
        <div
          onClick={() => navigate('/moderation')}
          className="group p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Pending Reviews</span>
            <ShieldCheck className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {pendingAds}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
            Awaiting moderator decision →
          </div>
        </div>

        {/* Safety Reports */}
        <div
          onClick={() => navigate('/reports')}
          className="group p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Open Reports</span>
            <Zap className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
            {openReports}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
            User safety incidents pending →
          </div>
        </div>
      </div>

      {/* 3. Module Tabs for Easy Inspection and Focused Monitoring */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        {/* Module Tabs Navigation Bar */}
        <div className="overflow-x-auto no-scrollbar py-1">
          <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border flex items-center gap-1 w-max sm:w-auto h-auto">
            <TabsTrigger
              value="all"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Executive Overview</span>
            </TabsTrigger>

            <TabsTrigger
              value="payments"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payment Overview & Financials</span>
            </TabsTrigger>

            <TabsTrigger
              value="velocity"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Realtime Velocity</span>
            </TabsTrigger>

            <TabsTrigger
              value="inventory"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Inventory & Moderation</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Comprehensive Executive Overview */}
        <TabsContent value="all" className="space-y-8 mt-0">
          {/* Revenue & Payment Overview Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Module 1 · Payment & Revenue Telemetry
              </span>
              <button
                onClick={() => setActiveTab('payments')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Inspect payments module</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <RevenueOverviewSection />
          </div>

          {/* Real-time Users & Listings Velocity with Socket.IO */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Module 2 · Marketplace Velocity & Live Streaming
              </span>
              <button
                onClick={() => setActiveTab('velocity')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Inspect velocity module</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <RealtimeVelocitySection />
          </div>

          {/* Operational Inventory Distribution & Shortcuts */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Module 3 · Inventory Health & Moderation Queues
              </span>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Inspect inventory module</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Listing Inventory Status Donut */}
              <Card className="lg:col-span-8 rounded-3xl border border-border bg-card shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-extrabold text-foreground">
                        Listing Status Distribution
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Live breakdown of active marketplace inventory</p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {totalAds.toLocaleString('en-IN')} Total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                    <div className="relative h-48 w-48 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const item = payload[0];
                                return (
                                  <div className="bg-popover text-popover-foreground border border-border p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                                    <p className="font-bold">{item.name}</p>
                                    <p className="font-mono font-bold text-primary">
                                      {Number(item.value).toLocaleString('en-IN')} listings
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                        <div className="text-base font-black font-mono text-foreground">
                          {totalAds.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                          Listings
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 w-full text-xs">
                      {statusData.map((s) => {
                        const percent = totalAds > 0 ? `${((s.value / totalAds) * 100).toFixed(0)}%` : '0%';
                        return (
                          <div key={s.name} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-b-0">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                              <span className="font-semibold text-foreground">{s.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold font-mono text-foreground">{percent}</span>
                              <span className="text-[11px] text-muted-foreground ml-1 font-mono">
                                ({s.value.toLocaleString('en-IN')})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Operations Column */}
              <div className="lg:col-span-4 space-y-3">
                <div
                  onClick={() => navigate('/moderation')}
                  className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition cursor-pointer shadow-xs group"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>{pendingAds} Pending Reviews</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Moderation queue awaiting decision
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => navigate('/reports')}
                  className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition cursor-pointer shadow-xs group"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform shrink-0">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>{openReports} Open Safety Reports</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Scam, counterfeit & dispute tickets
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => navigate('/payments')}
                  className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition cursor-pointer shadow-xs group"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>₹{grossRevenue.toLocaleString('en-IN')} Total Volume</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Open complete Payments Ledger →
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Dedicated Payment Overview & Financials */}
        <TabsContent value="payments" className="space-y-6 mt-0">
          <RevenueOverviewSection />
        </TabsContent>

        {/* Tab 3: Dedicated Realtime Velocity */}
        <TabsContent value="velocity" className="space-y-6 mt-0">
          <RealtimeVelocitySection />
        </TabsContent>

        {/* Tab 4: Dedicated Inventory & Moderation */}
        <TabsContent value="inventory" className="space-y-6 mt-0">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Listing Inventory Status Donut */}
            <Card className="lg:col-span-7 rounded-3xl border border-border bg-card shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-extrabold text-foreground">
                      Listing Status Distribution
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Marketplace listings divided by lifecycle phase</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {totalAds.toLocaleString('en-IN')} Total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                  <div className="relative h-56 w-56 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0];
                              return (
                                <div className="bg-popover text-popover-foreground border border-border p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                                  <p className="font-bold">{item.name}</p>
                                  <p className="font-mono font-bold text-primary">
                                    {Number(item.value).toLocaleString('en-IN')} listings
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <div className="text-lg font-black font-mono text-foreground">
                        {totalAds.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                        Total Ads
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 w-full text-xs">
                    {statusData.map((s) => {
                      const percent = totalAds > 0 ? `${((s.value / totalAds) * 100).toFixed(0)}%` : '0%';
                      return (
                        <div key={s.name} className="flex items-center justify-between border-b border-border/50 pb-2.5 last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="font-semibold text-foreground">{s.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold font-mono text-foreground">{percent}</span>
                            <span className="text-[11px] text-muted-foreground ml-1 font-mono">
                              ({s.value.toLocaleString('en-IN')})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Moderation & Audit Actions */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="rounded-3xl border border-border bg-card shadow-xs p-5 space-y-4">
                <div>
                  <h4 className="text-base font-extrabold text-foreground">Operational Moderation Center</h4>
                  <p className="text-xs text-muted-foreground">Direct actions and safety enforcement shortcuts</p>
                </div>

                <div className="space-y-3">
                  <div
                    onClick={() => navigate('/moderation')}
                    className="p-3.5 rounded-2xl border border-border bg-muted/30 hover:bg-muted/70 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Review Pending Listings</div>
                        <div className="text-[11px] text-muted-foreground">{pendingAds} items in approval queue</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>

                  <div
                    onClick={() => navigate('/reports')}
                    className="p-3.5 rounded-2xl border border-border bg-muted/30 hover:bg-muted/70 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Investigate Safety Reports</div>
                        <div className="text-[11px] text-muted-foreground">{openReports} reports need immediate review</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>

                  <div
                    onClick={() => navigate('/payments')}
                    className="p-3.5 rounded-2xl border border-border bg-muted/30 hover:bg-muted/70 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">View Transactions Ledger</div>
                        <div className="text-[11px] text-muted-foreground">Inspect settlements and gateway receipts</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
