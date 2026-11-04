import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Eye,
  MessageSquare,
  TrendingUp,
  Download,
  Lock,
  ArrowUpRight,
  PieChart as PieIcon,
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

const ANALYTICS_TREND = [
  { day: 'Oct 1', views: 320000, leads: 9200 },
  { day: 'Oct 5', views: 380000, leads: 10400 },
  { day: 'Oct 9', views: 420000, leads: 11800 },
  { day: 'Oct 13', views: 460000, leads: 12900 },
  { day: 'Oct 17', views: 510000, leads: 14200 },
  { day: 'Oct 21', views: 570000, leads: 15600 },
  { day: 'Oct 25', views: 640000, leads: 17200 },
  { day: 'Oct 29', views: 710000, leads: 19100 },
];

const CATEGORY_CONVERSION = [
  { category: 'Mobiles & Tablets', views: '4.8M', leads: '138K', conv: '2.9%', share: '42%' },
  { category: 'Cars & Motorcycles', views: '3.6M', leads: '98K', conv: '2.7%', share: '28%' },
  { category: 'Real Estate & Properties', views: '2.1M', leads: '52K', conv: '2.5%', share: '18%' },
  { category: 'Electronics & Appliances', views: '1.2M', leads: '26K', conv: '2.2%', share: '8%' },
  { category: 'Furniture & Decor', views: '700K', leads: '12K', conv: '1.7%', share: '4%' },
];

export function AnalystDashboard() {
  const handleExport = () => {
    toast.success('Analytics report exported to CSV successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Platform Analytics</h2>
          <p className="text-xs text-muted-foreground">
            Business intelligence, traffic trends, conversion ratios, and marketplace health insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <Lock className="h-3 w-3" />
            <span>Read-Only Access</span>
          </Badge>
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>Export BI Report</span>
          </Button>
        </div>
      </div>

      {/* 3 Key Performance Pills from the Visual Infographic */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Total Views */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Views</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Eye className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">12.4M</div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+24.0% vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Buyer Leads */}
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Buyer Leads</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">326K</div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+15.2% leads generated</span>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Conversion</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">2.8%</div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+0.4% conversion velocity</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic vs Leads Trend Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold">Platform Traffic & Inquiries Velocity</CardTitle>
            <p className="text-xs text-muted-foreground">30-day view engagement and chat lead generation curve</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-muted-foreground">Page Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
              <span className="text-muted-foreground">Buyer Inquiries</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ANALYTICS_TREND} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
              <Tooltip
                formatter={(val: number) => [val.toLocaleString('en-IN'), '']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorTraffic)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Performance & Lead Funnel Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold">Category Market Share & Conversion</CardTitle>
          <p className="text-xs text-muted-foreground">Breakdown of inquiry performance and lead yield across top verticals.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Traffic (Views)</th>
                  <th className="px-5 py-3">Leads Generated</th>
                  <th className="px-5 py-3">Conversion Rate</th>
                  <th className="px-5 py-3 text-right">Market Share</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {CATEGORY_CONVERSION.map((c) => (
                  <tr key={c.category} className="hover:bg-muted/30 transition">
                    <td className="px-5 py-3 font-bold text-foreground">{c.category}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{c.views}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{c.leads}</td>
                    <td className="px-5 py-3 font-bold text-emerald-600">{c.conv}</td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">{c.share}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
