import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { Download, Printer, CheckCircle2, Building, ShieldCheck } from 'lucide-react';
import { PaymentOrderItem } from '../service/payments.service';

interface ReceiptModalProps {
  order: PaymentOrderItem | null;
  onClose: () => void;
}

export function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  if (!order) return null;

  const basePrice = (order.amount / 1.18).toFixed(2);
  const gst = (order.amount - Number(basePrice)).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
        <div className="relative w-full max-w-lg bg-card rounded-3xl border border-border p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 print:border-none print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-border/80">
            <div>
              <h2 className="text-xl font-black text-foreground tracking-tight">BharatMarket</h2>
              <p className="text-xs text-muted-foreground">Classifieds Marketplace India</p>
              <p className="text-[10px] text-muted-foreground">GSTIN: 10AAAAA0000A1Z5</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-foreground bg-muted px-2.5 py-1 rounded-lg">
                {order.invoiceId}
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">
                Date: {formatDate(order.paidAt || order.createdAt)}
              </p>
            </div>
          </div>

          {/* Customer & Payment Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold text-muted-foreground text-[10px] uppercase">Billed To:</span>
              <p className="font-bold text-foreground mt-0.5">{order.customerName}</p>
              <p className="text-muted-foreground">{order.customerEmail}</p>
              {order.customerPhone && <p className="text-muted-foreground">{order.customerPhone}</p>}
            </div>

            <div className="text-right">
              <span className="font-bold text-muted-foreground text-[10px] uppercase">Payment Reference:</span>
              <p className="font-mono text-foreground mt-0.5">{order.merchantTransactionId}</p>
              <p className="text-muted-foreground">Gateway: PayU 256-bit SSL</p>
              <p className="text-emerald-600 font-bold">Status: Paid</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-border/80 rounded-2xl overflow-hidden text-xs">
            <div className="bg-muted/50 p-3 font-bold text-muted-foreground flex justify-between">
              <span>Item Description</span>
              <span>Amount (INR)</span>
            </div>
            <div className="p-3.5 space-y-2">
              <div className="flex justify-between font-medium text-foreground">
                <div>
                  <p className="font-bold">{order.productName}</p>
                  <p className="text-[10px] text-muted-foreground">Category: {order.purpose}</p>
                </div>
                <span>₹{basePrice}</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span>IGST / CGST+SGST (18%)</span>
                <span>₹{gst}</span>
              </div>
            </div>
            <div className="bg-muted/30 p-3.5 font-black text-foreground text-sm flex justify-between border-t border-border/80">
              <span>Total Paid</span>
              <span className="text-primary">{formatCurrency(order.amount)}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Close
            </Button>
            <Button type="button" size="sm" onClick={handlePrint} className="gap-1.5 text-xs font-bold rounded-xl">
              <Printer className="w-3.5 h-3.5" />
              <span>Print Tax Invoice</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

