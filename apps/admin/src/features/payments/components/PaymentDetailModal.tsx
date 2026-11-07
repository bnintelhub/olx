import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { ShieldCheck, Package, CreditCard, RotateCcw } from 'lucide-react';
import { PaymentOrderItem } from '../service/payments.service';

interface PaymentDetailModalProps {
  order: PaymentOrderItem | null;
  onClose: () => void;
  onOpenRefund: (order: PaymentOrderItem) => void;
  canRefund: boolean;
}

export function PaymentDetailModal({
  order,
  onClose,
  onOpenRefund,
  canRefund,
}: PaymentDetailModalProps) {
  if (!order) return null;

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
        <div className="relative w-full max-w-lg bg-card rounded-3xl border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Transaction Inspector
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>PayU Verified</span>
              </span>
            </div>
            <DialogTitle className="text-xl font-black text-foreground">
              {formatCurrency(order.amount)} • {order.productName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              Ref: {order.merchantTransactionId}
            </DialogDescription>
          </DialogHeader>

          {/* Details Grid */}
          <div className="bg-muted/40 rounded-2xl p-4 border border-border/60 text-xs space-y-2.5">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Status</span>
              <span className="font-bold text-foreground">{order.status}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Customer Name</span>
              <span className="font-bold text-foreground">{order.customerName}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono text-foreground">{order.customerEmail}</span>
            </div>

            {order.customerPhone && (
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-mono text-foreground">{order.customerPhone}</span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-bold text-foreground">{order.paymentMethod || 'UPI'}</span>
            </div>

            {order.providerTransactionId && (
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">PayU Transaction ID</span>
                <span className="font-mono text-foreground">{order.providerTransactionId}</span>
              </div>
            )}

            {order.listingTitle && (
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Linked Listing</span>
                <span className="font-medium text-foreground">{order.listingTitle}</span>
              </div>
            )}

            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Processed At</span>
              <span className="text-foreground">{formatDate(order.paidAt || order.createdAt)}</span>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Close
            </Button>

            {order.status === 'SUCCESS' && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!canRefund}
                onClick={() => {
                  onClose();
                  onOpenRefund(order);
                }}
                className="gap-1.5 text-xs font-bold rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Issue Refund</span>
              </Button>
            )}
          </DialogFooter>
        </div>
      </div>
    </Dialog>
  );
}

