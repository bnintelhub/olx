import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CATEGORY_SHARE = [
  { name: 'Cars', value: 38, color: '#3b82f6' },
  { name: 'Mobiles', value: 29, color: '#10b981' },
  { name: 'Properties', value: 18, color: '#f59e0b' },
  { name: 'Bikes', value: 10, color: '#8b5cf6' },
  { name: 'Other', value: 5, color: '#6b7280' },
];

const MONTHLY_LEADS = [
  { month: 'Oct', chats: 12400, calls: 8900 },
  { month: 'Nov', chats: 15600, calls: 11200 },
  { month: 'Dec', chats: 18900, calls: 13400 },
  { month: 'Jan', chats: 22100, calls: 15600 },
  { month: 'Feb', chats: 24500, calls: 18200 },
  { month: 'Mar', chats: 28900, calls: 21400 },
];

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Marketplace Analytics & BI</h2>
        <p className="text-sm text-muted-foreground">
          Real-time performance reports, buyer leads conversion, and category volume distribution.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly Lead Engagement (Chats & Calls)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_LEADS}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="chats" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Chat Inquiries" />
                <Bar dataKey="calls" fill="#10b981" radius={[4, 4, 0, 0]} name="Phone Calls" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Listing Volume by Category (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CATEGORY_SHARE}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {CATEGORY_SHARE.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
