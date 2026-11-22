import React from 'react';
import { X, Printer, CheckCircle2, AlertCircle, Clock, ShieldCheck, ArrowDownLeft } from 'lucide-react';
import { BillingTransaction } from '../services/billing.service';

interface InvoiceModalProps {
  transaction: BillingTransaction | null;
  user: any;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ transaction, user, onClose }) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(transaction.paidAt || transaction.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: transaction.currency || 'INR',
    maximumFractionDigits: 2,
  }).format(transaction.amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden print:shadow-none print:border-none print:max-w-none">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#002f34]" />
            <span className="font-bold text-[#002f34] text-sm tracking-wide">TAX INVOICE & RECEIPT</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition shadow-sm cursor-pointer"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-8 print:p-4 space-y-6 text-gray-800">
          {/* Top Brand & Invoice Meta */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#002f34]">OLX Marketplace</h2>
              <p className="text-xs text-gray-500 mt-0.5">Automated Classifieds & Promotion Services</p>
              <p className="text-[11px] text-gray-400">GSTIN: 27AABCO1234F1Z8 • Support: support@olx.local</p>
            </div>
            <div className="sm:text-right">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Invoice Number</span>
              <p className="text-base font-black text-gray-900 font-mono">{transaction.invoiceNumber}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formattedDate}</p>
            </div>
          </div>

          {/* Customer & Payment Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Billed To</span>
              <p className="font-bold text-gray-900 text-sm">{user?.name || user?.email?.split('@')[0] || 'Customer'}</p>
              <p className="text-gray-600">{user?.email || 'N/A'}</p>
              {user?.phoneNumber && <p className="text-gray-600">+91 {user.phoneNumber}</p>}
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Payment Overview</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Status:</span>
                {transaction.status === 'SUCCESS' && (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                    <CheckCircle2 size={12} /> PAID
                  </span>
                )}
                {transaction.status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                    <Clock size={12} /> PENDING
                  </span>
                )}
                {transaction.status === 'FAILED' && (
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                    <AlertCircle size={12} /> FAILED
                  </span>
                )}
                {transaction.status === 'REFUNDED' && (
                  <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                    <ArrowDownLeft size={12} /> REFUNDED
                  </span>
                )}
              </div>
              <p className="text-gray-600">Gateway: <span className="font-semibold text-gray-900">{transaction.provider} ({transaction.paymentMethod || 'UPI'})</span></p>
              {transaction.merchantTransactionId && (
                <p className="text-gray-600 truncate font-mono text-[11px]">Txn ID: {transaction.merchantTransactionId}</p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Description & Service</th>
                  <th className="px-4 py-3">Associated Listing</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-gray-900">{transaction.productName}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 font-mono">Product ID: {transaction.productId}</p>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">
                    {transaction.listing ? (
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{transaction.listing.title}</p>
                        <p className="text-[10px] text-gray-400 font-mono">Ad #{transaction.listing.id.slice(0, 8)}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Account Package / N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium">1</td>
                  <td className="px-4 py-3.5 text-right font-bold text-gray-900">{formattedAmount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Breakdown */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formattedAmount}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (Inclusive 18%)</span>
                <span>₹{(transaction.amount * 0.18 / 1.18).toFixed(2)}</span>
              </div>
              {transaction.refundedAmount && (
                <div className="flex justify-between text-rose-600 font-semibold pt-1 border-t border-gray-100">
                  <span>Refunded</span>
                  <span>- ₹{transaction.refundedAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#002f34] pt-2 border-t border-gray-200">
                <span>Total Amount</span>
                <span>{formattedAmount}</span>
              </div>
            </div>
          </div>

          {/* Refund Notice if applicable */}
          {transaction.refundReason && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-0.5">
              <p className="font-bold flex items-center gap-1.5"><ArrowDownLeft size={14} /> Refund Details</p>
              <p className="text-blue-700">Reason: {transaction.refundReason}</p>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400 text-center space-y-0.5">
            <p>Thank you for choosing OLX Marketplace for your classified promotion needs.</p>
            <p>This is a computer-generated tax invoice and requires no physical signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
