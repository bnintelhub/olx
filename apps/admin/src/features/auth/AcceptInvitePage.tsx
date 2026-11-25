import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authService, InvitationDetails } from './service/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Command, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // 1. Fetch and validate invitation token
  const { data: invite, isLoading: isCheckingInvite, error: inviteError } = useQuery<InvitationDetails>({
    queryKey: ['invitation', token],
    queryFn: () => authService.getInvitationDetails(token),
    enabled: Boolean(token),
    retry: false,
  });

  // 2. Accept mutation
  const acceptMutation = useMutation({
    mutationFn: (payload: { token: string; name: string; password: string; phoneNumber?: string }) =>
      authService.acceptStaffInvitation(payload),
    onSuccess: (data) => {
      setAuth(data.user);
      toast.success(`Welcome to the team, ${data.user.name}! Your account is active.`);
      navigate('/dashboard');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to accept invitation';
      toast.error(msg);
    },
  });

  // Validates user input matching and sends the staff onboarding acceptance request.
  // Stores password hash, activates the staff role, and sets session cookies upon completion.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    acceptMutation.mutate({
      token,
      name: name.trim(),
      password,
      phoneNumber: phoneNumber.trim() || undefined,
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
        <Card className="max-w-md w-full bg-card border-border text-card-foreground shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg text-foreground">Missing Invitation Token</CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              No invitation token was provided in the URL link.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/login">
              <Button variant="outline" className="w-full text-foreground hover:bg-muted">
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCheckingInvite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
          <p className="text-xs text-muted-foreground">Validating staff invitation token...</p>
        </div>
      </div>
    );
  }

  if (inviteError || !invite) {
    const errorMsg = (inviteError as any)?.response?.data?.message || 'Invalid or expired invitation token';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
        <Card className="max-w-md w-full bg-card border-border text-card-foreground shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg text-foreground">Invitation Unavailable</CardTitle>
            <CardDescription className="text-muted-foreground text-xs mt-1">
              {errorMsg}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xs text-muted-foreground mb-4">
              Please contact your platform Super Admin to request a fresh invitation link.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full text-foreground hover:bg-muted">
                Return to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm shadow-xs">
            <Command className="h-4 w-4" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-foreground">BLX Orbit Operations Console</span>
        </div>

        {/* Invitation Welcome Card */}
        <Card className="bg-card border-border text-card-foreground shadow-2xl">
          <CardHeader className="space-y-1 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] font-mono">
                Staff Invitation
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {invite.isLifetime || !invite.expiresAt || new Date(invite.expiresAt).getFullYear() >= 2099
                  ? 'No Expiry (Lifetime)'
                  : `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
              </span>
            </div>
            <CardTitle className="text-xl text-foreground font-bold pt-2">
              Complete Your Staff Account
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              You were invited by <strong className="text-foreground">{invite.invitedBy}</strong> to join as a{' '}
              <Badge variant="outline" className="ml-1 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-bold text-[10px]">
                {invite.role}
              </Badge>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email (Read-only) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Assigned Work Email</label>
                <Input
                  type="email"
                  value={invite.email}
                  disabled
                  className="h-9 bg-muted/50 border-input text-muted-foreground cursor-not-allowed text-xs font-mono"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Full Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 bg-background border-input text-foreground focus-visible:ring-emerald-500 text-xs"
                />
              </div>

              {/* Phone (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Phone Number (Optional)</label>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-9 bg-background border-input text-foreground focus-visible:ring-emerald-500 text-xs"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Set Account Password *</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-9 bg-background border-input text-foreground focus-visible:ring-emerald-500 text-xs"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Confirm Password *</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-9 bg-background border-input text-foreground focus-visible:ring-emerald-500 text-xs"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={acceptMutation.isPending}
                className="w-full h-10 font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition mt-4 cursor-pointer gap-2"
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Activate Account & Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

