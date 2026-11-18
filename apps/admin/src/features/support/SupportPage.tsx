import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Headphones,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Loader2,
  Filter,
} from 'lucide-react';
import { useSupportStatsQuery, useSupportTicketsQuery } from './hook/useSupportQuery';
import { SupportTicketDetailModal } from './components/SupportTicketDetailModal';

const CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'ACCOUNT_ASSISTANCE', label: 'Account Assistance' },
  { value: 'COMPLAINT', label: 'User Complaints' },
  { value: 'DISPUTE_MEDIATION', label: 'Dispute Mediation' },
  { value: 'BILLING_PAYMENT', label: 'Billing & Invoices' },
  { value: 'FRAUD_SAFETY', label: 'Fraud & Safety' },
  { value: 'GENERAL_INQUIRY', label: 'General Inquiry' },
];

const STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'] as const;

export function SupportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketIdFromUrl = searchParams.get('ticketId');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(ticketIdFromUrl);

  useEffect(() => {
    if (ticketIdFromUrl) {
      setSelectedTicketId(ticketIdFromUrl);
    }
  }, [ticketIdFromUrl]);

  const handleCloseDetail = () => {
    setSelectedTicketId(null);
    if (searchParams.has('ticketId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('ticketId');
      setSearchParams(next, { replace: true });
    }
  };

  const { data: stats, isFetching: statsFetching, refetch: refetchStats } = useSupportStatsQuery();
  const {
    data: ticketData,
    isLoading: ticketsLoading,
    isFetching: ticketsFetching,
    refetch: refetchTickets,
  } = useSupportTicketsQuery({
    search: search || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    category: categoryFilter === 'ALL' ? undefined : categoryFilter,
  });

  const tickets = ticketData?.tickets || [];

  const handleRefresh = () => {
    refetchStats();
    refetchTickets();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Headphones className="h-6 w-6 text-primary" />
            Customer Support & Inquiries
          </h2>
          <p className="text-sm text-muted-foreground">
            Dedicated desk for customer complaints, inquiries, account assistance, and dispute mediation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={statsFetching || ticketsFetching}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${statsFetching || ticketsFetching ? 'animate-spin' : ''}`} />
            Refresh Desk
          </Button>
          <Badge variant="outline" className="px-3 py-1 text-xs font-semibold border-primary/20 text-primary">
            Support Desk Active
          </Badge>
        </div>
      </div>

      {/* 4 Support KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Open Tickets</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {stats?.openTickets ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Awaiting first response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Urgent Disputes</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.urgentTickets ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">High-priority dispute cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">In Progress</span>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.inProgressTickets ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Under operator review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Resolved Today</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats?.resolvedToday ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Successfully closed cases</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div>
            <CardTitle className="text-base font-bold">Inquiries & Tickets Queue</CardTitle>
            <p className="text-xs text-muted-foreground">
              Direct inquiries and dispute tickets submitted by registered buyers and sellers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ticket, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 rounded-lg border bg-muted/40 pl-8 pr-3 text-xs focus:bg-background outline-none w-48"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 rounded-lg border bg-background px-2.5 text-xs text-muted-foreground"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Status Tabs */}
            <div className="flex items-center rounded-lg border bg-muted/20 p-0.5 text-xs overflow-x-auto">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap text-[11px] ${
                    statusFilter === s ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider">
              <TableRow>
                <TableHead className="px-5 py-3">Ticket ID</TableHead>
                <TableHead className="px-5 py-3">Subject / Inquiry</TableHead>
                <TableHead className="px-5 py-3">Customer</TableHead>
                <TableHead className="px-5 py-3">Priority</TableHead>
                <TableHead className="px-5 py-3">Status</TableHead>
                <TableHead className="px-5 py-3">Updated</TableHead>
                <TableHead className="px-5 py-3 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span>Loading support tickets...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                    No tickets found matching the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => {
                  const customer =
                    t.requester?.profile?.name ||
                    (t.requester?.phoneNumber ? `+91 ${t.requester.phoneNumber}` : t.requester?.email || 'Customer');

                  return (
                    <TableRow key={t.id} className="transition-colors hover:bg-muted/30">
                      <TableCell className="px-5 py-3 font-mono text-xs font-semibold text-primary">
                        #{t.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="px-5 py-3 max-w-[280px]">
                        <div className="font-semibold text-foreground text-xs truncate">{t.subject}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {t.category.replace(/_/g, ' ')}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs text-foreground font-medium">
                        {customer}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <Badge
                          variant={
                            t.priority === 'URGENT'
                              ? 'destructive'
                              : t.priority === 'HIGH'
                              ? 'warning'
                              : 'outline'
                          }
                          className="text-[10px]"
                        >
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <Badge
                          variant={
                            t.status === 'OPEN'
                              ? 'warning'
                              : t.status === 'RESOLVED'
                              ? 'success'
                              : t.status === 'CLOSED'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-[10px]"
                        >
                          {t.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs text-muted-foreground font-mono">
                        {new Date(t.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTicketId(t.id)}
                          className="h-7 px-2.5 text-xs gap-1.5"
                        >
                          <MessageSquare className="h-3 w-3" />
                          View & Reply
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ticket Investigation & Reply Modal */}
      <SupportTicketDetailModal
        ticketId={selectedTicketId}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
