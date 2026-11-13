import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Tag,
  Eye,
  Clock,
  Flag,
  Package,
  Coins,
  Layers,
  Activity,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CircleDollarSign,
  BarChart3,
  TrendingUp,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  ChevronDown,
  Check,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useDashboardStats } from './hook/useDashboardQuery';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../components/ui/dropdown-menu';
import { formatDate } from '../../lib/utils';

// Mini sparkline wave for top KPI cards
const SparklineWave = ({ color }: { color: string }) => (
  <div className="w-full h-5 overflow-hidden mt-1 opacity-70">
    <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
      <path
        d="M0,18 C15,8 30,22 45,11 C60,3 75,20 90,8 L100,12"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'LISTINGS' | 'PAYMENTS' | 'USERS' | 'REPORTS'>('ALL');

  const { data: stats, isLoading } = useDashboardStats('SUPER_ADMIN');

  // Real database metrics with zero fake defaults
  const totalUsers = stats?.totalUsers ?? 0;
  const totalAds = stats?.totalAds ?? 0;
  const activeAds = stats?.activeAds ?? 0;
  const pendingAds = stats?.pendingAds ?? 0;
  const openReports = stats?.openReports ?? 0;
  const totalOrders = stats?.totalOrders || stats?.totalBoosts || 0;

  // Real Revenue Summary
  const revenueSummary = stats?.revenueSummary || {
    totalEarned: stats?.grossRevenueInr ?? 0,
    today: 0,
    thisWeek: 0,
    thisMonth: stats?.grossRevenueInr ?? 0,
  };

  const revenueChartData = stats?.revenueTrend || [];

  // Real Category Distribution
  const categoryData = stats?.categoryDistribution || [];

  // Real Recent Activity from Audit Logs
  const rawActivities = stats?.recentActivity || [];
  const filteredActivities = rawActivities.filter((act) =>
    activityFilter === 'ALL' ? true : act.type === activityFilter
  );

  // Real Top Locations
  const topLocations = stats?.topLocations || [];
  const maxLocationCount = topLocations.length > 0 ? Math.max(...topLocations.map((l) => l.count)) : 1;

  // Moderation counts
  const spamCount = stats?.spamReportsCount ?? 0;
  const policyViolationCount = stats?.policyViolationCount ?? 0;
  const hasPendingModeration = pendingAds > 0 || openReports > 0 || spamCount > 0 || policyViolationCount > 0;

  return (
    <div className="space-y-5 pb-10">
      {/* 1. Header (No redundant avatar/bell since AdminHeader already has them) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Platform overview, performance and revenue at a glance.
          </p>
        </div>

        {/* Only Date Range Selector */}
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-muted transition cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{selectedPeriod}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              {['Today', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Year'].map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span>{p}</span>
                  {selectedPeriod === p && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Top Metric KPI Row (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Total Users */}
        <div
          onClick={() => navigate('/users')}
          className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Users</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {totalUsers > 0 ? totalUsers.toLocaleString('en-IN') : '0'}
            </div>
            {totalUsers > 0 ? (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 inline-flex items-center gap-0.5">
                <span>Active platform members</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 mt-1 block">Data is not updated yet</span>
            )}
          </div>
          {totalUsers > 0 && <SparklineWave color="#8b5cf6" />}
        </div>

        {/* Total Listings */}
        <div
          onClick={() => navigate('/listings')}
          className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Listings</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {totalAds > 0 ? totalAds.toLocaleString('en-IN') : '0'}
            </div>
            {totalAds > 0 ? (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 inline-flex items-center gap-0.5">
                <span>All marketplace ads</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 mt-1 block">Data is not updated yet</span>
            )}
          </div>
          {totalAds > 0 && <SparklineWave color="#3b82f6" />}
        </div>

        {/* Active Listings */}
        <div
          onClick={() => navigate('/listings')}
          className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Active Listings</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {activeAds > 0 ? activeAds.toLocaleString('en-IN') : '0'}
            </div>
            {activeAds > 0 ? (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 inline-flex items-center gap-0.5">
                <span>Live in catalog</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 mt-1 block">Data is not updated yet</span>
            )}
          </div>
          {activeAds > 0 && <SparklineWave color="#10b981" />}
        </div>

        {/* Pending Review */}
        <div
          onClick={() => navigate('/moderation')}
          className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Pending Review</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {pendingAds.toLocaleString('en-IN')}
            </div>
            {pendingAds > 0 ? (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1 inline-flex items-center gap-0.5">
                <span>Awaiting review</span>
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 mt-1 block">Queue is clear</span>
            )}
          </div>
          {pendingAds > 0 && <SparklineWave color="#f59e0b" />}
        </div>

        {/* Reported Ads */}
        <div
          onClick={() => navigate('/reports')}
          className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Flag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Reported Ads</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {openReports.toLocaleString('en-IN')}
            </div>
            {openReports > 0 ? (
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1 inline-flex items-center gap-0.5">
                <span>Action required</span>
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 mt-1 block">Zero open reports</span>
            )}
          </div>
          {openReports > 0 && <SparklineWave color="#ef4444" />}
        </div>

        {/* Total Orders */}
        <div
          onClick={() => navigate('/payments')}
          className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Orders</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {totalOrders > 0 ? totalOrders.toLocaleString('en-IN') : '0'}
            </div>
            {totalOrders > 0 ? (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 inline-flex items-center gap-0.5">
                <span>Paid transactions</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 mt-1 block">Data is not updated yet</span>
            )}
          </div>
          {totalOrders > 0 && <SparklineWave color="#06b6d4" />}
        </div>
      </div>

      {/* 3. Middle Section: Revenue Overview (Left), Listings by Category (Center), Platform Health & Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (5/12): Revenue Overview */}
        <div className="lg:col-span-5 bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Revenue Overview</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Report</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Sub-KPI Row */}
            <div className="grid grid-cols-4 gap-2 pt-3 pb-2 text-left">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">Total Earned</span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block mt-0.5">
                  ₹{revenueSummary.totalEarned.toLocaleString('en-IN')}
                </span>
                {revenueSummary.totalEarned === 0 && (
                  <span className="text-[9px] text-slate-400 block">Data is not updated yet</span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">Today</span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block mt-0.5">
                  ₹{revenueSummary.today.toLocaleString('en-IN')}
                </span>
                {revenueSummary.today === 0 && (
                  <span className="text-[9px] text-slate-400 block">Data is not updated yet</span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">This Week</span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block mt-0.5">
                  ₹{revenueSummary.thisWeek.toLocaleString('en-IN')}
                </span>
                {revenueSummary.thisWeek === 0 && (
                  <span className="text-[9px] text-slate-400 block">Data is not updated yet</span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">This Month</span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block mt-0.5">
                  ₹{revenueSummary.thisMonth.toLocaleString('en-IN')}
                </span>
                {revenueSummary.thisMonth === 0 && (
                  <span className="text-[9px] text-slate-400 block">Data is not updated yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Area Chart or Empty State */}
          {revenueChartData.length > 0 ? (
            <div className="h-44 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purpleAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        return (
                          <div className="bg-[#1e1b4b] text-white p-2 rounded-xl text-xs shadow-xl space-y-0.5">
                            <p className="text-[10px] text-purple-200">{item.payload.date}</p>
                            <p className="font-extrabold text-sm font-mono text-purple-300">
                              ₹{Number(item.value).toLocaleString('en-IN')}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#purpleAreaGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl mt-2 text-slate-400">
              <Coins className="w-7 h-7 opacity-30 mb-1 text-purple-500" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Data is not updated yet</p>
              <p className="text-[10px] text-slate-400 mt-0.5">No revenue trend points recorded for this period.</p>
            </div>
          )}
        </div>

        {/* Center Column (4/12): Listings by Category */}
        <div className="lg:col-span-4 bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Listings by Category</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Donut Chart + Legend or Empty State */}
          {categoryData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 py-2 my-auto">
              <div className="relative w-40 h-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0];
                          return (
                            <div className="bg-slate-900 text-white p-2 rounded-xl text-xs shadow-xl">
                              <p className="font-bold">{item.name}</p>
                              <p className="font-mono text-purple-300">
                                {Number(item.value).toLocaleString('en-IN')} ads
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Donut Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                    {totalAds.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Total Ads</span>
                </div>
              </div>

              {/* Category Percentages Legend */}
              <div className="flex-1 w-full space-y-1.5 text-xs">
                {categoryData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-[11px] font-medium">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-bold font-mono text-slate-800 dark:text-slate-200 shrink-0">
                      {totalAds > 0 ? `${((item.value / totalAds) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl my-auto text-slate-400">
              <Layers className="w-7 h-7 opacity-30 mb-1 text-blue-500" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Data is not updated yet</p>
              <p className="text-[10px] text-slate-400 mt-0.5">No categorized listings found.</p>
            </div>
          )}
        </div>

        {/* Right Column (3/12): Platform Health + Quick Actions */}
        <div className="lg:col-span-3 space-y-4 flex flex-col justify-between">
          {/* Platform Health */}
          <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-border/60">
              <Activity className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Platform Health</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>API Status</span>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50">
                  Operational
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Media Storage</span>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50">
                  Healthy
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Background Jobs</span>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50">
                  Running
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Database</span>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50">
                  Connected
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-4 space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-border/60">
              <Zap className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => navigate('/moderation')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50/60 dark:hover:bg-muted transition text-slate-700 dark:text-slate-200 group cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <ShoppingBag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="font-medium text-[11px] truncate">Review Pending Ads ({pendingAds})</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50/60 dark:hover:bg-muted transition text-slate-700 dark:text-slate-200 group cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Flag className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="font-medium text-[11px] truncate">Handle Reports ({openReports})</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/promotions')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50/60 dark:hover:bg-muted transition text-slate-700 dark:text-slate-200 group cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-medium text-[11px] truncate">Create Promotion</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/revenue')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50/60 dark:hover:bg-muted transition text-slate-700 dark:text-slate-200 group cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium text-[11px] truncate">Manage Plans</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Horizontal Revenue Sub-Metrics Strip (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Successful Payments */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block leading-tight">Successful Payments</span>
            <div className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {(stats?.successfulPayments ?? 0).toLocaleString('en-IN')}
            </div>
            {(stats?.successfulPayments ?? 0) === 0 && (
              <span className="text-[9px] text-slate-400 block mt-0.5">Data is not updated yet</span>
            )}
          </div>
        </div>

        {/* Failed Payments */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block leading-tight">Failed Payments</span>
            <div className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {(stats?.failedPayments ?? 0).toLocaleString('en-IN')}
            </div>
            {(stats?.failedPayments ?? 0) === 0 && (
              <span className="text-[9px] text-slate-400 block mt-0.5">Zero failures</span>
            )}
          </div>
        </div>

        {/* Refunds */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block leading-tight">Refunds</span>
            <div className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {(stats?.refunds ?? 0).toLocaleString('en-IN')}
            </div>
            {(stats?.refunds ?? 0) === 0 && (
              <span className="text-[9px] text-slate-400 block mt-0.5">Zero refunds</span>
            )}
          </div>
        </div>

        {/* Avg. Listing Price */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CircleDollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block leading-tight">Avg. Listing Price</span>
            <div className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              ₹{(stats?.avgListingPrice ?? 0).toLocaleString('en-IN')}
            </div>
            {(stats?.avgListingPrice ?? 0) === 0 && (
              <span className="text-[9px] text-slate-400 block mt-0.5">Data is not updated yet</span>
            )}
          </div>
        </div>

        {/* Avg. Earning / Day */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block leading-tight">Today Revenue</span>
            <div className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              ₹{(stats?.revenueSummary?.today ?? 0).toLocaleString('en-IN')}
            </div>
            {(stats?.revenueSummary?.today ?? 0) === 0 && (
              <span className="text-[9px] text-slate-400 block mt-0.5">Data is not updated yet</span>
            )}
          </div>
        </div>

        {/* Growth (Revenue) */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block leading-tight">Active Promotions</span>
            <div className="text-base font-black text-emerald-600 leading-tight mt-0.5">
              {(stats?.activeBoosts ?? 0).toLocaleString('en-IN')}
            </div>
            {(stats?.activeBoosts ?? 0) === 0 && (
              <span className="text-[9px] text-slate-400 block mt-0.5">Data is not updated yet</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Recent Activity (Left), Moderation Queue (Center), Top Locations (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Activity */}
        <div className="lg:col-span-5 bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-border/60 gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h3>
            </div>
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-muted p-0.5 rounded-lg text-[10px]">
              {(['ALL', 'LISTINGS', 'PAYMENTS', 'USERS', 'REPORTS'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActivityFilter(filter)}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    activityFilter === filter
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {filter === 'ALL' ? 'All' : filter[0] + filter.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            {filteredActivities.length > 0 ? (
              <>
                <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 pb-2 border-b border-slate-50 dark:border-border/40">
                  <span className="col-span-3">Time</span>
                  <span className="col-span-5">Activity</span>
                  <span className="col-span-4 text-right">Details</span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-border/40 text-xs">
                  {filteredActivities.map((act) => (
                    <div key={act.id} className="grid grid-cols-12 items-center py-2.5">
                      <span className="col-span-3 text-[11px] text-slate-400 truncate">
                        {act.time ? formatDate(act.time) : '-'}
                      </span>
                      <div className="col-span-5 flex items-center gap-1.5 truncate">
                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {act.title}
                        </span>
                      </div>
                      <span className="col-span-4 text-[11px] text-slate-500 dark:text-slate-400 text-right truncate">
                        {act.details}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-10 flex flex-col items-center justify-center text-center text-slate-400 border border-dashed rounded-xl my-2">
                <Clock className="w-6 h-6 opacity-30 mb-1 text-purple-500" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Data is not updated yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No recent activity matching this filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Moderation Queue */}
        <div className="lg:col-span-4 bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Moderation Queue</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/moderation')}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {hasPendingModeration ? (
              <div className="divide-y divide-slate-50 dark:divide-border/40 mt-2 text-xs">
                {/* Pending Review */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-semibold text-xs">Pending Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200/50">
                      {pendingAds}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/moderation')}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>

                {/* Reported Listings */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Flag className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="font-semibold text-xs">Reported Listings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border border-rose-200/50">
                      {openReports}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/reports')}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>

                {/* Spam / Duplicate */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-semibold text-xs">Spam / Duplicate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-200/50">
                      {spamCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/reports')}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>

                {/* Policy Violation */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-semibold text-xs">Policy Violation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200/50">
                      {policyViolationCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/moderation')}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center justify-center text-center text-slate-400 border border-dashed rounded-xl my-auto">
                <ShieldCheck className="w-6 h-6 opacity-40 mb-1 text-emerald-500" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">All queues clear</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No listings or reports awaiting review.</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Locations (Listings) */}
        <div className="lg:col-span-3 bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-border/60">
              <MapPin className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Locations (Listings)</h3>
            </div>

            {topLocations.length > 0 ? (
              <div className="space-y-3.5 mt-3 text-xs">
                {topLocations.map((loc) => {
                  const pct = Math.round((loc.count / maxLocationCount) * 100);
                  return (
                    <div key={loc.name} className="space-y-1">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{loc.name}</span>
                        </div>
                        <span className="font-bold font-mono text-slate-900 dark:text-white">
                          {loc.count.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-muted h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center justify-center text-center text-slate-400 border border-dashed rounded-xl my-auto">
                <MapPin className="w-6 h-6 opacity-30 mb-1 text-purple-500" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Data is not updated yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No location data available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
