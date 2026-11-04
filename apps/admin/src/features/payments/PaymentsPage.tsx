import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../lib/utils';
import { IndianRupee, RotateCcw, Download } from 'lucide-react';

interface Payment {
  id: string;
  user: string;
  amount: number;
  package: string;
  status: 'SUCCESS' | 'REFUNDED' | 'PENDING';
  date: string;
}

const MOCK_PAYMENTS: Payment[] = [
  { id: 'PAY_99182', user: 'dealer_prime@cars.com', amount: 2499, package: 'Dealer 50 Ads Pack', status: 'SUCCESS', date: '2026-03-03' },
  { id: 'PAY_99183', user: 'rahul.s@example.com', amount: 499, package: 'Featured Ad (7 Days)', status: 'SUCCESS', date: '2026-03-02' },
  { id: 'PAY_99184', user: 'amit.v@example.com', amount: 299, package: 'Urgent Badge', status: 'REFUNDED', date: '2026-03-01' },
  { id: 'PAY_99185', user: 'pooja.verma@test.com', amount: 999, package: 'Top Ad Boost', status: 'SUCCESS', date: '2026-02-28' },
];

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);

  const processRefund = (id: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'REFUNDED' } : p))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Payments, Invoices & Refunds</h2>
          <p className="text-sm text-muted-foreground">
            Finance Admin control center for transaction reconciliation, refunds, and invoice management.
          </p>
        </div>
        <Button variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" />
          <span>Export Reconciliation CSV</span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Processed (30D)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <span>₹4,82,490</span>
            </div>
            <p className="text-xs text-emerald-600 mt-1">+14.2% platform revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Refunded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">₹3,290</div>
            <p className="text-xs text-muted-foreground mt-1">Dispute rate &lt; 0.7%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142 Dealers</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly recurring tier</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold">{p.id}</TableCell>
                  <TableCell className="text-sm">{p.user}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.package}</Badge>
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'SUCCESS' ? 'success' : 'destructive'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === 'SUCCESS' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processRefund(p.id)}
                        className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Issue Refund</span>
                      </Button>
                    )}
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

