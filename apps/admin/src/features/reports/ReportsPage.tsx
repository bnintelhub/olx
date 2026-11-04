import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

interface Report {
  id: string;
  reason: string;
  targetType: 'AD' | 'USER';
  targetTitle: string;
  reporter: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  date: string;
}

const MOCK_REPORTS: Report[] = [
  { id: '101', reason: 'Counterfeit / Fake Product', targetType: 'AD', targetTitle: 'iPhone 15 Pro clone', reporter: 'Pooja V.', status: 'PENDING', date: '2026-03-03' },
  { id: '102', reason: 'Advance Fee Scam Request', targetType: 'USER', targetTitle: 'User: rahul_seller99', reporter: 'Amit K.', status: 'PENDING', date: '2026-03-02' },
  { id: '103', reason: 'Wrong Category Placement', targetType: 'AD', targetTitle: 'Car battery in Mobiles', reporter: 'Vikram S.', status: 'RESOLVED', date: '2026-03-01' },
  { id: '104', reason: 'Offensive Language in Chat', targetType: 'USER', targetTitle: 'User: bad_actor_01', reporter: 'Neha G.', status: 'DISMISSED', date: '2026-02-28' },
];

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);

  const resolveReport = (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Review Queue & Reports</h2>
        <p className="text-sm text-muted-foreground">
          Investigate user-flagged listings, counterfeit products, and marketplace fraud reports.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Flagged Items Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{report.targetTitle}</div>
                    <Badge variant="outline" className="text-[10px] mt-0.5">
                      Type: {report.targetType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-destructive flex items-center gap-1.5 pt-4">
                    <ShieldAlert className="h-4 w-4" />
                    <span>{report.reason}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {report.reporter} • {report.date}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        report.status === 'PENDING'
                          ? 'warning'
                          : report.status === 'RESOLVED'
                          ? 'success'
                          : 'secondary'
                      }
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {report.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveReport(report.id, 'RESOLVED')}
                          className="h-8 text-emerald-600 hover:text-emerald-700"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Take Down
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveReport(report.id, 'DISMISSED')}
                          className="h-8 text-muted-foreground hover:text-foreground"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Dismiss
                        </Button>
                      </>
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

