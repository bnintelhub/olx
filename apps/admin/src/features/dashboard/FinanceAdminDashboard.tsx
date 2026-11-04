import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
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
  IndianRupee,
  TrendingUp,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const PAYOUT_CHART_DATA = [
  { day: 'Mon', revenue: 45000, payout: 22000 },
  { day: 'Tue', revenue: 82000, payout: 40000 },
  { day: 'Wed', revenue: 60000, payout: 31000 },
  { day: 'Thu', revenue: 95000, payout: 48000 },
  { day: 'Fri', revenue: 110000, payout: 62000 },
  { day: 'Sat', revenue: 140000, payout: 85000 },
  { day: 'Sun', revenue: 88000, payout: 52000 },
];

const TRANSACTIONS = [
  { id: '#TXN-9024', user: 'TechHub Store', type: 'Featured Ad Package', amount: '₹1,499', status: 'SUCCESS', date: 'Today, 2:15 PM' },
  { id: '#TXN-9023', user: 'Vikram Motors', type: 'Dealer Annual Subscription', amount: '₹14,999', status: 'SUCCESS', date: 'Today, 1:40 PM' },
  { id: '#TXN-9022', user: 'Kunal Joshi', type: 'Seller Escrow Payout', amount: '₹42,000', status: 'SUCCESS', date: 'Today, 11:20 AM' },
  { id: '#TXN-9021', user: 'Pooja Verma', type: 'Bump Up Promotion', amount: '₹499', status: 'REFUNDED', date: 'Yesterday' },
  { id: '#TXN-9020', user: 'Rahul Sharma', type: 'Featured Ad (7 Days)', amount: '₹999', status: 'SUCCESS', date: 'Yesterday' },
];

export function FinanceAdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Revenue & Payouts</h2>
          <p className="text-xs text-muted-foreground">
            Track transactions, payouts, refunds, invoices, and overall marketplace financial health.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 font-semibold text-xs text-emerald-600 border-emerald-500/20 bg-emerald-500/10">
          Escrow Engine: Active & Reconciled
        </Badge>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Revenue</span>
            <IndianRupee className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹12,46,530</div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+18.7% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Payouts</span>
            <ArrowDownLeft className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹6,20,000</div>
            <p className="text-[11px] text-muted-foreground mt-1">Disbursed to sellers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Platform Net Earnings</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">₹6,26,530</div>
            <p className="text-[11px] text-muted-foreground mt-1">After seller releases & taxes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Pending Settlements</span>
            <Receipt className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">₹1,18,400</div>
            <p className="text-[11px] text-muted-foreground mt-1">14 settlements in queue</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart: Daily Inflow vs Payouts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold">Daily Inflow & Seller Payouts</CardTitle>
            <p className="text-xs text-muted-foreground">Weekly comparison between customer payments and seller settlements</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-muted-foreground">Inflow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
              <span className="text-muted-foreground">Payouts</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={PAYOUT_CHART_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip
                formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, '']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payout" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Transactions Ledger Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold">Recent Financial Transactions</CardTitle>
          <p className="text-xs text-muted-foreground">Audit log of payments, promotional ad purchases, and escrow payouts.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider">
              <TableRow>
                <TableHead className="px-5 py-3">Transaction ID</TableHead>
                <TableHead className="px-5 py-3">User / Entity</TableHead>
                <TableHead className="px-5 py-3">Type</TableHead>
                <TableHead className="px-5 py-3">Amount</TableHead>
                <TableHead className="px-5 py-3">Status</TableHead>
                <TableHead className="px-5 py-3">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TRANSACTIONS.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="px-5 py-3 font-mono font-bold text-foreground">{txn.id}</TableCell>
                  <TableCell className="px-5 py-3 font-semibold text-foreground">{txn.user}</TableCell>
                  <TableCell className="px-5 py-3 text-muted-foreground">{txn.type}</TableCell>
                  <TableCell className="px-5 py-3 font-bold text-foreground">{txn.amount}</TableCell>
                  <TableCell className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        txn.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {txn.status === 'SUCCESS' && <CheckCircle2 className="h-3 w-3" />}
                      {txn.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-muted-foreground">{txn.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

