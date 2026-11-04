import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  Search,
  Loader2,
  RefreshCw,
  Check,
} from 'lucide-react';
import { useDashboardStats, useModerationReports } from './hook/useDashboardQuery';
import { useResolveReport } from './hook/useDashboardMutation';

export function SupportDashboard() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('ALL');

  const { data: stats, isFetching: statsFetching, refetch: refetchStats } = useDashboardStats('CUSTOMER_SUPPORT');
  const {
    data: reports = [],
    isLoading: reportsLoading,
    isFetching: reportsFetching,
    refetch: refetchReports,
  } = useModerationReports(filter === 'ALL' ? undefined : filter);

  const resolveMutation = useResolveReport();

  const filteredReports = reports.filter((r) => {
    const term = search.toLowerCase();
    const reporterName = r.reporter?.profile?.name || r.reporter?.phoneNumber || '';
    const reportedName = r.reported?.profile?.name || r.reported?.phoneNumber || '';
    const adTitle = r.ad?.title || '';
    const reason = r.reason || '';

    const matchesSearch =
      reporterName.toLowerCase().includes(term) ||
      reportedName.toLowerCase().includes(term) ||
      adTitle.toLowerCase().includes(term) ||
      reason.toLowerCase().includes(term);

    const matchesFilter = filter === 'ALL' || r.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleResolve = (id: string) => {
    resolveMutation.mutate({
      id,
      status: 'RESOLVED',
      resolutionReason: 'Resolved by customer support operator',
    });
  };

  const handleRefreshAll = () => {
    refetchStats();
    refetchReports();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Support Helpdesk</h2>
          <p className="text-xs text-muted-foreground">
            Manage customer complaints, tickets, dispute inquiries, and user account support.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={statsFetching || reportsFetching}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${statsFetching || reportsFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="px-3 py-1 text-xs font-semibold border-primary/20 text-primary">
            Live Support Queue
          </Badge>
        </div>
      </div>

      {/* 4 Support KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Open Reports</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {stats?.openTickets ?? 0} Open
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Pending operator investigation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">High Priority Disputes</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.urgentTickets ?? 0} Urgent
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Fraud or scam escalation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Resolved Today</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats?.resolvedToday ?? 0} Cases
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Closed within target SLA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Active Users</span>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(stats?.totalUsers ?? 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Covered accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Support Tickets Table Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div>
            <CardTitle className="text-base font-bold">Disputes & Support Reports</CardTitle>
            <p className="text-xs text-muted-foreground">Direct incident reports submitted by marketplace buyers & sellers.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ticket or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 rounded-lg border bg-muted/40 pl-8 pr-3 text-xs focus:bg-background outline-none w-48"
              />
            </div>

            <div className="flex items-center rounded-lg border bg-muted/20 p-0.5 text-xs">
              {(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    filter === s ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider">
              <TableRow>
                <TableHead className="px-5 py-3">Report ID</TableHead>
                <TableHead className="px-5 py-3">Complainant</TableHead>
                <TableHead className="px-5 py-3">Subject / Target</TableHead>
                <TableHead className="px-5 py-3">Reason</TableHead>
                <TableHead className="px-5 py-3">Status</TableHead>
                <TableHead className="px-5 py-3">Date</TableHead>
                <TableHead className="px-5 py-3 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span>Loading support tickets & reports...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                    No open reports or tickets found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((r) => {
                  const reporter = r.reporter?.profile?.name || r.reporter?.phoneNumber || 'Customer';
                  const targetTitle = r.ad?.title || (r.reported ? `User: ${r.reported.profile?.name || r.reported.phoneNumber}` : 'Direct Report');
                  const formattedReason = String(r.reason).replace(/_/g, ' ');
                  const isPending = r.status === 'PENDING';

                  return (
                    <TableRow key={r.id} className="transition-colors hover:bg-muted/30">
                      <TableCell className="px-5 py-3 font-mono text-xs font-semibold text-primary">
                        #{r.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs font-medium text-foreground">
                        {reporter}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {targetTitle}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs font-medium text-foreground">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {formattedReason}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <Badge
                          variant={isPending ? 'warning' : 'outline'}
                          className="text-[10px]"
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs text-muted-foreground font-mono">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-right">
                        {isPending ? (
                          <Button
                            size="sm"
                            disabled={resolveMutation.isPending}
                            onClick={() => handleResolve(r.id)}
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Resolve
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium">Closed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
