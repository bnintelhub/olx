import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, StaffInvitationItem } from '../auth/service/auth.service';
import { AdminRole } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import {
  ShieldCheck,
  Lock,
  UserPlus,
  Mail,
  Copy,
  Check,
  Ban,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

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

const INVITABLE_ROLES: { role: AdminRole; label: string; desc: string }[] = [
  { role: 'ADMIN', label: 'Admin', desc: 'Platform operations, categories, users, and media.' },
  { role: 'MODERATOR', label: 'Moderator', desc: 'Listing reviews, safety flags, and user moderation queue.' },
  { role: 'CUSTOMER_SUPPORT', label: 'Customer Support', desc: 'Tickets, user queries, and customer disputes.' },
  { role: 'FINANCE_ADMIN', label: 'Finance Admin', desc: 'Transactions ledger, escrow settlements, and refunds.' },
  { role: 'CONTENT_MANAGER', label: 'Content Manager', desc: 'Campaign banners, taxonomy tree, and content CMS.' },
  { role: 'ANALYST', label: 'Analyst', desc: 'Business intelligence and performance metric reports.' },
];

export function RolesPage() {
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('MODERATOR');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Fetch Staff Invitations
  const { data: invitations = [], isLoading } = useQuery<StaffInvitationItem[]>({
    queryKey: ['staff-invitations'],
    queryFn: () => authService.getStaffInvitations(),
  });

  // 2. Create Staff Invitation Mutation
  const inviteMutation = useMutation({
    mutationFn: (payload: { email: string; role: AdminRole }) =>
      authService.createStaffInvitation(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      setIsInviteDialogOpen(false);
      setInviteEmail('');
      toast.success(`Invitation generated for ${data.invitation.email}!`);

      // Copy invite link immediately to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(data.inviteLink);
        toast.info('Invitation link copied to clipboard');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to send invitation';
      toast.error(msg);
    },
  });

  // 3. Revoke Staff Invitation Mutation
  const revokeMutation = useMutation({
    mutationFn: (id: string) => authService.revokeStaffInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      toast.info('Invitation revoked');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to revoke invitation';
      toast.error(msg);
    },
  });

  // Copies the complete invitation onboarding URL to the user clipboard.
  // Temporarily highlights the copied button state for instant visual feedback.
  const handleCopyLink = (token: string, id: string) => {
    const origin = window.location.origin;
    const link = `${origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success('Invitation link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Validates target email and triggers backend staff invitation generation.
  // Sends role assignment and generates a cryptographically secure 48h token.
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Please enter a valid work email');
      return;
    }
    inviteMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Invite Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Roles & Access Control (RBAC)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strict separation of duties. Issue secure single-use invitations for operational staff onboarding.
          </p>
        </div>

        <Button
          onClick={() => setIsInviteDialogOpen(true)}
          className="gap-2 bg-primary text-primary-foreground font-semibold shadow-sm cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Staff Member</span>
        </Button>
      </div>

      {/* Staff Invitations Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span>Staff Team Invitations</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {invitations.length} Total
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Manage onboarding invitation tokens. Invitations are cryptographically signed and expire in 48 hours.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading team invitations...</span>
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              No staff invitations issued yet. Click &quot;Invite Staff Member&quot; to onboard an operator.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invited Email</TableHead>
                  <TableHead>Assigned Role</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const isPending = inv.status === 'PENDING';
                  const isAccepted = inv.status === 'ACCEPTED';
                  const isRevoked = inv.status === 'REVOKED';

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-semibold text-foreground text-xs">
                        {inv.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] border-blue-500/30 text-blue-500 bg-blue-500/10">
                          {inv.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.invitedBy?.profile?.name || inv.invitedBy?.email || 'Super Admin'}
                      </TableCell>
                      <TableCell>
                        {isPending && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px]">
                            Pending
                          </Badge>
                        )}
                        {isAccepted && (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[10px]">
                            Accepted
                          </Badge>
                        )}
                        {isRevoked && (
                          <Badge variant="outline" className="border-rose-500/40 text-rose-500 bg-rose-500/10 text-[10px]">
                            Revoked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyLink(inv.token, inv.id)}
                                className="h-7 px-2 text-xs gap-1 cursor-pointer"
                                title="Copy invitation link"
                              >
                                {copiedId === inv.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                                <span>Copy Link</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeMutation.mutate(inv.id)}
                                disabled={revokeMutation.isPending}
                                className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                title="Revoke invitation"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                <span>Revoke</span>
                              </Button>
                            </>
                          )}
                          {isAccepted && (
                            <span className="text-[11px] text-emerald-500 font-medium">Active Member</span>
                          )}
                          {isRevoked && (
                            <span className="text-[11px] text-muted-foreground">Canceled</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Roles & Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span>Staff Roles & Granular Permission Matrix</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Universal admin access is prohibited. Roles adhere strictly to the principle of least privilege.
          </CardDescription>
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

      {/* Invite Staff Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <form onSubmit={handleSendInvite} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <span>Invite New Staff Member</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send a secure single-use onboarding link. The invitee will set their password and join with the selected role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Staff Work Email *</label>
              <Input
                type="email"
                placeholder="staff.member@olx.in"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Assigned Operational Role *</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                {INVITABLE_ROLES.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label} ({r.role})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground pt-1">
                {INVITABLE_ROLES.find((r) => r.role === inviteRole)?.desc}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={inviteMutation.isPending}
              className="text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground"
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating Invite...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Send Invitation</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
