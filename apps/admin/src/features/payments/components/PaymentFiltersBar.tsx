import { Search, Download, RefreshCw, X, Calendar, Filter } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { paymentsService } from '../service/payments.service';

interface PaymentFiltersBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  purposeFilter: string;
  onPurposeChange: (val: string) => void;
  fromDate: string;
  onFromDateChange: (val: string) => void;
  toDate: string;
  onToDateChange: (val: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onClearFilters: () => void;
}

export function PaymentFiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  purposeFilter,
  onPurposeChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  onRefresh,
  isRefreshing,
  onClearFilters,
}: PaymentFiltersBarProps) {
  const hasActiveFilters =
    Boolean(search) || statusFilter !== 'ALL' || purposeFilter !== 'ALL' || Boolean(fromDate) || Boolean(toDate);

  const handleExport = () => {
    const url = paymentsService.exportCsvUrl({
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      purpose: purposeFilter !== 'ALL' ? purposeFilter : undefined,
      search: search ? search : undefined,
      from: fromDate ? fromDate : undefined,
      to: toDate ? toDate : undefined,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 space-y-3.5 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search input (User, Transaction ID, Email, Phone) */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by Transaction ID, User, Email, Phone..."
            className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background border-border/80 focus-visible:ring-primary/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls: Refresh, Export, Clear */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            className="h-9 gap-1.5 text-xs font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 transition shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Filter Selectors Row */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
        {/* Status Dropdown */}
        <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-xl border border-border/60">
          <span className="font-semibold text-muted-foreground text-[11px]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Successful</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        {/* Revenue Type Dropdown */}
        <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-xl border border-border/60">
          <span className="font-semibold text-muted-foreground text-[11px]">Type:</span>
          <select
            value={purposeFilter}
            onChange={(e) => onPurposeChange(e.target.value)}
            className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer text-xs"
          >
            <option value="ALL">All Revenue Types</option>
            <option value="EXTRA_LISTINGS">Ad Package</option>
            <option value="BOOST">Boost</option>
            <option value="FEATURED_AD">Featured Listing</option>
            <option value="SELLER_SUBSCRIPTION">Seller Subscription</option>
            <option value="OTHER">Other Fees</option>
          </select>
        </div>

        {/* Date From */}
        <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-xl border border-border/60">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold text-muted-foreground text-[11px]">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-xl border border-border/60">
          <span className="font-semibold text-muted-foreground text-[11px]">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

