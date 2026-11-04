import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
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
  FileText,
  Shield,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface AuditRecord {
  id: string;
  timestamp: string;
  timeAgo: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  category: 'SECURITY' | 'MODERATION' | 'FINANCE' | 'SYSTEM';
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARN';
}

const INITIAL_LOGS: AuditRecord[] = [
  {
    id: 'log_1',
    timestamp: '2026-11-04 07:15:22',
    timeAgo: '12m ago',
    actorName: 'Rahul Kumar',
    actorEmail: 'rahul@gmail.com',
    actorRole: 'SUPER_ADMIN',
    action: 'USER_SUSPENDED',
    category: 'MODERATION',
    entityType: 'USER',
    entityId: 'usr_8926',
    details: 'Suspended fraudulent account: Spam Bot Seller 99',
    ipAddress: '103.21.244.12 (Delhi, IN)',
    status: 'SUCCESS',
  },
  {
    id: 'log_2',
    timestamp: '2026-11-04 06:45:10',
    timeAgo: '42m ago',
    actorName: 'Rahul Kumar',
    actorEmail: 'rahul@gmail.com',
    actorRole: 'SUPER_ADMIN',
    action: 'ADMIN_SESSION_LOGIN',
    category: 'SECURITY',
    entityType: 'SESSION',
    entityId: 'sess_99214',
    details: 'Successful Super Admin 2FA authenticated login',
    ipAddress: '103.21.244.12 (Delhi, IN)',
    status: 'SUCCESS',
  },
  {
    id: 'log_3',
    timestamp: '2026-11-04 05:30:18',
    timeAgo: '2h ago',
    actorName: 'Finance Gateway Worker',
    actorEmail: 'system@olx.internal',
    actorRole: 'SYSTEM_BOT',
    action: 'PAYMENT_REFUND_EXECUTED',
    category: 'FINANCE',
    entityType: 'PAYMENT',
    entityId: 'pay_99184',
    details: 'Auto-reversal ₹299 for canceled distress badge',
    ipAddress: '127.0.0.1 (Internal VPC)',
    status: 'SUCCESS',
  },
  {
    id: 'log_4',
    timestamp: '2026-11-04 04:12:05',
    timeAgo: '3h ago',
    actorName: 'Sneha Moderator',
    actorEmail: 'sneha.m@olx.internal',
    actorRole: 'MODERATOR',
    action: 'AD_TAKEDOWN_REPORT_RESOLVED',
    category: 'MODERATION',
    entityType: 'AD',
    entityId: 'ad_106',
    details: 'Removed unauthorized crypto scheme ad',
    ipAddress: '115.110.12.89 (Bengaluru, IN)',
    status: 'SUCCESS',
  },
  {
    id: 'log_5',
    timestamp: '2026-11-03 23:18:44',
    timeAgo: '8h ago',
    actorName: 'Security Anti-DDoS',
    actorEmail: 'waf@olx.internal',
    actorRole: 'SYSTEM_BOT',
    action: 'RATE_LIMIT_TRIGGERED',
    category: 'SECURITY',
    entityType: 'ENDPOINT',
    entityId: '/api/v1/auth/otp/send',
    details: 'Blocked IP 185.220.101.4 due to OTP blast (> 20/min)',
    ipAddress: '185.220.101.4 (Tor Exit Node)',
    status: 'WARN',
  },
];

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditRecord[]>(INITIAL_LOGS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.entityId.toLowerCase().includes(search.toLowerCase());

    const matchesCat = categoryFilter === 'ALL' || l.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const getActionBadge = (category: AuditRecord['category'], action: string) => {
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
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Immutable Audit Trail</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographically timestamped forensic logs of all administrative changes, staff logins, and financial events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs"
            onClick={() => toast.success('Exporting forensic audit log archive (JSON)...')}
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
                placeholder="Search audit trail by actor, action, or details..."
                className="pl-9 h-9 text-xs bg-muted/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  <TableHead className="px-4 py-3 min-w-[150px]">Timestamp & Age</TableHead>
                  <TableHead className="px-4 py-3 min-w-[180px]">Actor & Role</TableHead>
                  <TableHead className="px-4 py-3 min-w-[160px]">Action Event</TableHead>
                  <TableHead className="px-4 py-3 min-w-[260px]">Operation Details</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px]">Target Resource</TableHead>
                  <TableHead className="px-4 py-3 min-w-[160px]">Client Origin IP</TableHead>
                  <TableHead className="px-4 py-3 text-right min-w-[90px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No audit records match the current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log) => (
                    <TableRow key={log.id} className="transition-colors hover:bg-muted/30">
                      {/* Timestamp */}
                      <TableCell className="px-4 py-3 font-mono text-xs text-foreground">
                        {log.timestamp}
                        <span className="text-[10px] text-muted-foreground block font-sans">{log.timeAgo}</span>
                      </TableCell>

                      {/* Actor */}
                      <TableCell className="px-4 py-3">
                        <div className="font-bold text-xs text-foreground">{log.actorName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{log.actorRole}</div>
                      </TableCell>

                      {/* Action Event */}
                      <TableCell className="px-4 py-3">
                        {getActionBadge(log.category, log.action)}
                      </TableCell>

                      {/* Details */}
                      <TableCell className="px-4 py-3 text-xs text-foreground">
                        {log.details}
                      </TableCell>

                      {/* Target Resource */}
                      <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{log.entityType}</span>
                        <span className="block text-[10px]">{log.entityId}</span>
                      </TableCell>

                      {/* Origin IP */}
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {log.ipAddress}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-4 py-3 text-right">
                        {log.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Logged</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Warning</span>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing <strong className="text-foreground">{filtered.length}</strong> immutable audit entries
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
