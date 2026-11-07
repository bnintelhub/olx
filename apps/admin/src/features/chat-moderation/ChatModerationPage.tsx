import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  MessageSquare,
  ShieldAlert,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  FileText,
  User,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ChatOverviewMetrics {
  totalConversations: number;
  activeConversations: number;
  messagesToday: number;
  messagesPerMinute: number;
  pendingReports: number;
  blockedUsers: number;
  spamDetectionEvents: number;
}

interface ChatReportItem {
  id: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string };
  reported: { id: string; name: string } | null;
  ad: { id: string; title: string; price: number } | null;
  messagePreview?: string | null;
  assignedTo?: string | null;
}

export function ChatModerationPage() {
  const [metrics, setMetrics] = useState<ChatOverviewMetrics | null>(null);
  const [reports, setReports] = useState<ChatReportItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<any | null>(null);
  const [internalNote, setInternalNote] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'RESOLVED' | 'ALL'>('PENDING');

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/v1/admin/chat/overview');
      const json = await res.json();
      if (json.success) setMetrics(json.data);
    } catch {
      // ignore
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const queryParam = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/v1/admin/chat/reports${queryParam}`);
      const json = await res.json();
      if (json.success && json.data) {
        setReports(json.data.reports || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchReports();
  }, [statusFilter]);

  const handleInspectReport = async (reportId: string) => {
    setSelectedReportId(reportId);
    try {
      const res = await fetch(`/api/v1/admin/chat/reports/${reportId}`);
      const json = await res.json();
      if (json.success) {
        setReportDetail(json.data.report);
      }
    } catch {
      // ignore
    }
  };

  const handleTakeAction = async (action: 'DISMISS' | 'REMOVE_MESSAGE' | 'RESTRICT_USER' | 'SUSPEND_USER' | 'RESOLVE') => {
    if (!selectedReportId) return;
    try {
      const res = await fetch(`/api/v1/admin/chat/reports/${selectedReportId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: actionNote }),
      });
      if (res.ok) {
        setActionNote('');
        handleInspectReport(selectedReportId);
        fetchReports();
        fetchOverview();
      }
    } catch {
      // ignore
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !internalNote.trim()) return;
    try {
      const res = await fetch(`/api/v1/admin/chat/reports/${selectedReportId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: internalNote.trim() }),
      });
      if (res.ok) {
        setInternalNote('');
        handleInspectReport(selectedReportId);
      }
    } catch {
      // ignore
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`/api/v1/admin/chat/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const json = await res.json();
      if (json.success) {
        setSearchResults(json.data || []);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with live indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Trust & Safety
            </span>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Live Operational Stream</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground">Chat & Messaging Moderation</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor real-time conversations, investigate reported messages, enforce rate limits, and prevent advance payment scams.
          </p>
        </div>
      </div>

      {/* 2. Overview Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="rounded-xl border">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Active Conversations</span>
            <div className="text-xl font-black text-foreground">{metrics?.activeConversations ?? 0}</div>
            <span className="text-[10px] text-muted-foreground">Total: {metrics?.totalConversations ?? 0}</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Messages Today</span>
            <div className="text-xl font-black text-foreground">{metrics?.messagesToday ?? 0}</div>
            <span className="text-[10px] text-emerald-600 font-semibold">{metrics?.messagesPerMinute ?? 0} msgs/min</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Pending Reports</span>
            <div className="text-xl font-black text-amber-600">{metrics?.pendingReports ?? 0}</div>
            <span className="text-[10px] text-muted-foreground">Requires review</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Blocked Users</span>
            <div className="text-xl font-black text-foreground">{metrics?.blockedUsers ?? 0}</div>
            <span className="text-[10px] text-muted-foreground">Active block pairs</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Spam Events</span>
            <div className="text-xl font-black text-rose-600">{metrics?.spamDetectionEvents ?? 0}</div>
            <span className="text-[10px] text-muted-foreground">Automated filters</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Avg Latency</span>
            <div className="text-xl font-black text-emerald-600">82ms</div>
            <span className="text-[10px] text-muted-foreground">p95 &lt; 200ms target</span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search Bar for Authorized Staff */}
      <Card className="rounded-2xl border p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Conversation ID, Listing ID, User ID or Ad Title..."
              className="w-full pl-9 pr-3 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button type="submit" size="sm" className="rounded-xl font-bold">
            Search
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-3 divide-y border rounded-xl overflow-hidden text-xs">
            {searchResults.map((c) => (
              <div key={c.id} className="p-2.5 flex items-center justify-between hover:bg-muted/40">
                <div>
                  <span className="font-bold text-foreground">{c.ad?.title}</span>
                  <span className="text-muted-foreground text-[10px] ml-2">
                    ({c.buyer?.name} ↔ {c.seller?.name})
                  </span>
                  <p className="text-[11px] text-muted-foreground truncate max-w-md">{c.lastMessageText}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {c.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Moderation Reports Queue */}
      <Card className="rounded-2xl border overflow-hidden">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Reported Conversations Queue</CardTitle>
            <p className="text-xs text-muted-foreground">Investigate reported marketplace messages and advance fee violations</p>
          </div>
          <div className="flex gap-1">
            {(['PENDING', 'RESOLVED', 'ALL'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === st ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </CardHeader>

        <div className="divide-y text-xs">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading reports queue...</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No reports matching selected status.</div>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                onClick={() => handleInspectReport(r.id)}
                className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/30 cursor-pointer transition ${
                  selectedReportId === r.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded text-[10px]">
                      {r.reason}
                    </span>
                    <Badge variant={r.status === 'PENDING' ? 'warning' : 'outline'} className="text-[9px]">
                      {r.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground">
                    Reporter: {r.reporter.name} {r.reported ? `→ Reported: ${r.reported.name}` : ''}
                  </p>
                  {r.ad && <p className="text-[11px] text-primary">Listing: {r.ad.title}</p>}
                  {r.messagePreview && (
                    <p className="text-[11px] text-muted-foreground italic">"{r.messagePreview}"</p>
                  )}
                </div>

                <Button size="sm" variant="outline" className="rounded-lg text-xs font-bold shrink-0">
                  Investigate
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 5. Detailed Investigation Drawer / Panel */}
      {selectedReportId && reportDetail && (
        <Card className="rounded-2xl border p-5 space-y-4 bg-muted/20">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-black text-foreground">Investigation: Report {reportDetail.id.slice(0, 8)}</h3>
              <p className="text-xs text-muted-foreground">Reason: {reportDetail.reason} • Details: {reportDetail.details || 'None provided'}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedReportId(null)}>✕ Close</Button>
          </div>

          {/* Surrounding Chat Messages Log */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Conversation Audit Thread ({reportDetail.contextMessages?.length || 0} messages)
            </span>
            <div className="max-h-64 overflow-y-auto border rounded-xl p-3 bg-background space-y-2 text-xs">
              {reportDetail.contextMessages?.map((m: any) => (
                <div key={m.id} className="p-2 bg-muted/40 rounded-lg">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="font-bold text-foreground">{m.sender?.profile?.name || m.senderId}</span>
                    <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Moderator Action Buttons */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Take Moderator Action</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleTakeAction('DISMISS')} className="gap-1 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Dismiss (No Violation)
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleTakeAction('REMOVE_MESSAGE')} className="gap-1 text-xs text-rose-600">
                <Trash2 className="w-3.5 h-3.5" />
                Hide/Remove Message
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleTakeAction('RESTRICT_USER')} className="gap-1 text-xs text-amber-600">
                <Ban className="w-3.5 h-3.5" />
                Restrict Messaging
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleTakeAction('SUSPEND_USER')} className="gap-1 text-xs">
                Suspend Account
              </Button>
            </div>
          </div>

          {/* Internal Notes Section (Never visible to users) */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Internal Moderator Notes (Private)</span>
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Add confidential moderation note..."
                className="flex-1 bg-background border rounded-lg px-3 py-1.5 text-xs focus:outline-none"
              />
              <Button type="submit" size="sm" className="rounded-lg text-xs font-bold">
                Add Note
              </Button>
            </form>

            <div className="space-y-1.5 pt-1">
              {reportDetail.moderationNotes?.map((n: any) => (
                <div key={n.id} className="text-xs bg-muted/60 p-2 rounded-lg">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="font-semibold">{n.author?.profile?.name || n.author?.email}</span>
                    <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-0.5">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
