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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-zinc-100">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg text-white">Missing Invitation Token</CardTitle>
            <CardDescription className="text-zinc-400 text-xs">
              No invitation token was provided in the URL link.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/login">
              <Button variant="outline" className="w-full border-zinc-800 text-zinc-300 hover:text-white">
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-zinc-100">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#22c55e] mx-auto" />
          <p className="text-xs text-zinc-400">Validating staff invitation token...</p>
        </div>
      </div>
    );
  }

  if (inviteError || !invite) {
    const errorMsg = (inviteError as any)?.response?.data?.message || 'Invalid or expired invitation token';
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-zinc-100">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg text-white">Invitation Unavailable</CardTitle>
            <CardDescription className="text-zinc-400 text-xs mt-1">
              {errorMsg}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xs text-zinc-500 mb-4">
              Please contact your platform Super Admin to request a fresh invitation link.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full border-zinc-800 text-zinc-300 hover:text-white">
                Return to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black font-black text-sm">
            <Command className="h-4 w-4" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">OLX Operations Console</span>
        </div>

        {/* Invitation Welcome Card */}
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
          <CardHeader className="space-y-1 pb-4 border-b border-zinc-800/80">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] font-mono">
                Staff Invitation
              </Badge>
              <span className="text-[10px] text-zinc-500">
                Expires {new Date(invite.expiresAt).toLocaleDateString()}
              </span>
            </div>
            <CardTitle className="text-xl text-white font-bold pt-2">
              Complete Your Staff Account
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs">
              You were invited by <strong className="text-zinc-200">{invite.invitedBy}</strong> to join as a{' '}
              <Badge variant="outline" className="ml-1 border-blue-500/40 text-blue-400 bg-blue-500/10 font-bold text-[10px]">
                {invite.role}
              </Badge>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email (Read-only) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Assigned Work Email</label>
                <Input
                  type="email"
                  value={invite.email}
                  disabled
                  className="h-9 bg-zinc-950 border-zinc-800 text-zinc-400 cursor-not-allowed text-xs font-mono"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-200">Full Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 text-xs"
                />
              </div>

              {/* Phone (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-200">Phone Number (Optional)</label>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 text-xs"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-200">Set Account Password *</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 text-xs"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-200">Confirm Password *</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 text-xs"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={acceptMutation.isPending}
                className="w-full h-10 font-bold bg-[#22c55e] hover:bg-[#16a34a] text-black transition mt-4 cursor-pointer gap-2"
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

        <p className="text-center text-[11px] text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

