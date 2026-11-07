import { useState } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { formatCurrency } from '../../../lib/utils';
import { RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { PaymentOrderItem } from '../service/payments.service';

interface RefundPaymentModalProps {
  order: PaymentOrderItem | null;
  onClose: () => void;
  onConfirmRefund: (orderId: string, reason: string) => Promise<void>;
  isProcessing: boolean;
}

const REFUND_REASONS = [
  'Customer requested refund',
  'Payment duplicated',
  'Payment failed but charged',
  'Order/listing cancelled',
  'Admin initiated',
  'Other',
];

export function RefundPaymentModal({
  order,
  onClose,
  onConfirmRefund,
  isProcessing,
}: RefundPaymentModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REFUND_REASONS[0]);
  const [customNote, setCustomNote] = useState<string>('');

  if (!order) return null;

  const handleSubmit = async () => {
    const finalReason = selectedReason === 'Other' && customNote.trim() ? customNote.trim() : selectedReason;
    await onConfirmRefund(order.id, finalReason);
  };

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
        <div className="relative w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
          <DialogHeader className="space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-1">
              <RotateCcw className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-black text-foreground">
              Confirm Refund of {formatCurrency(order.amount)}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This initiates a reversal through PayU. The funds will return to the customer’s payment method.
            </DialogDescription>
          </DialogHeader>

          {/* Refund Notice */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Ad credits added with this package will be revoked from the seller’s balance.</span>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2 text-xs">
            <label className="font-bold text-foreground">Select Refund Reason:</label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {REFUND_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {selectedReason === 'Other' && (
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Enter detailed reason for audit trail..."
                rows={2}
                className="w-full p-2.5 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 mt-2"
              />
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isProcessing} className="rounded-xl text-xs">
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isProcessing}
              onClick={handleSubmit}
              className="gap-1.5 text-xs font-bold rounded-xl"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Confirm & Process Refund</span>
            </Button>
          </DialogFooter>
        </div>
      </div>
    </Dialog>
  );
}

