import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Receipt,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowDownLeft,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  FileText,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { useBillingHistory } from '../hooks/useBillingQuery';
import { BillingTransaction } from '../services/billing.service';
import { InvoiceModal } from '../components/InvoiceModal';

export const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedTransaction, setSelectedTransaction] = useState<BillingTransaction | null>(null);

  const { data, isLoading, isError, refetch } = useBillingHistory(
    {
      page: currentPage,
      limit: 10,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    },
    isAuthenticated
  );

  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} />
            Success
          </span>
        );
      case 'PENDING':
      case 'INITIATED':
      case 'CREATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} />
            Pending
          </span>
        );
      case 'FAILED':
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={12} />
            {status === 'EXPIRED' ? 'Expired' : 'Failed'}
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowDownLeft size={12} />
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#f7f8f9]">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-black text-[#002f34]">Sign In Required</h2>
          <p className="text-sm text-gray-600">
            Please log in to your account to view your past transactions, listing promotions, and download tax invoices.
          </p>
          <button
            onClick={() => openAuthModal()}
            className="w-full py-3 bg-[#002f34] hover:bg-[#003d44] text-white font-bold rounded-xl transition shadow-md cursor-pointer"
          >
            Log In to View Billing
          </button>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;
  const statusCounts = metrics?.statusCounts || {};
  const totalOrdersCount = data?.pagination?.totalItems || 0;

  return (
    <div className="min-h-screen bg-[#f7f8f9] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link to="/" className="hover:text-[#002f34]">Home</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Invoices & Billing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#002f34] tracking-tight">
              Invoices & Billing History
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your payment receipts, listing promotional boosts, and package invoices.
            </p>
          </div>

          <button
            onClick={() => navigate('/plans')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#002f34] text-white text-xs font-bold rounded-xl hover:bg-[#003d44] transition shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Sparkles size={14} className="text-[#FFD54A]" />
            <span>Explore Boost Packages</span>
          </button>
        </div>

        {/* Financial Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Spent</p>
              <h3 className="text-2xl font-black text-[#002f34]">
                {isLoading ? '...' : formatRupees(metrics?.totalSpent || 0)}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium">Verified payments ledger</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Successful Orders</p>
              <h3 className="text-2xl font-black text-[#002f34]">
                {isLoading ? '...' : metrics?.successfulOrdersCount || 0}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">Delivered & fulfilled boosts</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Payment Protection</p>
              <h3 className="text-lg font-black text-[#002f34] flex items-center gap-1.5">
                <ShieldCheck size={20} className="text-emerald-600" />
                PayU Escrow
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">256-bit encrypted checkout</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard size={24} />
            </div>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'SUCCESS', label: 'Successful', count: statusCounts['SUCCESS'] },
            { id: 'PENDING', label: 'Pending', count: statusCounts['PENDING'] },
            { id: 'FAILED', label: 'Failed / Expired', count: (statusCounts['FAILED'] || 0) + (statusCounts['EXPIRED'] || 0) },
            { id: 'REFUNDED', label: 'Refunded', count: statusCounts['REFUNDED'] },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#002f34] text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Transactions Table / Cards Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#002f34] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500 font-medium">Loading billing transactions...</p>
            </div>
          ) : isError ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900">Failed to load transactions</h3>
              <p className="text-xs text-gray-500">There was a problem communicating with the billing service.</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 text-xs font-bold text-[#002f34] bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Try Again
              </button>
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
                <FileText size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">No Transactions Found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {statusFilter === 'ALL'
                    ? "You haven't made any purchases or listing promotions yet."
                    : `No transactions found with status "${statusFilter}".`}
                </p>
              </div>
              {statusFilter !== 'ALL' ? (
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className="px-4 py-2 text-xs font-bold text-[#002f34] bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                >
                  Clear Status Filter
                </button>
              ) : (
                <button
                  onClick={() => navigate('/plans')}
                  className="px-5 py-2.5 bg-[#002f34] text-white text-xs font-bold rounded-xl hover:bg-[#003d44] transition shadow-sm"
                >
                  Boost an Ad Now
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Invoice / Date</th>
                      <th className="px-6 py-3.5">Package & Purpose</th>
                      <th className="px-6 py-3.5">Linked Listing</th>
                      <th className="px-6 py-3.5">Amount</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.items.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50/70 transition">
                        {/* Invoice & Date */}
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 font-mono text-[11px]">{txn.invoiceNumber}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{formatDate(txn.paidAt || txn.createdAt)}</p>
                        </td>

                        {/* Package / Purpose */}
                        <td className="px-6 py-4">
                          <p className="font-bold text-[#002f34]">{txn.productName}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 font-mono">
                            {txn.provider} • {txn.paymentMethod || 'UPI'}
                          </p>
                        </td>

                        {/* Linked Listing */}
                        <td className="px-6 py-4">
                          {txn.listing ? (
                            <Link
                              to={`/ad/${txn.listing.id}`}
                              className="group flex items-center gap-2.5 max-w-[220px]"
                            >
                              {txn.listing.coverImage ? (
                                <img
                                  src={txn.listing.coverImage}
                                  alt=""
                                  className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0 text-gray-400 font-mono text-[10px]">
                                  AD
                                </div>
                              )}
                              <div className="truncate">
                                <p className="font-medium text-gray-900 group-hover:text-[#002f34] group-hover:underline truncate">
                                  {txn.listing.title}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">₹{txn.listing.price.toLocaleString('en-IN')}</p>
                              </div>
                            </Link>
                          ) : (
                            <span className="text-gray-400 italic">General Account Package</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4">
                          <p className="font-black text-gray-900 text-sm">{formatRupees(txn.amount)}</p>
                          {txn.refundedAmount && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                              Refunded: -{formatRupees(txn.refundedAmount)}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(txn.status)}
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedTransaction(txn)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#002f34] bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg transition cursor-pointer shadow-sm"
                          >
                            <Receipt size={13} />
                            <span>Invoice</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-gray-100">
                {data.items.map((txn) => (
                  <div key={txn.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-mono font-bold text-gray-500">{txn.invoiceNumber}</p>
                        <h4 className="font-bold text-gray-900 text-sm mt-0.5">{txn.productName}</h4>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900">{formatRupees(txn.amount)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(txn.paidAt || txn.createdAt)}</p>
                      </div>
                    </div>

                    {txn.listing && (
                      <Link
                        to={`/ad/${txn.listing.id}`}
                        className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        {txn.listing.coverImage ? (
                          <img
                            src={txn.listing.coverImage}
                            alt=""
                            className="w-9 h-9 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400 text-[10px]">
                            AD
                          </div>
                        )}
                        <div className="truncate text-xs">
                          <p className="font-medium text-gray-900 truncate">{txn.listing.title}</p>
                          <p className="text-[10px] text-gray-500">₹{txn.listing.price.toLocaleString('en-IN')}</p>
                        </div>
                      </Link>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div>{getStatusBadge(txn.status)}</div>
                      <button
                        onClick={() => setSelectedTransaction(txn)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#002f34] bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition shadow-sm"
                      >
                        <Receipt size={13} />
                        View Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {data.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                  <p>
                    Showing page <span className="font-bold text-gray-900">{data.pagination.page}</span> of{' '}
                    <span className="font-bold text-gray-900">{data.pagination.totalPages}</span> ({totalOrdersCount} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={!data.pagination.hasPrev}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={!data.pagination.hasNext}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Invoice Detail / Print Modal */}
      {selectedTransaction && (
        <InvoiceModal
          transaction={selectedTransaction}
          user={user}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
};
export default BillingPage;
