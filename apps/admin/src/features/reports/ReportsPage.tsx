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
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportRecord {
  id: string;
  reportCode: string;
  reason: string;
  targetType: 'AD' | 'USER';
  targetTitle: string;
  targetPrice?: string;
  imageUrl?: string;
  reporterName: string;
  reporterTrust: 'HIGH' | 'REGULAR';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  timeAgo: string;
  slaMinutesRemaining: number;
}

const INITIAL_REPORTS: ReportRecord[] = [
  {
    id: 'rep_1',
    reportCode: '#REP-8491',
    reason: 'Advance Fee Scam Request via WhatsApp (Demanded ₹5,000 courier deposit)',
    targetType: 'USER',
    targetTitle: 'User: Rahul_seller99 (+91 91234 56789)',
    reporterName: 'Amit Verma',
    reporterTrust: 'HIGH',
    severity: 'CRITICAL',
    status: 'PENDING',
    timeAgo: '12m ago',
    slaMinutesRemaining: 18,
  },
  {
    id: 'rep_2',
    reportCode: '#REP-8490',
    reason: 'Counterfeit / Replica Product sold as Original iPhone 15 Pro',
    targetType: 'AD',
    targetTitle: 'iPhone 15 Pro Max 256GB Sealed (Asking ₹22,000)',
    targetPrice: '₹22,000',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&auto=format&fit=crop&q=60',
    reporterName: 'Priya Sharma',
    reporterTrust: 'HIGH',
    severity: 'HIGH',
    status: 'PENDING',
    timeAgo: '28m ago',
    slaMinutesRemaining: 32,
  },
  {
    id: 'rep_3',
    reportCode: '#REP-8489',
    reason: 'Vehicle Missing Registration / Stolen Motorcycle Suspicion',
    targetType: 'AD',
    targetTitle: 'Royal Enfield Classic 350 - Urgent Cash Distress Sale',
    targetPrice: '₹45,000',
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=100&auto=format&fit=crop&q=60',
    reporterName: 'Traffic Police Liaison',
    reporterTrust: 'HIGH',
    severity: 'CRITICAL',
    status: 'PENDING',
    timeAgo: '45m ago',
    slaMinutesRemaining: 15,
  },
  {
    id: 'rep_4',
    reportCode: '#REP-8488',
    reason: 'Watermark of competitor classifieds portal on images',
    targetType: 'AD',
    targetTitle: '2 BHK Apartment in Whitefield Bangalore',
    targetPrice: '₹75,00,000',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&auto=format&fit=crop&q=60',
    reporterName: 'System Anti-Scraper Bot',
    reporterTrust: 'HIGH',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    timeAgo: '2h ago',
    slaMinutesRemaining: 0,
  },
  {
    id: 'rep_5',
    reportCode: '#REP-8487',
    reason: 'Abusive language in in-app chat after buyer negotiated price',
    targetType: 'USER',
    targetTitle: 'User: angry_seller_01',
    reporterName: 'Neha Gupta',
    reporterTrust: 'REGULAR',
    severity: 'MEDIUM',
    status: 'DISMISSED',
    timeAgo: '4h ago',
    slaMinutesRemaining: 0,
  },
];

export function ReportsPage() {
  const [reports, setReports] = useState<ReportRecord[]>(INITIAL_REPORTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const filtered = reports.filter((r) => {
    const matchesSearch =
      r.targetTitle.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase()) ||
      r.reportCode.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resolveReport = (id: string, newStatus: ReportRecord['status'], actionLabel: string) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          toast.success(`${actionLabel} for ${r.reportCode}`);
          return { ...r, status: newStatus };
        }
        return r;
      })
    );
  };

  const getSeverityBadge = (severity: ReportRecord['severity']) => {
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Review Queue & Safety Reports</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Investigate fraud reports, counterfeit products, and trust violations with SLA enforcement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1.5 py-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Automated Fraud Shield Active</span>
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
                  <TableHead className="px-4 py-3 min-w-[110px] text-center">SLA Status</TableHead>
                  <TableHead className="px-4 py-3 min-w-[100px] text-center">Status</TableHead>
                  <TableHead className="px-4 py-3 text-right min-w-[160px]">Enforcement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      No reports match the current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((report) => (
                    <TableRow key={report.id} className="transition-colors hover:bg-muted/30">
                      {/* Ticket Code */}
                      <TableCell className="px-4 py-3 font-mono font-bold text-xs text-foreground">
                        {report.reportCode}
                        <span className="text-[10px] text-muted-foreground block font-sans">{report.timeAgo}</span>
                      </TableCell>

                      {/* Flagged Target */}
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {report.imageUrl && (
                            <img
                              src={report.imageUrl}
                              alt=""
                              className="h-9 w-9 rounded-md object-cover border shrink-0 bg-muted"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-foreground truncate">
                              {report.targetTitle}
                            </div>
                            <Badge variant="outline" className="text-[9px] font-mono mt-0.5">
                              {report.targetType}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      {/* Violation Reason */}
                      <TableCell className="px-4 py-3">
                        <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {report.reason}
                        </div>
                      </TableCell>

                      {/* Severity */}
                      <TableCell className="px-4 py-3 text-center">
                        {getSeverityBadge(report.severity)}
                      </TableCell>

                      {/* Reporter */}
                      <TableCell className="px-4 py-3 text-xs">
                        <span className="font-semibold text-foreground">{report.reporterName}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Trust Tier: {report.reporterTrust}
                        </span>
                      </TableCell>

                      {/* SLA */}
                      <TableCell className="px-4 py-3 text-center">
                        {report.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            <span>{report.slaMinutesRemaining}m left</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Resolved</span>
                        )}
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
                              onClick={() => resolveReport(report.id, 'RESOLVED', 'Taken down')}
                              className="h-7 px-2 bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1"
                            >
                              <Ban className="h-3 w-3" />
                              <span>Take Down</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveReport(report.id, 'DISMISSED', 'Dismissed')}
                              className="h-7 px-2 text-xs"
                            >
                              Dismiss
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">Action Logged</span>
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
              Active safety reports: <strong className="text-foreground">{reports.filter((r) => r.status === 'PENDING').length}</strong> pending action
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
