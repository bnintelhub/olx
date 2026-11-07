import { useState, useDeferredValue } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import {
  useRevenueOverviewQuery,
  usePaymentOrdersQuery,
  useRefundPaymentMutation,
} from './hook/usePaymentsQuery';
import { PaymentOrderItem } from './service/payments.service';
import { PaymentSummaryCards } from './components/PaymentSummaryCards';
import { PaymentFiltersBar } from './components/PaymentFiltersBar';
import { PaymentOrdersTable } from './components/PaymentOrdersTable';
import { PaymentDetailModal } from './components/PaymentDetailModal';
import { RefundPaymentModal } from './components/RefundPaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { RefundAnalyticsSection } from './components/RefundAnalyticsSection';

export function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'REFUNDS'>('TRANSACTIONS');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [purposeFilter, setPurposeFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrderItem | null>(null);
  const [refundTarget, setRefundTarget] = useState<PaymentOrderItem | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<PaymentOrderItem | null>(null);

  // Role permissions: Finance Admin or Super Admin can issue refunds
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.role);
  const effectiveRole = user?.role || activeRole;
  const canRefund =
    effectiveRole === 'SUPER_ADMIN' ||
    effectiveRole === 'FINANCE_ADMIN' ||
    (user?.permissions?.includes('payments:refund') ?? false);

  // Queries
  const {
    data: overview,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
    isRefetching: isOverviewRefetching,
  } = useRevenueOverviewQuery('30d', fromDate, toDate);

  const {
    data: listData,
    isLoading: isListLoading,
    refetch: refetchList,
    isRefetching: isListRefetching,
  } = usePaymentOrdersQuery({
    page,
    limit,
    status: statusFilter,
    purpose: purposeFilter,
    search: deferredSearch,
    from: fromDate,
    to: toDate,
  });

  const refundMutation = useRefundPaymentMutation();

  const handleRefresh = () => {
    refetchOverview();
    refetchList();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPurposeFilter('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const handleConfirmRefund = async (orderId: string, reason: string) => {
    await refundMutation.mutateAsync({ id: orderId, reason });
    setRefundTarget(null);
    handleRefresh();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Payments & Settlements</h1>
          <p className="text-xs text-muted-foreground">
            Complete transaction reconciliation ledger, gateway logs, and refund operations.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Transactions Ledger
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REFUNDS')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'REFUNDS'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Refund Analytics
          </button>
        </div>
      </div>

      {/* 2. Strict Financial Waterfall & Summary Cards */}
      <PaymentSummaryCards overview={overview} isLoading={isOverviewLoading} />

      {activeTab === 'TRANSACTIONS' ? (
        <>
          {/* 3. Filter Bar */}
          <PaymentFiltersBar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            statusFilter={statusFilter}
            onStatusChange={(v) => { setStatusFilter(v); setPage(1); }}
            purposeFilter={purposeFilter}
            onPurposeChange={(v) => { setPurposeFilter(v); setPage(1); }}
            fromDate={fromDate}
            onFromDateChange={(v) => { setFromDate(v); setPage(1); }}
            toDate={toDate}
            onToDateChange={(v) => { setToDate(v); setPage(1); }}
            onRefresh={handleRefresh}
            isRefreshing={isOverviewRefetching || isListRefetching}
            onClearFilters={handleClearFilters}
          />

          {/* 4. Transactions Table */}
          <PaymentOrdersTable
            orders={listData?.items || []}
            isLoading={isListLoading}
            page={page}
            totalPages={listData?.pagination?.totalPages || 1}
            totalItems={listData?.pagination?.totalItems || 0}
            onPageChange={setPage}
            onViewOrder={setSelectedOrder}
            onOpenRefund={setRefundTarget}
            onOpenReceipt={setReceiptTarget}
            canRefund={canRefund}
          />
        </>
      ) : (
        /* Refund Analytics View */
        <RefundAnalyticsSection period="30d" from={fromDate} to={toDate} />
      )}

      {/* Modals */}
      <PaymentDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOpenRefund={setRefundTarget}
        canRefund={canRefund}
      />

      <RefundPaymentModal
        order={refundTarget}
        onClose={() => setRefundTarget(null)}
        onConfirmRefund={handleConfirmRefund}
        isProcessing={refundMutation.isPending}
      />

      <ReceiptModal
        order={receiptTarget}
        onClose={() => setReceiptTarget(null)}
      />
    </div>
  );
}
