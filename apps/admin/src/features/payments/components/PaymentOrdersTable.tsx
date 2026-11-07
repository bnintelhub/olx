import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  Eye,
  RotateCcw,
  Download,
  CreditCard,
  QrCode,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { PaymentOrderItem } from '../service/payments.service';

interface PaymentOrdersTableProps {
  orders: PaymentOrderItem[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  onViewOrder: (order: PaymentOrderItem) => void;
  onOpenRefund: (order: PaymentOrderItem) => void;
  onOpenReceipt: (order: PaymentOrderItem) => void;
  canRefund: boolean;
}

export function PaymentOrdersTable({
  orders,
  isLoading,
  page,
  totalPages,
  totalItems,
  onPageChange,
  onViewOrder,
  onOpenRefund,
  onOpenReceipt,
  canRefund,
}: PaymentOrdersTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30 font-bold text-[10px]">
            Successful
          </Badge>
        );
      case 'REFUNDED':
        return (
          <Badge className="bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border-rose-500/30 font-bold text-[10px]">
            Refunded
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30 font-bold text-[10px]">
            Failed
          </Badge>
        );
      case 'PENDING':
      case 'INITIATED':
      case 'CREATED':
        return (
          <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-500/30 font-bold text-[10px]">
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  const getMethodIcon = (method: string) => {
    const m = (method || '').toUpperCase();
    if (m.includes('UPI')) return <QrCode className="w-3.5 h-3.5 text-blue-600" />;
    if (m.includes('CARD') || m.includes('CC') || m.includes('DC')) return <CreditCard className="w-3.5 h-3.5 text-purple-600" />;
    if (m.includes('NET') || m.includes('BANK')) return <Building2 className="w-3.5 h-3.5 text-emerald-600" />;
    return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              <TableHead className="py-3.5">Transaction ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground font-medium">Loading ledger...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="max-w-xs mx-auto space-y-1">
                    <p className="text-sm font-bold text-foreground">No Transactions Found</p>
                    <p className="text-xs text-muted-foreground">Try clearing or adjusting your active filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/30 transition text-xs">
                  {/* Transaction ID */}
                  <TableCell className="font-mono font-bold text-foreground">
                    <div className="space-y-0.5">
                      <span className="text-primary hover:underline cursor-pointer" onClick={() => onViewOrder(order)}>
                        {order.merchantTransactionId}
                      </span>
                      {order.providerTransactionId && (
                        <p className="text-[10px] text-muted-foreground font-normal">
                          PayU: {order.providerTransactionId}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Customer */}
                  <TableCell>
                    <div className="space-y-0.5 max-w-[180px]">
                      <p className="font-bold text-foreground truncate">{order.customerName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{order.customerEmail}</p>
                    </div>
                  </TableCell>

                  {/* Purpose / Type */}
                  <TableCell>
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground">{order.productName}</span>
                      {order.listingTitle && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                          Ad: {order.listingTitle}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="text-right font-black text-foreground text-sm">
                    {formatCurrency(order.amount)}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>

                  {/* Payment Method */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      {getMethodIcon(order.paymentMethod)}
                      <span>{order.paymentMethod || 'UPI'}</span>
                    </div>
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(order.paidAt || order.createdAt)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Details */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewOrder(order)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* Receipt */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenReceipt(order)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Download receipt"
                      >
                        <Download className="w-4 h-4" />
                      </Button>

                      {/* Refund Action (Enabled for successful transactions) */}
                      {order.status === 'SUCCESS' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!canRefund}
                          onClick={() => onOpenRefund(order)}
                          className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                          title={canRefund ? 'Issue Refund' : 'Requires Finance Admin permission'}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      <div className="p-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          Showing page <strong>{page}</strong> of <strong>{Math.max(1, totalPages)}</strong> ({totalItems} total transactions)
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="h-8 gap-1 text-xs rounded-xl cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="h-8 gap-1 text-xs rounded-xl cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

