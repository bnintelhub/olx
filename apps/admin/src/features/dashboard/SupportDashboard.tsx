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
  Headphones,
  CheckCircle2,
  Clock,
  Star,
  Search,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface TicketItem {
  id: string;
  ticketId: string;
  user: string;
  email: string;
  subject: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  time: string;
}

const INITIAL_TICKETS: TicketItem[] = [
  {
    id: 't_1',
    ticketId: '#TK-9821',
    user: 'Amit Sharma',
    email: 'amit.s@gmail.com',
    subject: 'Listing not showing in search results after payment',
    priority: 'HIGH',
    status: 'OPEN',
    time: '12m ago',
  },
  {
    id: 't_2',
    ticketId: '#TK-9820',
    user: 'Pooja Verma',
    email: 'pooja.v@hotmail.com',
    subject: 'Payment debited for Featured Package but ad remains standard',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    time: '34m ago',
  },
  {
    id: 't_3',
    ticketId: '#TK-9819',
    user: 'Karan Mehra',
    email: 'karan99@yahoo.com',
    subject: 'Account phone number verification OTP not received',
    priority: 'MEDIUM',
    status: 'OPEN',
    time: '1h ago',
  },
  {
    id: 't_4',
    ticketId: '#TK-9818',
    user: 'Sunil Rao',
    email: 'sunil.rao@outlook.com',
    subject: 'Report fraudulent seller claiming non-delivery of vehicle',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    time: '2h ago',
  },
  {
    id: 't_5',
    ticketId: '#TK-9817',
    user: 'Ritu Gupta',
    email: 'ritu.g@gmail.com',
    subject: 'How to cancel seller subscription auto-renewal',
    priority: 'LOW',
    status: 'RESOLVED',
    time: '4h ago',
  },
];

export function SupportDashboard() {
  const [tickets, setTickets] = useState<TicketItem[]>(INITIAL_TICKETS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.user.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketId.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleResolve = (id: string, ticketNumber: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'RESOLVED' as const } : t))
    );
    toast.success(`Ticket ${ticketNumber} marked as Resolved`);
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
        <Badge variant="outline" className="px-3 py-1 text-xs font-semibold">
          Live Agent Queue: Active
        </Badge>
      </div>

      {/* 4 Support KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Open Tickets</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">42 Open</div>
            <p className="text-[11px] text-muted-foreground mt-1">Awaiting first response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">In Progress</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">18 Active</div>
            <p className="text-[11px] text-muted-foreground mt-1">Under investigation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Resolved Today</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">65 Cases</div>
            <p className="text-[11px] text-muted-foreground mt-1">Avg turnaround: 32 min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">CSAT Score</span>
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">4.8 / 5.0</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">96.4% customer satisfaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Support Tickets Table Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div>
            <CardTitle className="text-base font-bold">Support Tickets</CardTitle>
            <p className="text-xs text-muted-foreground">Direct inquiries submitted by marketplace buyers & sellers.</p>
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
              {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    filter === s ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.replace('_', ' ')}
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
                <TableHead className="px-5 py-3">Customer</TableHead>
                <TableHead className="px-5 py-3">Subject / Issue</TableHead>
                <TableHead className="px-5 py-3">Priority</TableHead>
                <TableHead className="px-5 py-3">Status</TableHead>
                <TableHead className="px-5 py-3">Time</TableHead>
                <TableHead className="px-5 py-3 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="px-5 py-3 font-mono font-bold text-primary">{t.ticketId}</TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="font-semibold text-foreground">{t.user}</div>
                    <div className="text-[11px] text-muted-foreground">{t.email}</div>
                  </TableCell>
                  <TableCell className="px-5 py-3 max-w-xs truncate text-foreground font-medium">{t.subject}</TableCell>
                  <TableCell className="px-5 py-3">
                    <Badge
                      variant={t.priority === 'HIGH' ? 'destructive' : t.priority === 'MEDIUM' ? 'warning' : 'outline'}
                      className="text-[10px]"
                    >
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        t.status === 'OPEN'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {t.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-muted-foreground">{t.time}</TableCell>
                  <TableCell className="px-5 py-3 text-right">
                    {t.status !== 'RESOLVED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(t.id, t.ticketId)}
                        className="h-7 text-xs"
                      >
                        Resolve
                      </Button>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Done ✓</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

