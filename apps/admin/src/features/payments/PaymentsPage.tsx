import { useState, useDeferredValue } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
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
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { formatCurrency, formatDate } from '../../lib/utils';
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
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/auth.store';
import {
  usePaymentOverviewQuery,
  usePaymentOrdersQuery,
  useRefundPaymentMutation,
} from './hook/usePaymentsQuery';
import { PaymentOrderItem } from './service/payments.service';

export function PaymentsPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrderItem | null>(null);
  const [refundTarget, setRefundTarget] = useState<PaymentOrderItem | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // Role & permission guard: Only Finance Admin or Super Admin can execute refunds
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.role);
  const effectiveRole = user?.role || activeRole;
  const canRefund =
    effectiveRole === 'SUPER_ADMIN' ||
    effectiveRole === 'FINANCE_ADMIN' ||
    (user?.permissions?.includes('payments:refund') ?? false);

  // Real Queries & Mutations
  const {
    data: overview,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
    isRefetching: isOverviewRefetching,
  } = usePaymentOverviewQuery();

  const {
    data: listData,
    isLoading: isListLoading,
    refetch: refetchList,
    isRefetching: isListRefetching,
  } = usePaymentOrdersQuery({
    page,
    limit,
    status: statusFilter,
    search: deferredSearch,
  });

  const refundMutation = useRefundPaymentMutation();

  const handleRefresh = () => {
    refetchOverview();
    refetchList();
  };

  const handleOpenRefund = (order: PaymentOrderItem) => {
    if (!canRefund) {
      toast.error('Access Restricted: Only Finance Admin or Super Admin can issue PayU refunds.');
      return;
    }
    setRefundTarget(order);
    setRefundReason('');
  };

  const handleConfirmRefund = async () => {
    if (!refundTarget) return;

    try {
      await refundMutation.mutateAsync({
        id: refundTarget.id,
        reason: refundReason.trim() || undefined,
      });
      setRefundTarget(null);
      setRefundReason('');
    } catch {
      // Error handled by mutation onError toast
    }
  };

  // Exports real active ledger rows as a formatted CSV file with GST reconciliation
  const handleExportCsv = () => {
    const orders = listData?.items || [];
    if (orders.length === 0) {
      toast.error('No transactions available to export in current view.');
      return;
    }

    const headers = [
      'Order ID',
      'Merchant Txn ID',
      'Provider Txn ID',
      'Invoice ID',
      'Customer Name',
      'Customer Email',
      'Phone',
      'Purpose',
      'Product',
      'Amount (INR)',
      'GST 18% (INR)',
      'Net Base (INR)',
      'Status',
      'Payment Method',
      'Created At',
      'Paid At',
    ];

    const rows = orders.map((o) => {
      const gross = o.amount;
      const net = (gross / 1.18).toFixed(2);
      const gst = (gross - Number(net)).toFixed(2);

      return [
        `"${o.id}"`,
        `"${o.merchantTransactionId}"`,
        `"${o.providerTransactionId || ''}"`,
        `"${o.invoiceId}"`,
        `"${o.customerName.replace(/"/g, '""')}"`,
        `"${o.customerEmail}"`,
        `"${o.customerPhone || ''}"`,
        `"${o.purpose}"`,
        `"${o.productName.replace(/"/g, '""')}"`,
        o.amount.toFixed(2),
        gst,
        net,
        `"${o.status}"`,
        `"${o.paymentMethod}"`,
        `"${o.createdAt}"`,
        `"${o.paidAt || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OLX_GST_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${orders.length} transaction records to CSV.`);
  };

  const getMethodBadge = (method: string) => {
    const upper = (method || '').toUpperCase();
    if (upper.includes('UPI')) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-600 border border-emerald-500/20">
          <QrCode className="h-3 w-3" />
          <span>UPI / QR</span>
        </span>
      );
    }
    if (upper.includes('NETBANKING') || upper.includes('NB')) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-purple-600 border border-purple-500/20">
          <Building2 className="h-3 w-3" />
          <span>NetBanking</span>
        </span>
      );
    }
    if (upper.includes('CARD') || upper.includes('CC') || upper.includes('DC')) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-600 border border-amber-500/20">
          <CreditCard className="h-3 w-3" />
          <span>Cards</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground border">
        <CreditCard className="h-3 w-3 text-blue-600" />
        <span>PayU Hosted</span>
      </span>
    );
  };

  const getStatusBadge = (status: PaymentOrderItem['status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SUCCESS</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>REFUNDED</span>
          </span>
        );
      case 'REFUND_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-spin" />
            <span>REFUNDING</span>
          </span>
        );
      case 'FAILED':
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            <span>{status}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Payments, Invoices & Escrow
            </h2>
            <Badge variant="outline" className="text-[11px] font-mono bg-muted/40">
              PayU Hosted Checkout
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Finance reconciliation ledger for package subscriptions, ad boosts, and PayU S2S refunds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs"
            onClick={handleRefresh}
            disabled={isOverviewRefetching || isListRefetching}
            title="Refresh Ledger"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-muted-foreground ${
                isOverviewRefetching || isListRefetching ? 'animate-spin' : ''
              }`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs"
            onClick={handleExportCsv}
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export GST Ledger</span>
          </Button>
        </div>
      </div>

      {/* 4 Financial Stat Cards (Real Database Aggregates) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Gross Platform Revenue */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Settled Platform Volume</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {isOverviewLoading ? '...' : formatCurrency(overview?.grossRevenueInr || 0)}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>{overview?.successfulOrders || 0} successfully captured orders</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Capture Rate & Volume */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Invoiced Orders</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {isOverviewLoading ? '...' : overview?.totalOrders || 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {overview?.totalOrders
                ? `${Math.round(((overview.successfulOrders || 0) / overview.totalOrders) * 100)}% overall success rate`
                : '100% gateway health'}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Disputed & Refunded */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Refunded Value</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <RotateCcw className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">
              {isOverviewLoading ? '...' : formatCurrency(overview?.refundedAmountInr || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {overview?.refundedOrders || 0} settled PayU reversals
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Active Promos & Pending */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Active Ad Boosts</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {isOverviewLoading ? '...' : `${overview?.activeBoosts || 0} Active`}
            </div>
            <p className="text-[11px] text-purple-600 font-semibold mt-1">
              {overview?.pendingOrders || 0} in-flight payment orders
            </p>
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
                placeholder="Search transaction ID, customer name, email, or product..."
                className="pl-9 h-9 text-xs bg-muted/20"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {['ALL', 'SUCCESS', 'PENDING', 'REFUNDED', 'FAILED'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer whitespace-nowrap ${
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
                  <TableHead className="px-4 py-3 min-w-[150px]">Transaction Ref</TableHead>
                  <TableHead className="px-4 py-3 min-w-[200px]">Customer Account</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px]">Gateway Method</TableHead>
                  <TableHead className="px-4 py-3 min-w-[200px]">Product / Purpose</TableHead>
                  <TableHead className="px-4 py-3 min-w-[110px] text-right">Amount (INR)</TableHead>
                  <TableHead className="px-4 py-3 min-w-[100px] text-center">Status</TableHead>
                  <TableHead className="px-4 py-3 min-w-[130px]">Timestamp</TableHead>
                  <TableHead className="px-4 py-3 text-right min-w-[130px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isListLoading ? (
                  // Loading skeletons
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`skeleton_${idx}`}>
                      <TableCell colSpan={8} className="p-4">
                        <div className="h-6 w-full animate-pulse bg-muted/60 rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !listData?.items || listData.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      No transaction records found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  listData.items.map((t) => (
                    <TableRow key={t.id} className="transition-colors hover:bg-muted/30">
                      {/* Txn Ref & Invoice */}
                      <TableCell className="px-4 py-3 font-mono font-bold text-xs text-foreground">
                        <span className="truncate block max-w-36" title={t.merchantTransactionId}>
                          {t.merchantTransactionId}
                        </span>
                        <span className="text-[10px] text-muted-foreground block font-sans">
                          {t.invoiceId}
                        </span>
                      </TableCell>

                      {/* Customer */}
                      <TableCell className="px-4 py-3">
                        <div className="font-bold text-xs text-foreground truncate max-w-44">
                          {t.customerName}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-44">
                          {t.customerEmail}
                        </div>
                      </TableCell>

                      {/* Method */}
                      <TableCell className="px-4 py-3">{getMethodBadge(t.paymentMethod)}</TableCell>

                      {/* Package & Listing */}
                      <TableCell className="px-4 py-3 text-xs font-medium text-foreground">
                        <div className="font-semibold">{t.productName}</div>
                        {t.listingTitle && (
                          <div
                            className="text-[11px] text-muted-foreground truncate max-w-48"
                            title={t.listingTitle}
                          >
                            Listing: {t.listingTitle}
                          </div>
                        )}
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="px-4 py-3 text-right font-black text-xs text-foreground font-mono">
                        {formatCurrency(t.amount)}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-4 py-3 text-center">
                        {getStatusBadge(t.status)}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {formatDate(t.createdAt)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Modal Trigger */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedOrder(t)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Inspect Order Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Invoice Download */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              toast.success(
                                `Invoice ${t.invoiceId} downloaded. Net: ₹${(
                                  t.amount / 1.18
                                ).toFixed(2)} + 18% GST.`
                              )
                            }
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Download Invoice PDF"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>

                          {/* Refund Button (Restricted to Finance Admin / Super Admin) */}
                          {t.status === 'SUCCESS' ? (
                            canRefund ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRefund(t)}
                                className="h-7 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                              >
                                Refund
                              </Button>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                                title="Refunds restricted to Finance Admin / Super Admin"
                              >
                                <Lock className="h-3 w-3" />
                                <span>Locked</span>
                              </span>
                            )
                          ) : t.status === 'REFUNDED' ? (
                            <span className="text-[10px] text-rose-600 font-semibold">Refunded</span>
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

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Reconciled ledger:{' '}
              <strong className="text-foreground">{listData?.pagination.totalItems || 0}</strong>{' '}
              transactions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!listData?.pagination.hasPrev || isListLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-background text-foreground font-mono">
                {listData?.pagination.page || 1} / {listData?.pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!listData?.pagination.hasNext || isListLoading}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refund Confirmation Modal (Restricted to Finance Admin / Super Admin) */}
      <Dialog open={Boolean(refundTarget)} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-foreground">
              Authorize Full Reversal Refund
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            This action invokes PayU&apos;s S2S cancellation API (`cancel_refund_transaction`) to
            reimburse the customer and update the business state.
          </DialogDescription>
        </DialogHeader>

        {refundTarget && (
          <div className="space-y-3.5 py-2 text-xs">
            <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order Identifier:</span>
                <span className="font-mono font-bold text-foreground">{refundTarget.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PayU Merchant Txn:</span>
                <span className="font-mono font-bold text-foreground">
                  {refundTarget.merchantTransactionId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-foreground">
                  {refundTarget.customerName} ({refundTarget.customerEmail})
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-muted-foreground font-semibold">Refund Amount:</span>
                <span className="text-sm font-black text-rose-600 font-mono">
                  {formatCurrency(refundTarget.amount)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Reason for Reversal (Optional)</label>
              <Input
                placeholder="e.g. Accidental duplicate payment, customer cancellation..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefundTarget(null)}
            disabled={refundMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirmRefund}
            disabled={refundMutation.isPending}
            className="font-semibold gap-1.5"
          >
            {refundMutation.isPending ? 'Processing Refund...' : 'Confirm Full Refund via PayU'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Inspect Order Details Modal */}
      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base font-bold text-foreground">
              Transaction Deep Inspection
            </DialogTitle>
            {selectedOrder && getStatusBadge(selectedOrder.status)}
          </div>
          <DialogDescription className="text-xs">
            Review PayU hosted transaction metadata, customer details, and invoice parameters.
          </DialogDescription>
        </DialogHeader>

        {selectedOrder && (
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20">
              <div>
                <span className="text-muted-foreground block text-[10px]">Internal Order ID</span>
                <span className="font-mono font-bold text-foreground text-xs">
                  {selectedOrder.id}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Merchant Txn ID</span>
                <span className="font-mono font-bold text-foreground text-xs">
                  {selectedOrder.merchantTransactionId}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Provider Txn ID</span>
                <span className="font-mono font-semibold text-foreground text-xs">
                  {selectedOrder.providerTransactionId || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Payment Gateway</span>
                <span className="font-semibold text-foreground text-xs">
                  {selectedOrder.provider} (Hosted Checkout)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Product Package:</span>
                <span className="font-bold text-foreground">{selectedOrder.productName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Purpose:</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {selectedOrder.purpose}
                </Badge>
              </div>
              {selectedOrder.listingTitle && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Attached Listing:</span>
                  <span className="font-semibold text-foreground truncate max-w-56">
                    {selectedOrder.listingTitle}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Customer Email:</span>
                <span className="font-mono text-foreground">{selectedOrder.customerEmail}</span>
              </div>
              {selectedOrder.customerPhone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Customer Phone:</span>
                  <span className="font-mono text-foreground">{selectedOrder.customerPhone}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-muted-foreground">Creation Timestamp:</span>
                <span className="font-mono text-foreground">
                  {formatDate(selectedOrder.createdAt)}
                </span>
              </div>
              {selectedOrder.paidAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Settlement Timestamp:</span>
                  <span className="font-mono text-emerald-600 font-semibold">
                    {formatDate(selectedOrder.paidAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
