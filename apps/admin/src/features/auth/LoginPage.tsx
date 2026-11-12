import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useLoginMutation, useRegisterMutation } from './hook/useAuthMutation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AlertCircle, Command, Github } from 'lucide-react';

export function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('rahul@gmail.com');
  const [password, setPassword] = useState('rahul@123');

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthChecking = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // If already authenticated with a staff/admin role, redirect directly to dashboard
  useEffect(() => {
    if (!isAuthChecking && isAuthenticated && user && (user.role as string) !== 'USER') {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAuthChecking, user, navigate]);

  // TanStack Query mutation hooks for predictive auth lifecycle
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation(() => setIsRegisterMode(false));

  const isLoading = loginMutation.isPending || registerMutation.isPending;
  const errorMessage =
    (loginMutation.error as any)?.response?.data?.message ||
    loginMutation.error?.message ||
    (registerMutation.error as any)?.response?.data?.message ||
    registerMutation.error?.message ||
    null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterMode) {
      registerMutation.mutate({
        name: email.split('@')[0] || 'Staff Member',
        email: email.trim(),
        password,
      });
    } else {
      const isSuperAdmin = email.trim().toLowerCase() === 'superadmin@gmail.com';
      loginMutation.mutate({
        username: email.trim(),
        password,
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
      });
    }
  };

  return (
    <div className="relative min-h-screen grid lg:grid-cols-2 bg-zinc-950 text-zinc-100 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Left Column: Dark Minimalist Branding Block (Exact Shadcn Layout) */}
      <div className="relative hidden h-full flex-col bg-zinc-900/60 p-10 text-white lg:flex border-r border-zinc-800">
        <div className="flex items-center gap-2.5 text-base font-bold tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black font-black text-xs">
            <Command className="h-4 w-4" />
          </div>
          <span>BLX Orbit Admin</span>
        </div>

        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-base text-zinc-300 font-medium">
              &ldquo;Unified multi-role marketplace command console. Manage classifieds, moderation queues, escrow settlements, and platform performance from a single interface.&rdquo;
            </p>
            <footer className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              Rahul Kumar &bull; Platform Super Admin
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Column: Centered Auth Form */}
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16 relative">
        {/* Top-Right Toggle Link */}
        <div className="absolute right-6 top-6 sm:right-10 sm:top-10">
          <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            {isRegisterMode ? 'Sign In' : 'Create an account'}
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-col justify-center space-y-6">
          {/* Header Title */}
          <div className="flex flex-col space-y-1.5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isRegisterMode ? 'Create an account' : 'Sign in to Console'}
            </h1>
            <p className="text-xs text-zinc-400">
              {isRegisterMode
                ? 'Enter your email below to create your staff account'
                : 'Enter your credentials below to access the admin dashboard'}
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/15 border border-rose-500/20 p-3 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Test Account Quick Fill Selector */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Select Quick Test Account
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('rahul@gmail.com');
                  setPassword('rahul@123');
                }}
                className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                  email === 'rahul@gmail.com'
                    ? 'border-blue-500/60 bg-blue-500/10 text-blue-300'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5 text-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Admin
                </div>
                <div className="text-[10px] text-zinc-400 truncate mt-0.5">rahul@gmail.com</div>
                <div className="text-[9px] text-zinc-500">Admin features only</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('superadmin@gmail.com');
                  setPassword('rahul@123');
                }}
                className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                  email === 'superadmin@gmail.com'
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5 text-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Super Admin
                </div>
                <div className="text-[10px] text-zinc-400 truncate mt-0.5">superadmin@gmail.com</div>
                <div className="text-[9px] text-zinc-500">All 7 dashboards</div>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Email</label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
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
                required
              />
            </div>

            {/* Bright Green Accent Button matching the visual */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 font-bold bg-[#22c55e] hover:bg-[#16a34a] text-black transition mt-2 cursor-pointer shadow-sm"
            >
              {isLoading
                ? 'Authenticating...'
                : isRegisterMode
                ? 'Register with Email'
                : 'Sign In with Email'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-950 px-2 text-[10px] text-zinc-500 font-semibold tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social / Alternative Action */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit}
            className="w-full h-10 border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white gap-2 font-medium"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </Button>

          {/* Footer Disclaimer */}
          <p className="px-4 text-center text-[11px] text-zinc-500">
            By clicking continue, you agree to our{' '}
            <span className="underline underline-offset-4 hover:text-zinc-300 cursor-pointer">
              Terms of Service
            </span>{' '}
            and{' '}
            <span className="underline underline-offset-4 hover:text-zinc-300 cursor-pointer">
              Privacy Policy
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
