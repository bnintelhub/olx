import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { ShieldCheck, Lock } from 'lucide-react';

const ADMIN_ROLES_MATRIX = [
  {
    role: 'Super Admin (SUPER_ADMIN)',
    description: 'Root system administrator with wildcard access across all platform modules and settings.',
    permissions: ['Wildcard: * (All Permissions)'],
    badge: 'Full Root Access',
  },
  {
    role: 'Admin (ADMIN)',
    description: 'Manages users, classified listings, categories, and moderation. Cannot issue financial refunds.',
    permissions: ['users:read', 'users:manage', 'ads:moderate', 'categories:manage', 'reports:read'],
    badge: 'Operations',
  },
  {
    role: 'Moderator (MODERATOR)',
    description: 'Inspects and approves/rejects listing submissions and investigates user abuse reports.',
    permissions: ['ads:read', 'ads:moderate', 'reports:read', 'reports:investigate'],
    badge: 'Trust & Safety',
  },
  {
    role: 'Customer Support (CUSTOMER_SUPPORT)',
    description: 'Handles support tickets, customer inquiries, and dispute review with limited read-only lookups.',
    permissions: ['support:read', 'support:tickets', 'users:read', 'ads:read'],
    badge: 'Customer Care',
  },
  {
    role: 'Finance Admin (FINANCE_ADMIN)',
    description: 'Manages transaction ledgers, payments, refunds, and invoices. Cannot edit listings or settings.',
    permissions: ['payments:read', 'payments:refund', 'invoices:manage', 'revenue:analytics'],
    badge: 'Finance & Billing',
  },
  {
    role: 'Content Manager (CONTENT_MANAGER)',
    description: 'Curates homepage banners, promo ribbons, category taxonomy, and platform announcements.',
    permissions: ['categories:manage', 'banners:manage', 'cms:announcements'],
    badge: 'Marketing & Content',
  },
  {
    role: 'Analyst (ANALYST)',
    description: 'Read-only access to business intelligence, lead analytics, conversion rates, and reports.',
    permissions: ['analytics:read', 'reports:read', 'metrics:export'],
    badge: 'BI & Analytics',
  },
];

export function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Roles & Access Control (RBAC)</h2>
        <p className="text-sm text-muted-foreground">
          Strict separation of duties. Universal admin access is prevented; capabilities are scoped to job function.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span>Staff Roles & Granular Permission Matrix</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Title</TableHead>
                <TableHead>Scope & Responsibilities</TableHead>
                <TableHead>Granted Permissions</TableHead>
                <TableHead className="text-right">Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ADMIN_ROLES_MATRIX.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>{item.role}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-sm">
                    {item.description}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {item.permissions.map((p, pIdx) => (
                        <Badge key={pIdx} variant="secondary" className="font-mono text-[10px]">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{item.badge}</Badge>
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

