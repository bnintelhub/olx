import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Users,
  ShoppingBag,
  IndianRupee,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
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
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

const CHART_DATA = [
  { name: 'Mon', revenue: 14000, ads: 420 },
  { name: 'Tue', revenue: 22000, ads: 580 },
  { name: 'Wed', revenue: 19500, ads: 510 },
  { name: 'Thu', revenue: 27800, ads: 690 },
  { name: 'Fri', revenue: 31000, ads: 840 },
  { name: 'Sat', revenue: 42500, ads: 1120 },
  { name: 'Sun', revenue: 48000, ads: 1290 },
];

export function DashboardPage() {
  const role = useAuthStore((s) => s.role) || 'SUPER_ADMIN';
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Operational Overview</h2>
          <p className="text-sm text-muted-foreground">
            Platform performance, listings volume, revenue metrics and priority review queues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="px-3 py-1 text-xs">
            Operational Status: 100% Online
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14,289</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+18.4% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Classified Ads</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,942</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+12.1% fresh listings</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹2,45,800</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+24.5% packages & promos</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Moderation</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">34</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires review by Moderator or Admin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-7 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Weekly Growth & Transactions</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Queues for Role */}
        <Card className="col-span-7 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Operational Queues</CardTitle>
            <Badge variant="outline">{role}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="text-sm font-medium">Pending Listing Reviews</div>
                <div className="text-xs text-muted-foreground">High-value ads awaiting approval</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/listings')}>
                <span>Review</span>
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="text-sm font-medium">User Reports & Complaints</div>
                <div className="text-xs text-muted-foreground">Scam and counterfeit reports</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/reports')}>
                <span>Investigate</span>
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Pending Refund Requests</div>
                <div className="text-xs text-muted-foreground">Finance team verification queue</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/payments')}>
                <span>Process</span>
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
