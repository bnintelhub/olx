import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatCurrency } from '../../lib/utils';
import {
  IndianRupee,
  RotateCcw,
  Download,
  Search,
  CreditCard,
  QrCode,
  Building2,
  FileText,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface TransactionRecord {
  id: string;
  txnRef: string;
  customerName: string;
  customerEmail: string;
  method: 'UPI' | 'RAZORPAY' | 'NETBANKING' | 'CARDS';
  packageName: string;
  amount: number;
  status: 'SUCCESS' | 'REFUNDED' | 'PENDING';
  date: string;
  invoiceId: string;
}

const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'pay_1',
    txnRef: 'TXN_99182_UPI',
    customerName: 'Bharat Motors (Vikram S.)',
    customerEmail: 'sales@bharatmotors.co.in',
    method: 'UPI',
    packageName: 'Pro Dealer Annual Tier (500 Ads)',
    amount: 14999,
    status: 'SUCCESS',
    date: 'Today, 2:15 PM',
    invoiceId: 'INV-2026-0891',
  },
  {
    id: 'pay_2',
    txnRef: 'TXN_99183_RZP',
    customerName: 'Rahul Sharma',
    customerEmail: 'rahul.s@techhub.in',
    method: 'RAZORPAY',
    packageName: 'Featured Ad Boost (7 Days Top Rank)',
    amount: 999,
    status: 'SUCCESS',
    date: 'Today, 1:40 PM',
    invoiceId: 'INV-2026-0892',
  },
  {
    id: 'pay_3',
    txnRef: 'TXN_99184_UPI',
    customerName: 'Kunal Joshi',
    customerEmail: 'kunal.j@gmail.com',
    method: 'UPI',
    packageName: 'Urgent Distress Sale Badge',
    amount: 299,
    status: 'REFUNDED',
    date: 'Yesterday, 6:10 PM',
    invoiceId: 'INV-2026-0889',
  },
  {
    id: 'pay_4',
    txnRef: 'TXN_99185_NET',
    customerName: 'Apex Realty Network',
    customerEmail: 'accounts@apexrealty.in',
    method: 'NETBANKING',
    packageName: 'Builder Enterprise Showcase (30 Days)',
    amount: 24999,
    status: 'SUCCESS',
    date: 'Oct 31, 2026',
    invoiceId: 'INV-2026-0885',
  },
  {
    id: 'pay_5',
    txnRef: 'TXN_99186_CRD',
    customerName: 'Priya Verma',
    customerEmail: 'priya.v@gmail.com',
    method: 'CARDS',
    packageName: 'Home Delivery Assurance Escrow',
    amount: 42000,
    status: 'SUCCESS',
    date: 'Oct 30, 2026',
    invoiceId: 'INV-2026-0880',
  },
  {
    id: 'pay_6',
    txnRef: 'TXN_99187_UPI',
    customerName: 'Amit Verma',
    customerEmail: 'amit.v@outlook.com',
    method: 'UPI',
    packageName: '3x Bump Up Promotion Bundle',
    amount: 499,
    status: 'PENDING',
    date: 'Oct 29, 2026',
    invoiceId: 'INV-2026-0878',
  },
];

export function PaymentsPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.txnRef.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
      t.packageName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const processRefund = (id: string, txnRef: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          toast.success(`Processed full reversal refund for ${txnRef}`);
          return { ...t, status: 'REFUNDED' };
        }
        return t;
      })
    );
  };

  const getMethodBadge = (method: TransactionRecord['method']) => {
    switch (method) {
      case 'UPI':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
            <QrCode className="h-3 w-3 text-emerald-600" />
            <span>UPI / QR</span>
          </span>
        );
      case 'RAZORPAY':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
            <CreditCard className="h-3 w-3 text-blue-600" />
            <span>Razorpay</span>
          </span>
        );
      case 'NETBANKING':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
            <Building2 className="h-3 w-3 text-purple-600" />
            <span>NetBanking</span>
          </span>
        );
      case 'CARDS':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
            <CreditCard className="h-3 w-3 text-amber-600" />
            <span>Cards</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Payments, Invoices & Escrow</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reconciliation ledger for package subscriptions, ad boosts, verified dealer packages, and refunds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs"
            onClick={() => toast.success('Exporting GST Reconciliation CSV snapshot...')}
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export GST Ledger</span>
          </Button>
        </div>
      </div>

      {/* 4 Financial Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">30-Day Platform Volume</span>
            <IndianRupee className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">₹12,46,530</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">+18.7% vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Escrow in Transit</span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">₹1,18,400</div>
            <p className="text-[11px] text-muted-foreground mt-1">14 seller release milestones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Disputed & Refunded</span>
            <RotateCcw className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">₹3,290</div>
            <p className="text-[11px] text-muted-foreground mt-1">Low dispute rate (&lt; 0.3%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Active Subscriptions</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">248 Dealers</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">98.2% auto-renew retention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by transaction reference, customer, or package..."
                className="pl-9 h-9 text-xs bg-muted/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1">
              {['ALL', 'SUCCESS', 'PENDING', 'REFUNDED'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                    statusFilter === s
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider text-muted-foreground font-bold">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 py-3 min-w-[140px]">Transaction Ref</TableHead>
                  <TableHead className="px-4 py-3 min-w-[200px]">Customer Account</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px]">Gateway Method</TableHead>
                  <TableHead className="px-4 py-3 min-w-[220px]">Package / Subscription</TableHead>
                  <TableHead className="px-4 py-3 min-w-[110px] text-right">Amount (INR)</TableHead>
                  <TableHead className="px-4 py-3 min-w-[100px] text-center">Status</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px]">Timestamp</TableHead>
                  <TableHead className="px-4 py-3 text-right min-w-[130px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      No transactions found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => (
                    <TableRow key={t.id} className="transition-colors hover:bg-muted/30">
                      {/* Txn Ref & Invoice */}
                      <TableCell className="px-4 py-3 font-mono font-bold text-xs text-foreground">
                        {t.txnRef}
                        <span className="text-[10px] text-muted-foreground block font-sans">{t.invoiceId}</span>
                      </TableCell>

                      {/* Customer */}
                      <TableCell className="px-4 py-3">
                        <div className="font-bold text-xs text-foreground">{t.customerName}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{t.customerEmail}</div>
                      </TableCell>

                      {/* Method */}
                      <TableCell className="px-4 py-3">
                        {getMethodBadge(t.method)}
                      </TableCell>

                      {/* Package */}
                      <TableCell className="px-4 py-3 text-xs font-medium text-foreground">
                        {t.packageName}
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="px-4 py-3 text-right font-black text-xs text-foreground font-mono">
                        {formatCurrency(t.amount)}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            t.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : t.status === 'REFUNDED'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              t.status === 'SUCCESS'
                                ? 'bg-emerald-500 animate-pulse'
                                : t.status === 'REFUNDED'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span>{t.status}</span>
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {t.date}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toast.success(`Downloading official GST invoice ${t.invoiceId}...`)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Download Invoice PDF"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          {t.status === 'SUCCESS' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => processRefund(t.id, t.txnRef)}
                              className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                            >
                              Refund
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium">Reconciled</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Reconciled ledger: <strong className="text-foreground">{filtered.length}</strong> transactions
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="h-7 w-7 p-0">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-background text-foreground font-mono">
                1 / 1
              </span>
              <Button variant="outline" size="sm" disabled className="h-7 w-7 p-0">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
