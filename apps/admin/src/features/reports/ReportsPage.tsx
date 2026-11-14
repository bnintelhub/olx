import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  ShieldAlert,
  AlertTriangle,
  Search,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Ban,
  RotateCw,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ServerReport {
  id: string;
  reporterId: string;
  reportedId: string;
  adId: string | null;
  reason: string;
  details: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED' | 'UNDER_REVIEW';
  resolutionReason?: string | null;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  ad?: {
    id: string;
    title: string;
    slug?: string;
    status: string;
    price: number;
    images?: Array<{
      url?: string;
      thumbnailUrl?: string;
      displayUrl?: string;
      originalUrl?: string;
    }>;
  } | null;
  reporter?: {
    id: string;
    phoneNumber?: string;
    profile?: { name?: string | null } | null;
  } | null;
  reported?: {
    id: string;
    phoneNumber?: string;
    status: string;
    profile?: { name?: string | null } | null;
  } | null;
}

export function ReportsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch reports from backend
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const res = await apiClient.get('/moderation/reports');
      const reports = res.data?.data?.reports;
      return (Array.isArray(reports) ? reports : []) as ServerReport[];
    },
  });

  const reports = data || [];

  // Take down ad mutation
  const takeDownMutation = useMutation({
    mutationFn: async ({ id, reportCode }: { id: string; reportCode: string }) => {
      setActionLoadingId(id);
      await apiClient.patch(`/moderation/reports/${id}`, {
        status: 'RESOLVED',
        resolutionReason: 'Listing taken down due to safety violation',
        takeDownAd: true,
      });
      return reportCode;
    },
    onSuccess: (code) => {
      toast.success(`Listing taken down for ticket ${code}`);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to take down listing');
    },
    onSettled: () => {
      setActionLoadingId(null);
    },
  });

  // Dismiss report mutation
  const dismissMutation = useMutation({
    mutationFn: async ({ id, reportCode }: { id: string; reportCode: string }) => {
      setActionLoadingId(id);
      await apiClient.patch(`/moderation/reports/${id}`, {
        status: 'DISMISSED',
        resolutionReason: 'Dismissed after moderator review',
      });
      return reportCode;
    },
    onSuccess: (code) => {
      toast.success(`Report dismissed for ticket ${code}`);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to dismiss report');
    },
    onSettled: () => {
      setActionLoadingId(null);
    },
  });

  const getSeverity = (reason: string) => {
    const r = reason.toUpperCase();
    if (r.includes('FRAUD') || r.includes('PROHIBITED') || r.includes('SCAM')) {
      return 'CRITICAL';
    }
    if (r.includes('PRICE') || r.includes('INAPPROPRIATE')) {
      return 'HIGH';
    }
    return 'MEDIUM';
  };

  const getSeverityBadge = (severity: 'CRITICAL' | 'HIGH' | 'MEDIUM') => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <ShieldAlert className="h-3 w-3" />
            <span>Critical</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-3 w-3" />
            <span>High</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <span>Medium</span>
          </span>
        );
    }
  };

  const filtered = reports.filter((r) => {
    const reportCode = `#REP-${r.id.slice(-4).toUpperCase()}`;
    const targetTitle = r.ad?.title || (r.reported ? `User: ${r.reported.profile?.name || r.reported.phoneNumber}` : '');
    const reasonText = `${r.reason} ${r.details || ''}`;

    const matchesSearch =
      reportCode.toLowerCase().includes(search.toLowerCase()) ||
      targetTitle.toLowerCase().includes(search.toLowerCase()) ||
      reasonText.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Review Queue & Safety Reports</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Investigate fraud reports, counterfeit products, and trust violations with real-time enforcement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5 h-8"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Badge variant="outline" className="text-xs gap-1.5 py-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Fraud Shield Active</span>
          </Badge>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by ticket ID, target, or violation reason..."
                className="pl-9 h-9 text-xs bg-muted/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1">
              {['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                    statusFilter === s
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {s}
                  {s === 'PENDING' && pendingCount > 0 && (
                    <span className="ml-1 px-1 py-0.2 rounded-full text-[9px] bg-amber-500 text-white font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider text-muted-foreground font-bold">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 py-3 min-w-[110px]">Ticket ID</TableHead>
                  <TableHead className="px-4 py-3 min-w-[240px]">Flagged Target</TableHead>
                  <TableHead className="px-4 py-3 min-w-[260px]">Violation Reason</TableHead>
                  <TableHead className="px-4 py-3 min-w-[100px] text-center">Severity</TableHead>
                  <TableHead className="px-4 py-3 min-w-[140px]">Reported By</TableHead>
                  <TableHead className="px-4 py-3 min-w-[100px] text-center">Status</TableHead>
                  <TableHead className="px-4 py-3 text-right min-w-[170px]">Enforcement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span>Loading safety reports...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      {reports.length === 0
                        ? 'No safety violation reports have been submitted yet.'
                        : 'No reports match the current filter.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((report) => {
                    const reportCode = `#REP-${report.id.slice(-4).toUpperCase()}`;
                    const targetTitle =
                      report.ad?.title ||
                      (report.reported ? `User: ${report.reported.profile?.name || report.reported.phoneNumber}` : 'Flagged Listing');
                    const image =
                      report.ad?.images?.[0]?.url ||
                      report.ad?.images?.[0]?.displayUrl ||
                      report.ad?.images?.[0]?.originalUrl;
                    const reporterName =
                      report.reporter?.profile?.name || report.reporter?.phoneNumber || 'Registered User';
                    const severity = getSeverity(report.reason);
                    const isBusy = actionLoadingId === report.id;

                    return (
                      <TableRow key={report.id} className="transition-colors hover:bg-muted/30">
                        {/* Ticket Code */}
                        <TableCell className="px-4 py-3 font-mono font-bold text-xs text-foreground">
                          {reportCode}
                          <span className="text-[10px] text-muted-foreground block font-sans">
                            {formatDate(report.createdAt)}
                          </span>
                        </TableCell>

                        {/* Flagged Target */}
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {image ? (
                              <img
                                src={image}
                                alt=""
                                className="h-10 w-10 rounded-md object-cover border shrink-0 bg-muted"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0 border text-[10px] text-muted-foreground font-mono">
                                {report.adId ? 'AD' : 'USR'}
                              </div>
                            )}
                            <div className="min-w-0 max-w-[220px]">
                              <div className="font-bold text-xs text-foreground truncate" title={targetTitle}>
                                {targetTitle}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className="text-[9px] font-mono">
                                  {report.adId ? 'AD' : 'USER'}
                                </Badge>
                                {report.ad?.price !== undefined && (
                                  <span className="text-[10px] text-muted-foreground font-semibold">
                                    {formatCurrency(report.ad.price)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Violation Reason & Details */}
                        <TableCell className="px-4 py-3">
                          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                            {report.reason.replace(/_/g, ' ')}
                          </div>
                          {report.details && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2" title={report.details}>
                              {report.details}
                            </p>
                          )}
                          {report.resolutionReason && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 italic">
                              Resolved: {report.resolutionReason}
                            </p>
                          )}
                        </TableCell>

                        {/* Severity */}
                        <TableCell className="px-4 py-3 text-center">
                          {getSeverityBadge(severity)}
                        </TableCell>

                        {/* Reporter */}
                        <TableCell className="px-4 py-3 text-xs">
                          <span className="font-semibold text-foreground">{reporterName}</span>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            {report.reporter?.phoneNumber || 'Active Account'}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              report.status === 'PENDING'
                                ? 'warning'
                                : report.status === 'RESOLVED'
                                ? 'success'
                                : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {report.status}
                          </Badge>
                        </TableCell>

                        {/* Enforcement Actions */}
                        <TableCell className="px-4 py-3 text-right">
                          {report.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                disabled={isBusy}
                                onClick={() => takeDownMutation.mutate({ id: report.id, reportCode })}
                                className="h-7 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1"
                              >
                                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                                <span>Take Down</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => dismissMutation.mutate({ id: report.id, reportCode })}
                                className="h-7 px-2.5 text-xs"
                              >
                                Dismiss
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1">
                              {report.status === 'RESOLVED' ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  <span>Action Logged</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Dismissed</span>
                                </>
                              )}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Active safety reports: <strong className="text-foreground">{pendingCount}</strong> pending action
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="h-7 w-7 p-0">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-background text-foreground font-mono">
                1 / 1
              </span>
              <Button variant="outline" size="sm" disabled className="h-7 w-7 p-0">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
