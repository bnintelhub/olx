import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { FileText, Shield } from 'lucide-react';

const MOCK_AUDIT_LOGS = [
  { id: '1', action: 'ADMIN_LOGIN', entityType: 'USER', entityId: 'admin_root', ip: '127.0.0.1', date: '2026-03-03 06:45:10' },
  { id: '2', action: 'LISTING_STATUS_UPDATE', entityType: 'AD', entityId: 'ad_9921', ip: '127.0.0.1', date: '2026-03-03 06:42:15' },
  { id: '3', action: 'USER_EMAIL_LOGIN', entityType: 'USER', entityId: 'user_102', ip: '192.168.1.42', date: '2026-03-03 06:30:00' },
  { id: '4', action: 'PAYMENT_REFUND_ISSUED', entityType: 'PAYMENT', entityId: 'pay_4412', ip: '127.0.0.1', date: '2026-03-02 22:15:33' },
  { id: '5', action: 'REPORT_RESOLVED', entityType: 'REPORT', entityId: 'rep_881', ip: '127.0.0.1', date: '2026-03-02 18:20:00' },
];

export function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Immutable Audit Trail</h2>
        <p className="text-sm text-muted-foreground">
          Forensic audit log of all administrative actions, staff logins, user status updates, and financial refunds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>Audit Log Stream</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead className="text-right">Origin IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_AUDIT_LOGS.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground font-mono">{log.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs font-semibold">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="secondary">{log.entityType}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {log.ip}
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

