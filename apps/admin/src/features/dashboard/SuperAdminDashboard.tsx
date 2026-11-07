import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ShieldCheck, Zap, Activity, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useDashboardStats } from './hook/useDashboardQuery';
import { RevenueOverviewSection } from './components/RevenueOverviewSection';
import { RealtimeVelocitySection } from './components/RealtimeVelocitySection';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
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
    <div className="space-y-8 pb-10">
      {/* 1. Complete Prominent Revenue Overview & Interactive Trend */}
      <RevenueOverviewSection />

      {/* 2. Real-time Users & Listings Velocity with Socket.IO */}
      <RealtimeVelocitySection />

      {/* 3. Operational Inventory Distribution & Shortcuts */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Listing Inventory Status Donut */}
        <Card className="lg:col-span-8 rounded-3xl border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Listing Status Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">Live breakdown of marketplace inventory</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
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
                      formatter={(val: number) => [val.toLocaleString('en-IN'), '']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-sm font-extrabold text-foreground">{totalAds.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Total Listings</div>
                </div>
              </div>

              <div className="flex-1 space-y-2.5 w-full text-xs">
                {statusData.map((s) => {
                  const percent = totalAds > 0 ? `${((s.value / totalAds) * 100).toFixed(0)}%` : '0%';
                  return (
                    <div key={s.name} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="font-medium text-foreground">{s.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground">{percent}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({s.value.toLocaleString('en-IN')})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Operations Column */}
        <div className="lg:col-span-4 space-y-4">
          <div
            onClick={() => navigate('/moderation')}
            className="flex items-center gap-3.5 rounded-2xl border bg-card p-4 hover:border-primary/50 transition cursor-pointer shadow-2xs group"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 group-hover:scale-105 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">{pendingAds} Pending Reviews</div>
              <div className="text-[11px] text-muted-foreground">Moderation queue awaiting decision</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/reports')}
            className="flex items-center gap-3.5 rounded-2xl border bg-card p-4 hover:border-primary/50 transition cursor-pointer shadow-2xs group"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">{openReports} Open Safety Reports</div>
              <div className="text-[11px] text-muted-foreground">Scam, counterfeit and duplicate complaints</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/payments')}
            className="flex items-center gap-3.5 rounded-2xl border bg-card p-4 hover:border-primary/50 transition cursor-pointer shadow-2xs group"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">₹{grossRevenue.toLocaleString('en-IN')} Promos</div>
              <div className="text-[11px] text-muted-foreground">Go to full Payments Analytics page →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
