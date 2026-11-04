import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { cn } from '../../lib/utils';
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
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../components/ui/dropdown-menu';
import {
  Search,
  Download,
  RotateCw,
  MoreHorizontal,
  Mail,
  Eye,
  Copy,
  Check,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertOctagon,
} from 'lucide-react';
import { toast } from 'sonner';

interface ServerAuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    role: string;
    profile?: { name?: string | null };
  } | null;
}

// Maps action names to visual categories for badge presentation and tab filtering
function categorizeAction(action: string): 'SECURITY' | 'MODERATION' | 'FINANCE' | 'SYSTEM' {
  if (
    action.includes('LOGIN') ||
    action.includes('LOGOUT') ||
    action.includes('ROLE') ||
    action.includes('INVITATION') ||
    action.includes('PASSWORD') ||
    action.includes('AUTH')
  ) {
    return 'SECURITY';
  }
  if (
    action.includes('AD') ||
    action.includes('REPORT') ||
    action.includes('SUSPEND') ||
    action.includes('BAN')
  ) {
    return 'MODERATION';
  }
  if (action.includes('PAYMENT') || action.includes('REFUND') || action.includes('INVOICE')) {
    return 'FINANCE';
  }
  return 'SYSTEM';
}

// Builds readable operation summaries from event types and transition payloads
function formatAuditDetails(log: ServerAuditLog): { summary: string; alert?: string } {
  const isSuperAdminAlert = log.newData?._alert === 'HIGH_SEVERITY_SUPER_ADMIN_CHANGE';
  const reasonText = log.newData?.reason ? ` • Reason: "${log.newData.reason}"` : '';
  const ticketText = log.newData?.ticketReference ? ` [Ref: ${log.newData.ticketReference}]` : '';

  if (log.action.includes('ROLE')) {
    const oldR = log.oldData?.role || 'NONE';
    const newR = log.newData?.role || log.newData?.attemptedRole || 'NONE';
    return {
      summary: `Role change: ${oldR} ➔ ${newR}${reasonText}${ticketText}`,
      alert: isSuperAdminAlert ? 'Super Admin Escalation' : undefined,
    };
  }

  if (log.action.includes('INVITATION_SENT')) {
    const inviteEmail = log.newData?.email || log.entityId;
    const inviteRole = log.newData?.role ? ` (${log.newData.role})` : '';
    const expiry = log.newData?.expiryType
      ? ` • Validity: ${log.newData.expiryType.replace('_', ' ')}`
      : '';
    return {
      summary: `Staff invite sent to ${inviteEmail}${inviteRole}${expiry}${reasonText}`,
    };
  }

  if (log.action.includes('INVITATION_ACCEPTED')) {
    const acceptedEmail =
      log.user?.email || log.newData?.email || log.oldData?.email || log.entityId;
    const acceptedRole = log.user?.role || log.newData?.role || 'STAFF';
    return {
      summary: `Staff account activated for ${acceptedEmail} as ${acceptedRole}`,
    };
  }

  if (log.action.includes('INVITATION_REVOKED')) {
    const revokedTarget = log.oldData?.email || log.newData?.email;
    return {
      summary: `Staff invitation revoked${revokedTarget ? ` for ${revokedTarget}` : ` (ID: ${log.entityId.slice(0, 8)}...)`}${reasonText}`,
    };
  }

  if (log.action === 'LOGOUT' || log.action.includes('LOGOUT')) {
    const logoutUser = log.user?.email || log.user?.profile?.name || log.entityId;
    return {
      summary: `User session logged out (${logoutUser})`,
    };
  }

  if (log.action.includes('LOGIN')) {
    const isAdmin = log.action === 'ADMIN_LOGIN';
    const loginUser = log.user?.email || log.user?.profile?.name;
    return {
      summary: `${isAdmin ? 'Admin login verified' : 'User authentication'}${loginUser ? ` for ${loginUser}` : ''}${log.newData?.reason ? ` (${log.newData.reason})` : ''}`,
    };
  }

  if (log.action.includes('DELETE_AD')) {
    return {
      summary: `Soft-deleted listing ID: ${log.entityId}${reasonText}`,
    };
  }

  const humanAction = log.action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    summary: `${humanAction} on ${log.entityType}:${log.entityId.length > 20 ? log.entityId.slice(0, 12) + '...' : log.entityId}${reasonText}${ticketText}`,
  };
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<ServerAuditLog | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Fetches paginated forensic audit records from the PostgreSQL audit log table
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-audit-logs', page, search],
    queryFn: async () => {
      const res = await apiClient.get('/admin/audit-logs', {
        params: {
          page,
          limit: 20,
          search: search.trim() || undefined,
        },
      });
      return res.data?.data as {
        logs: ServerAuditLog[];
        pagination: { total: number; totalPages: number };
      };
    },
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  // Filter logs by selected high-level category tab
  const filtered = logs.filter((log) => {
    if (categoryFilter === 'ALL') return true;
    return categorizeAction(log.action) === categoryFilter;
  });

  const getActionBadge = (category: string, action: string) => {
    switch (category) {
      case 'SECURITY':
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-mono text-[10px]">
            {action}
          </Badge>
        );
      case 'MODERATION':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-mono text-[10px]">
            {action}
          </Badge>
        );
      case 'FINANCE':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono text-[10px]">
            {action}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-mono text-[10px]">
            {action}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Immutable Audit Trail
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Append-only, forensic audit logs of all administrative changes, role transitions, staff
            invitations, and security events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs cursor-pointer"
            disabled={isFetching}
            onClick={async () => {
              await refetch();
              toast.success('Audit trail refreshed');
            }}
          >
            <RotateCw
              className={cn('h-3.5 w-3.5 text-muted-foreground', isFetching && 'animate-spin')}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs cursor-pointer"
            onClick={() => {
              const blob = new Blob([JSON.stringify(logs, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `audit-log-export-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Forensic audit log export completed.');
            }}
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export Archive</span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search audit trail by actor email, action, or target ID..."
                className="pl-9 h-9 text-xs bg-muted/20"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {['ALL', 'SECURITY', 'MODERATION', 'FINANCE', 'SYSTEM'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition shrink-0 cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {cat}
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
                  <TableHead className="px-4 py-3 min-w-[140px] max-w-[160px]">UTC Timestamp</TableHead>
                  <TableHead className="px-4 py-3 min-w-[190px] max-w-[240px]">
                    Actor (Initiator)
                  </TableHead>
                  <TableHead className="px-4 py-3 min-w-[160px]">Action Event</TableHead>
                  <TableHead className="px-4 py-3 min-w-[260px] max-w-[340px]">
                    Operation Details & Reason
                  </TableHead>
                  <TableHead className="px-4 py-3 min-w-[130px] max-w-[160px]">
                    Affected Target
                  </TableHead>
                  <TableHead className="px-4 py-3 min-w-[130px] max-w-[150px]">
                    Origin IP / Request ID
                  </TableHead>
                  <TableHead className="px-4 py-3 min-w-[90px]">Outcome</TableHead>
                  <TableHead className="px-3 py-3 text-right w-[60px] min-w-[60px]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-xs text-muted-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Querying immutable audit log database...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-xs text-muted-foreground"
                    >
                      No audit records match the current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log) => {
                    const category = categorizeAction(log.action);
                    const details = formatAuditDetails(log);
                    const outcome = log.newData?.status || 'SUCCESS';
                    const isSuccess = outcome === 'SUCCESS';

                    const actorEmail = log.user?.email || log.newData?.actor?.email;
                    const actorName =
                      log.user?.profile?.name ||
                      (actorEmail
                        ? actorEmail.split('@')[0]
                        : log.userId
                        ? 'Admin'
                        : 'System / Guest');
                    const actorRole = log.user?.role || log.newData?.actor?.role || 'SYSTEM';

                    return (
                      <TableRow key={log.id} className="transition-colors hover:bg-muted/30">
                        {/* Timestamp */}
                        <TableCell className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                          <span className="text-[10px] text-muted-foreground block font-sans">
                            {new Date(log.createdAt).toLocaleDateString()} UTC
                          </span>
                        </TableCell>

                        {/* Actor (Initiator) with Name, Email & Role */}
                        <TableCell className="px-4 py-3 min-w-[190px] max-w-[240px]">
                          <div
                            className="font-semibold text-xs text-foreground truncate"
                            title={actorName}
                          >
                            {actorName}
                          </div>
                          {actorEmail ? (
                            <div
                              className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate"
                              title={actorEmail}
                            >
                              <Mail className="h-3 w-3 shrink-0 opacity-70" />
                              <span className="truncate">{actorEmail}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground/60 italic mt-0.5">
                              {log.userId ? 'Admin User' : 'System automated'}
                            </div>
                          )}
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-muted/60 text-[10px] font-mono text-muted-foreground border">
                              {actorRole}
                            </span>
                          </div>
                        </TableCell>

                        {/* Action Event */}
                        <TableCell className="px-4 py-3">
                          {getActionBadge(category, log.action)}
                          {details.alert && (
                            <span className="block mt-1">
                              <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30 font-bold text-[9px] flex items-center gap-1 w-fit">
                                <AlertOctagon className="h-2.5 w-2.5" />
                                <span>{details.alert}</span>
                              </Badge>
                            </span>
                          )}
                        </TableCell>

                        {/* Operation Details & Truncated View */}
                        <TableCell className="px-4 py-3 text-xs text-foreground min-w-[260px] max-w-[340px]">
                          <div className="line-clamp-2 leading-relaxed" title={details.summary}>
                            {details.summary}
                          </div>
                          {(log.newData || log.oldData || details.summary.length > 55) && (
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium mt-1 cursor-pointer transition-colors"
                              title="Click to view complete details"
                            >
                              <span className="font-bold tracking-widest leading-none">...</span>
                              <span>view all details</span>
                            </button>
                          )}
                        </TableCell>

                        {/* Affected Target */}
                        <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground min-w-[130px] max-w-[160px]">
                          <span className="font-semibold text-foreground block">
                            {log.entityType}
                          </span>
                          <span
                            className="block text-[10px] truncate max-w-[140px]"
                            title={log.entityId}
                          >
                            {log.entityId}
                          </span>
                        </TableCell>

                        {/* Origin IP / Request ID */}
                        <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono min-w-[130px] max-w-[150px]">
                          <div className="truncate">{log.ipAddress || '127.0.0.1'}</div>
                          {log.newData?.requestId && (
                            <span
                              className="block text-[10px] text-muted-foreground/80 truncate max-w-[130px]"
                              title={log.newData.requestId}
                            >
                              req: {log.newData.requestId}
                            </span>
                          )}
                        </TableCell>

                        {/* Outcome Status */}
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>SUCCESS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                              <AlertTriangle className="h-3 w-3" />
                              <span>FAILED</span>
                            </span>
                          )}
                        </TableCell>

                        {/* 3-Dot Action Menu to View All Details */}
                        <TableCell className="px-3 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-muted cursor-pointer"
                                title="View details & options"
                              >
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                <span className="sr-only">Open details menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => setSelectedLog(log)}
                                className="cursor-pointer gap-2"
                              >
                                <Eye className="h-3.5 w-3.5 text-primary" />
                                <span>View all details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(log.id);
                                  toast.success('Audit log ID copied');
                                }}
                                className="cursor-pointer gap-2"
                              >
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Copy Log ID</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                                  toast.success('Raw log JSON copied');
                                }}
                                className="cursor-pointer gap-2"
                              >
                                <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Copy Full JSON</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              Showing <strong className="text-foreground">{filtered.length}</strong> of{' '}
              <strong className="text-foreground">{pagination.total}</strong> immutable audit
              entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-background text-foreground font-mono">
                {page} / {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forensic Audit Record Details Modal */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLog(null);
            setCopiedField(null);
          }
        }}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {selectedLog && (() => {
          const cat = categorizeAction(selectedLog.action);
          const det = formatAuditDetails(selectedLog);
          const email = selectedLog.user?.email || selectedLog.newData?.actor?.email;
          const name =
            selectedLog.user?.profile?.name ||
            (email ? email.split('@')[0] : selectedLog.userId ? 'Admin' : 'System / Guest');
          const role = selectedLog.user?.role || selectedLog.newData?.actor?.role || 'SYSTEM';
          const success = (selectedLog.newData?.status || 'SUCCESS') === 'SUCCESS';

          return (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap pr-6">
                  {getActionBadge(cat, selectedLog.action)}
                  {success ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>SUCCESS</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span>FAILED</span>
                    </span>
                  )}
                  {det.alert && (
                    <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30 font-bold text-[9px] flex items-center gap-1">
                      <AlertOctagon className="h-2.5 w-2.5" />
                      <span>{det.alert}</span>
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-base font-bold mt-2">Audit Event Details</DialogTitle>
                <DialogDescription className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                  <span>ID: {selectedLog.id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedLog.id, 'Log ID')}
                    className="hover:text-foreground inline-flex items-center gap-0.5 cursor-pointer"
                    title="Copy Log ID"
                  >
                    {copiedField === 'Log ID' ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </DialogDescription>
              </DialogHeader>

              {/* Operation Summary */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Operation Summary
                </div>
                <div className="text-xs text-foreground font-medium leading-relaxed">
                  {det.summary}
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Action Initiator */}
                <div className="rounded-lg border p-3 space-y-1 bg-background">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Action Initiator (Actor)
                  </div>
                  <div className="font-bold text-foreground text-xs">{name}</div>
                  <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="font-mono">{email || 'No email associated'}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Role: <span className="font-semibold text-foreground">{role}</span>
                  </div>
                  {selectedLog.userId && (
                    <div
                      className="text-[10px] text-muted-foreground font-mono truncate"
                      title={selectedLog.userId}
                    >
                      User ID: {selectedLog.userId}
                    </div>
                  )}
                </div>

                {/* Affected Target */}
                <div className="rounded-lg border p-3 space-y-1 bg-background">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Affected Target
                  </div>
                  <div className="font-bold text-foreground text-xs">{selectedLog.entityType}</div>
                  <div className="text-[11px] font-mono text-muted-foreground break-all">
                    ID: {selectedLog.entityId}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Action Event: <span className="font-mono text-foreground">{selectedLog.action}</span>
                  </div>
                </div>

                {/* UTC Timestamp */}
                <div className="rounded-lg border p-3 space-y-1 bg-background">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    UTC Timestamp
                  </div>
                  <div className="font-mono text-foreground text-[11px]">
                    {new Date(selectedLog.createdAt).toISOString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(selectedLog.createdAt).toLocaleString()} (Local)
                  </div>
                </div>

                {/* Network / Client */}
                <div className="rounded-lg border p-3 space-y-1 bg-background">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Network & Client
                  </div>
                  <div className="font-mono text-[11px] text-foreground">
                    IP: {selectedLog.ipAddress || '127.0.0.1'}
                  </div>
                  {selectedLog.newData?.requestId && (
                    <div
                      className="font-mono text-[10px] text-muted-foreground truncate"
                      title={selectedLog.newData.requestId}
                    >
                      Req ID: {selectedLog.newData.requestId}
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div
                      className="text-[10px] text-muted-foreground line-clamp-1"
                      title={selectedLog.userAgent}
                    >
                      UA: {selectedLog.userAgent}
                    </div>
                  )}
                </div>
              </div>

              {/* Data Payloads */}
              <div className="space-y-3">
                {selectedLog.newData && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        New Data Payload (State Change)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(JSON.stringify(selectedLog.newData, null, 2), 'New Data')
                        }
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'New Data' ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="p-2.5 rounded-lg border bg-muted/40 font-mono text-[11px] overflow-x-auto max-h-48 text-foreground">
                      {JSON.stringify(selectedLog.newData, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.oldData && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Old Data Payload (Prior State)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(JSON.stringify(selectedLog.oldData, null, 2), 'Old Data')
                        }
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'Old Data' ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="p-2.5 rounded-lg border bg-muted/40 font-mono text-[11px] overflow-x-auto max-h-48 text-foreground">
                      {JSON.stringify(selectedLog.oldData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 cursor-pointer"
                  onClick={() =>
                    copyToClipboard(JSON.stringify(selectedLog, null, 2), 'Full Record')
                  }
                >
                  {copiedField === 'Full Record' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>Copy Full Record JSON</span>
                </Button>
                <Button
                  size="sm"
                  className="text-xs cursor-pointer"
                  onClick={() => setSelectedLog(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
}
