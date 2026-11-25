import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useLoginMutation } from './hook/useAuthMutation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AlertCircle, Command, ShieldCheck, Activity, Lock } from 'lucide-react';

export function LoginPage() {
  const [loginTarget, setLoginTarget] = useState<'ADMIN' | 'STAFF'>('ADMIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthChecking = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // Derive video URL respecting Vite base path
  const videoSrc = `${(import.meta.env.BASE_URL || '/admin/').replace(/\/$/, '')}/login-30fps.mp4`;

  // If already authenticated with a staff/admin role, redirect directly to dashboard
  useEffect(() => {
    if (!isAuthChecking && isAuthenticated && user && (user.role as string) !== 'USER') {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAuthChecking, user, navigate]);

  const loginMutation = useLoginMutation();
  const isLoading = loginMutation.isPending;
  const errorObj = (loginMutation.error as any)?.response?.data;
  const rawMsg =
    (typeof errorObj?.error === 'string' ? errorObj.error : errorObj?.error?.message) ||
    (typeof errorObj?.message === 'string' ? errorObj.message : null);
  const errorMessage =
    (loginMutation.error as any)?.response?.status === 401 ||
    errorObj?.error?.code === 'INVALID_ADMIN_CREDENTIALS'
      ? 'Invalid email and password'
      : rawMsg || (typeof loginMutation.error?.message === 'string' ? loginMutation.error.message : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    loginMutation.mutate({
      username: email.trim(),
      password,
    });
  };

  return (
    <div className="relative min-h-screen grid lg:grid-cols-2 bg-zinc-950 text-zinc-100 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Left Column: Ambient Video Background with Backdrop Blur Overlay */}
      <div className="relative hidden h-full flex-col justify-between overflow-hidden p-10 text-white lg:flex border-r border-zinc-800/80 bg-zinc-950">
        {/* Ambient Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover scale-105"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>

        {/* Ambient Lighting Scrim & Depth Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/65 to-zinc-950/80 pointer-events-none" />

        {/* Top Header Branding */}
        <div className="relative z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-950 font-black text-sm shadow-md">
              <Command className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">BLX Orbit</span>
                <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Console
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Enterprise Marketplace Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300 px-3 py-1 rounded-full bg-zinc-900/70 border border-white/10 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Online
          </div>
        </div>

        {/* Bottom Operations Showcase & Telemetry */}
        <div className="relative z-20 mt-auto space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-medium text-emerald-400 tracking-wider uppercase">
              <ShieldCheck className="h-4 w-4" />
              <span>Secure Staff Operations</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              High-velocity marketplace management & trust architecture.
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-lg font-normal">
              Real-time ad moderation, escrow transaction clearance, multi-role RBAC enforcement, and instant seller compliance verification across Indian regions.
            </p>
          </div>

          {/* Telemetry row with backdrop-blur glass styling */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3.5 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2 text-zinc-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Access</span>
              </div>
              <div className="text-sm font-semibold text-white mt-1.5 font-mono">RBAC Enforced</div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Role hierarchy</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3.5 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2 text-zinc-400">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Sync</span>
              </div>
              <div className="text-sm font-semibold text-white mt-1.5 font-mono">Realtime</div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Socket.IO cluster</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3.5 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2 text-zinc-400">
                <Lock className="h-4 w-4 text-amber-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Security</span>
              </div>
              <div className="text-sm font-semibold text-white mt-1.5 font-mono">Audit Logged</div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Full trail tracking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Centered Auth Form */}
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16 relative">
        <div className="mx-auto flex w-full max-w-sm flex-col justify-center space-y-5">
          {/* Persona Switcher: Admin vs Staff */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setLoginTarget('ADMIN')}
              className={`py-2 px-3 rounded-lg font-semibold transition text-center cursor-pointer ${
                loginTarget === 'ADMIN'
                  ? 'bg-zinc-800 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Administrator
            </button>
            <button
              type="button"
              onClick={() => setLoginTarget('STAFF')}
              className={`py-2 px-3 rounded-lg font-semibold transition text-center cursor-pointer ${
                loginTarget === 'STAFF'
                  ? 'bg-zinc-800 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Staff Member
            </button>
          </div>

          {/* Header Title */}
          <div className="flex flex-col space-y-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {loginTarget === 'ADMIN' ? 'Sign in as Administrator' : 'Sign in as Staff Member'}
            </h1>
            <p className="text-xs text-zinc-400">
              {loginTarget === 'ADMIN'
                ? 'Enter your root credentials to access the admin command console'
                : 'Enter your assigned credentials for moderation, support, and audits'}
            </p>
          </div>

          {/* Onboarding Helper for Invited Staff */}
          {loginTarget === 'STAFF' && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-zinc-300 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">Have an onboarding invite link?</span>
              <button
                type="button"
                onClick={() => navigate('/accept-invite')}
                className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
              >
                Accept Invite &rarr;
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/15 border border-rose-500/20 p-3 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">
                {loginTarget === 'ADMIN' ? 'Admin Email / Username' : 'Staff Work Email'}
              </label>
              <Input
                type="email"
                placeholder={loginTarget === 'ADMIN' ? 'admin@bharatmarket.in' : 'staff@blxorbit.in'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Bright Green Accent Button */}
            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !password}
              className="w-full h-10 font-bold bg-[#22c55e] hover:bg-[#16a34a] text-black transition mt-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isLoading
                ? 'Authenticating...'
                : loginTarget === 'ADMIN'
                ? 'Sign In as Administrator'
                : 'Sign In as Staff'}
            </Button>
          </form>

          {/* Footer Disclaimer */}
          <p className="px-4 text-center text-[11px] text-zinc-500">
            Authorized personnel only. Access is monitored and audited in accordance with security policies.
          </p>
        </div>
      </div>
    </div>
  );
}
