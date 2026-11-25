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
import { CreateStaffDialog } from './components/CreateStaffDialog';
import {
  ShieldCheck,
  Lock,
  UserPlus,
  Mail,
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  Loader2,
  Share2,
  CheckCircle2,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/auth.store';

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

// Computes a human-readable validity text and flags for lifetime or expired states
function formatExpiryDisplay(expiresAt: string, isLifetimeFlag?: boolean) {
  if (isLifetimeFlag || !expiresAt || new Date(expiresAt).getFullYear() >= 2099) {
    return { label: 'Never Expires', isLifetime: true, isExpired: false };
  }
  const expDate = new Date(expiresAt);
  const now = new Date();
  const isExpired = now.getTime() > expDate.getTime();
  if (isExpired) {
    return { label: `Expired on ${expDate.toLocaleDateString()}`, isLifetime: false, isExpired: true };
  }
  const diffHours = Math.round((expDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  if (diffHours < 24) {
    return { label: `Expires in ${diffHours}h`, isLifetime: false, isExpired: false };
  }
  const diffDays = Math.round(diffHours / 24);
  return { label: `Expires in ${diffDays}d (${expDate.toLocaleDateString()})`, isLifetime: false, isExpired: false };
}

export function RolesPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Staff ID Suspension Modal State
  const [suspendingStaff, setSuspendingStaff] = useState<StaffInvitationItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // 1. Fetch Staff Accounts & Invitations
  const { data: invitations = [], isLoading } = useQuery<StaffInvitationItem[]>({
    queryKey: ['staff-invitations'],
    queryFn: () => authService.getStaffInvitations(),
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

  // 4. Update Staff Status Mutation (Suspend / Reactivate)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: 'ACTIVE' | 'SUSPENDED'; reason?: string }) =>
      authService.updateStaffStatus(id, { status, reason }),
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      setSuspendingStaff(null);
      setSuspendReason('');

      if (data.isSelf || currentUser?.id === data.user?.id) {
        toast.warning('Your staff ID has been suspended. Logging out for security...');
        setTimeout(async () => {
          await logout();
          window.location.href = '/admin/login';
        }, 1500);
      } else {
        toast.success(data.message || (variables.status === 'SUSPENDED' ? 'Staff ID suspended' : 'Staff ID reactivated'));
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to update staff status';
      toast.error(msg);
    },
  });

  // Copies the complete invitation onboarding URL to the user clipboard.
  // Temporarily highlights the copied button state for instant visual feedback.
  const handleCopyLink = (token: string, id: string) => {
    const origin = window.location.origin;
    const base = (import.meta.env.BASE_URL || '/admin/').replace(/\/$/, '');
    const adminPrefix = base.startsWith('/') ? base : `/${base}`;
    const link = `${origin}${adminPrefix}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success('Invitation link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Invite Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Roles & Access Control (RBAC)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strict separation of duties. Issue secure single-use invitations with customizable validity for team onboarding.
          </p>
        </div>

        <Button
          onClick={() => setIsInviteDialogOpen(true)}
          className="gap-2 bg-primary text-primary-foreground font-semibold shadow-sm cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Staff Member</span>
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
            Manage onboarding invitation tokens. Links remain active and can be shared until their validity expires.
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
                  <TableHead>Role</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validity / Expiration</TableHead>
                  <TableHead>Active Share Link</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const isAccepted = inv.status === 'ACCEPTED';
                  const isRevoked = inv.status === 'REVOKED';
                  const expiry = formatExpiryDisplay(inv.expiresAt, inv.isLifetime);
                  const isExpired = expiry.isExpired;
                  const isPending = inv.status === 'PENDING';
                  const isLinkActive = isPending && !isExpired;

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
                        {isAccepted && (
                          inv.user?.status === 'SUSPENDED' ? (
                            <Badge variant="outline" className="border-rose-500/40 text-rose-500 bg-rose-500/10 text-[10px] flex items-center gap-1 w-fit">
                              <ShieldAlert className="h-3 w-3" />
                              ID Suspended
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[10px] flex items-center gap-1 w-fit">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </Badge>
                          )
                        )}
                        {isRevoked && (
                          <Badge variant="outline" className="border-rose-500/40 text-rose-500 bg-rose-500/10 text-[10px]">
                            Revoked
                          </Badge>
                        )}
                        {isPending && isExpired && (
                          <Badge variant="outline" className="border-rose-500/40 text-rose-500 bg-rose-500/10 text-[10px]">
                            Expired
                          </Badge>
                        )}
                        {isPending && !isExpired && (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[10px] flex items-center gap-1 w-fit">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active Invite
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {expiry.isLifetime ? (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px]">
                            No Expiry
                          </Badge>
                        ) : isExpired ? (
                          <span className="text-rose-500 font-medium text-[11px]">{expiry.label}</span>
                        ) : (
                          <span className="text-muted-foreground font-mono text-[11px]">{expiry.label}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isLinkActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(inv.token, inv.id)}
                            className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer border-primary/40 text-primary hover:bg-primary/10 font-medium shadow-2xs"
                            title="Copy active invite link to share"
                          >
                            {copiedId === inv.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-emerald-500 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="h-3.5 w-3.5" />
                                <span>Copy Share Link</span>
                              </>
                            )}
                          </Button>
                        ) : isAccepted ? (
                          inv.user?.status === 'SUSPENDED' ? (
                            <span className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> Access Terminated
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Account Active
                            </span>
                          )
                        ) : isRevoked ? (
                          <span className="text-[11px] text-muted-foreground">Link Canceled</span>
                        ) : (
                          <span className="text-[11px] text-rose-500">Link Inactive (Expired)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeMutation.mutate(inv.id)}
                              disabled={revokeMutation.isPending}
                              className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                              title="Revoke pending invitation"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>Revoke</span>
                            </Button>
                          )}

                          {isAccepted && inv.user?.status === 'SUSPENDED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: inv.user?.id || inv.id, status: 'ACTIVE' })}
                              disabled={updateStatusMutation.isPending || (currentUser?.role === 'ADMIN' && inv.role === 'SUPER_ADMIN')}
                              className="h-7 px-2 text-xs border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer font-medium"
                              title={currentUser?.role === 'ADMIN' && inv.role === 'SUPER_ADMIN' ? 'Admins cannot modify Super Admins' : 'Reactivate staff access'}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Reactivate ID</span>
                            </Button>
                          )}

                          {isAccepted && inv.user?.status !== 'SUSPENDED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSuspendingStaff(inv)}
                              disabled={updateStatusMutation.isPending || (currentUser?.role === 'ADMIN' && inv.role === 'SUPER_ADMIN')}
                              className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                              title={currentUser?.role === 'ADMIN' && inv.role === 'SUPER_ADMIN' ? 'Admins cannot modify Super Admins' : 'Suspend staff ID immediately if compromised or device stolen'}
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                              <span>Suspend ID</span>
                            </Button>
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

      {/* Unified Staff Creation Dialog: Supports Permanent Direct Assign & Short-Term Invite Tokens */}
      <CreateStaffDialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen} />

      {/* Staff ID Suspension Confirmation Dialog */}
      <Dialog open={!!suspendingStaff} onOpenChange={(open) => !open && setSuspendingStaff(null)}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-500">
            <ShieldAlert className="h-5 w-5" />
            <DialogTitle className="text-base font-semibold">
              Suspend Staff ID: Immediate Security Revocation
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Immediate action to neutralize compromised accounts or stolen credentials.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2 font-medium text-rose-500">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Security Impact of Suspension</span>
            </div>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-1">
              <li><strong>In-Flight Tokens Blocked:</strong> Redis blacklist immediately rejects all active JWT tokens.</li>
              <li><strong>Refresh Tokens Revoked:</strong> Database credentials cleared; the user cannot renew sessions.</li>
              <li><strong>Session Evicted:</strong> Cached identity evicted from memory across all server nodes.</li>
            </ul>
          </div>

          {suspendingStaff && (currentUser?.id === suspendingStaff.user?.id || currentUser?.email === suspendingStaff.email) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-amber-500 font-medium">
              ⚠️ Warning: You are suspending <strong>YOUR OWN</strong> staff ID. You will be logged out immediately upon confirmation.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Target Staff Member</label>
            <div className="p-2.5 rounded-md border bg-muted/40 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{suspendingStaff?.email}</p>
                <p className="text-[11px] text-muted-foreground">{suspendingStaff?.user?.name || 'Staff Operator'}</p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] border-blue-500/30 text-blue-500">
                {suspendingStaff?.role}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Reason for Suspension (Optional)</label>
            <Input
              placeholder="e.g. Lost device, compromised credentials, or security audit"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSuspendingStaff(null)}
            disabled={updateStatusMutation.isPending}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (!suspendingStaff) return;
              updateStatusMutation.mutate({
                id: suspendingStaff.user?.id || suspendingStaff.id,
                status: 'SUSPENDED',
                reason: suspendReason.trim() || undefined,
              });
            }}
            disabled={updateStatusMutation.isPending}
            className="gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white font-medium"
          >
            {updateStatusMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" />
            )}
            <span>Confirm Immediate Suspension</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
