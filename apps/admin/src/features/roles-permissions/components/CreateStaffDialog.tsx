import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AdminRole } from '../../../types';
import {
  authService,
  CreateStaffInvitationPayload,
  CreateDirectStaffPayload,
} from '../../auth/service/auth.service';
import {
  UserPlus,
  Clock,
  Copy,
  Check,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Link2,
} from 'lucide-react';

export const INVITABLE_ROLES: { role: AdminRole; label: string; desc: string }[] = [
  { role: 'ADMIN', label: 'Admin', desc: 'Platform operations, user moderation, and category configuration.' },
  { role: 'MODERATOR', label: 'Moderator', desc: 'Review ad approvals/rejections and trust & safety reports.' },
  { role: 'CUSTOMER_SUPPORT', label: 'Customer Support', desc: 'Tickets, user queries, and customer disputes.' },
  { role: 'FINANCE_ADMIN', label: 'Finance Admin', desc: 'Transactions ledger, escrow settlements, and refunds.' },
  { role: 'CONTENT_MANAGER', label: 'Content Manager', desc: 'Campaign banners, taxonomy tree, and content CMS.' },
  { role: 'ANALYST', label: 'Analyst', desc: 'Business intelligence and performance metric reports.' },
];

const EXPIRY_OPTIONS = [
  { value: '2_DAYS', label: '2 Days (48 Hours - Default)' },
  { value: '3_DAYS', label: '3 Days (72 Hours)' },
  { value: '7_DAYS', label: '7 Days (1 Week)' },
  { value: 'NO_EXPIRY', label: 'No Expiry (Never Expires)' },
  { value: 'CUSTOM', label: 'Manual Date / Time Set' },
];

interface CreateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStaffDialog({ open, onOpenChange }: CreateStaffDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'INVITE' | 'DIRECT'>('DIRECT');

  // Shared Form Fields
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('MODERATOR');

  // Direct Staff Fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Short-Term Invite Fields
  const [expiryType, setExpiryType] = useState<'2_DAYS' | '3_DAYS' | '7_DAYS' | 'NO_EXPIRY' | 'CUSTOM'>('2_DAYS');
  const [customExpiresAt, setCustomExpiresAt] = useState('');

  // Creation Results
  const [copied, setCopied] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ email: string; link: string; role: AdminRole } | null>(null);
  const [directResult, setDirectResult] = useState<{ name: string; email: string; role: AdminRole; pass: string } | null>(null);

  // Generate random secure password helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    toast.info('Secure password generated');
  };

  // Direct Permanent Staff Mutation
  const directMutation = useMutation({
    mutationFn: (payload: CreateDirectStaffPayload) => authService.createDirectStaff(payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      setDirectResult({
        name: vars.name,
        email: vars.email,
        role: vars.role,
        pass: vars.password,
      });
      toast.success(`Staff account created for ${vars.email}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to create staff account');
    },
  });

  // Short-Term Token Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: (payload: CreateStaffInvitationPayload) => authService.createStaffInvitation(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      setInviteResult({
        email: data.invitation.email,
        link: data.inviteLink,
        role: data.invitation.role,
      });
      navigator.clipboard.writeText(data.inviteLink);
      toast.success('Invitation link generated and copied to clipboard');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate invitation link');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (activeTab === 'DIRECT') {
      if (!name.trim() || !password.trim()) {
        toast.error('Full name and password are required for permanent staff');
        return;
      }
      directMutation.mutate({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        phoneNumber: phoneNumber.trim() || undefined,
      });
    } else {
      inviteMutation.mutate({
        email: email.trim(),
        role,
        expiryType,
        customExpiresAt: expiryType === 'CUSTOM' ? customExpiresAt : null,
      });
    }
  };

  const resetDialog = () => {
    setEmail('');
    setName('');
    setPassword('');
    setPhoneNumber('');
    setInviteResult(null);
    setDirectResult(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetDialog} className="max-w-md">
      <DialogContent>
        {directResult ? (
          // Direct Provisioning Result Card
          <div className="space-y-4 py-1">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Check className="h-5 w-5" />
                <span>Permanent Staff Account Created</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                The staff member can log in directly at <span className="font-mono text-foreground font-semibold">/admin/login</span> using these credentials.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-border bg-muted/50 p-3.5 space-y-2 text-xs font-mono">
              <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground font-semibold">{directResult.name}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground font-semibold">{directResult.email}</span></div>
              <div><span className="text-muted-foreground">Role:</span> <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{directResult.role}</span></div>
              <div><span className="text-muted-foreground">Password:</span> <span className="text-amber-600 dark:text-amber-300 font-bold">{directResult.pass}</span></div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${directResult.email}\nPassword: ${directResult.pass}\nRole: ${directResult.role}\nLogin: ${window.location.origin}/admin/login`);
                  setCopied(true);
                  toast.success('Credentials copied to clipboard');
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="gap-2 cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied' : 'Copy Credentials'}</span>
              </Button>
              <Button size="sm" onClick={resetDialog} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : inviteResult ? (
          // Invite Token Result Card
          <div className="space-y-4 py-1">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Link2 className="h-5 w-5" />
                <span>Invitation Link Ready</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Share this link with <span className="font-semibold text-foreground">{inviteResult.email}</span> to complete their onboarding.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-border bg-muted/50 p-3 text-xs font-mono break-all text-foreground">
              {inviteResult.link}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(inviteResult.link);
                  setCopied(true);
                  toast.success('Invite link copied');
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="gap-2 cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </Button>
              <Button size="sm" onClick={resetDialog} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Provisioning Form
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Add Staff Member</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Choose between permanent direct assignment or temporary token onboarding.
              </DialogDescription>
            </DialogHeader>

            {/* Segmented Mode Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-muted border border-border text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('DIRECT')}
                className={`py-1.5 px-3 rounded-md font-semibold transition cursor-pointer ${
                  activeTab === 'DIRECT'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Permanent Staff (Direct)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('INVITE')}
                className={`py-1.5 px-3 rounded-md font-semibold transition cursor-pointer ${
                  activeTab === 'INVITE'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Short-Term (Invite Link)
              </button>
            </div>

            <div className="space-y-3 py-1">
              {activeTab === 'DIRECT' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Full Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-9 text-xs bg-background text-foreground"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Staff Work Email *</label>
                <Input
                  type="email"
                  placeholder="staff@blxorbit.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9 text-xs bg-background text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Operational Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminRole)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r.role} value={r.role} className="bg-background text-foreground">
                      {r.label} ({r.role})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {INVITABLE_ROLES.find((r) => r.role === role)?.desc}
                </p>
              </div>

              {activeTab === 'DIRECT' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Account Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Sparkles className="h-3 w-3" /> Auto-generate
                    </button>
                  </div>
                  <Input
                    type="text"
                    placeholder="Set temporary password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-9 text-xs bg-background text-foreground font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Invitation Validity *</span>
                  </label>
                  <select
                    value={expiryType}
                    onChange={(e) => setExpiryType(e.target.value as any)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {EXPIRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-background text-foreground">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={resetDialog} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={directMutation.isPending || inviteMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
              >
                {directMutation.isPending || inviteMutation.isPending
                  ? 'Processing...'
                  : activeTab === 'DIRECT'
                  ? 'Create Permanent Account'
                  : 'Generate Invite Link'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
