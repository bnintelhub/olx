import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Headphones, MessageSquare, Check } from 'lucide-react';

const TICKETS = [
  { id: 'TKT-441', user: 'pooja.verma@test.com', subject: 'Unable to edit verified phone number', priority: 'High', status: 'Open', date: '2026-03-03' },
  { id: 'TKT-442', user: 'amit_buyer@gmail.com', subject: 'Seller asking payment outside marketplace', priority: 'Urgent', status: 'In Review', date: '2026-03-02' },
  { id: 'TKT-443', user: 'dealer_bangalore@cars.in', subject: 'GST invoice request for package purchase', priority: 'Medium', status: 'Resolved', date: '2026-03-01' },
];

export function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Customer Support & Inquiries</h2>
        <p className="text-sm text-muted-foreground">
          Dedicated desk for customer complaints, inquiries, account assistance, and dispute mediation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TICKETS.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs font-semibold">{t.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{t.subject}</div>
                    <div className="text-xs text-muted-foreground">{t.date}</div>
                  </TableCell>
                  <TableCell className="text-sm">{t.user}</TableCell>
                  <TableCell>
                    <Badge variant={t.priority === 'Urgent' ? 'destructive' : t.priority === 'High' ? 'warning' : 'outline'}>
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'Open' ? 'warning' : t.status === 'Resolved' ? 'success' : 'secondary'}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Reply</span>
                    </Button>
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
