import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Command, Github } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, loginWithTokens } = useAuth();

  const [mode, setMode] = useState<'REGISTER' | 'LOGIN'>('REGISTER');
  const [step, setStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(45);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devMockOtp, setDevMockOtp] = useState<string | null>(null);

  // Timer countdown
  useEffect(() => {
    let timer: any;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => setCountdown((c: number) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isAuthModalOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = phoneNumber.replace(/[^0-9]/g, '');
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to send OTP.');
      }

      setSessionId(data.data.sessionId);
      setCountdown(data.data.resendCooldownSeconds || 45);
      if (data.data.mockOtp) {
        setDevMockOtp(data.data.mockOtp);
      }
      setStep('OTP');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const updated = [...otp];
    updated[index] = val;
    setOtp(updated);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          phoneNumber: cleanPhone,
          target: cleanPhone,
          otp: code,
          code,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Invalid verification code.');
      }

      loginWithTokens(
        data.data.user,
        data.data.tokens.accessToken,
        data.data.tokens.refreshToken
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillMockOtp = () => {
    if (devMockOtp && devMockOtp.length === 6) {
      setOtp(devMockOtp.split(''));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl grid md:grid-cols-2">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 z-20 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Left Column: Dark Minimalist Branding (Exact Shadcn Auth Style) */}
        <div className="hidden md:flex flex-col justify-between p-8 bg-zinc-900/60 border-r border-zinc-800/80">
          <div className="flex items-center gap-2 font-bold tracking-tight text-white">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black font-black text-xs">
              <Command className="h-4 w-4" />
            </div>
            <span>OLX Marketplace</span>
          </div>

          <div className="mt-auto pt-16">
            <blockquote className="space-y-2">
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                &ldquo;India&apos;s leading platform for buying and selling cars, mobiles, electronics, and real estate with instant verified communication.&rdquo;
              </p>
              <footer className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                Trusted by 2.4 Lakh+ Active Users
              </footer>
            </blockquote>
          </div>
        </div>

        {/* Right Column: Centered Form with Green Accent Button */}
        <div className="p-8 sm:p-10 flex flex-col justify-center relative">
          {/* Top-Right Toggle */}
          <div className="absolute right-12 top-6">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'REGISTER' ? 'LOGIN' : 'REGISTER');
                setError(null);
              }}
              className="text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
            >
              {mode === 'REGISTER' ? 'Login' : 'Create an account'}
            </button>
          </div>

          <div className="w-full max-w-sm mx-auto space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {mode === 'REGISTER' ? 'Create an account' : 'Welcome back'}
              </h2>
              <p className="text-xs text-zinc-400">
                {step === 'INPUT'
                  ? mode === 'REGISTER'
                    ? 'Enter your mobile number below to create your account'
                    : 'Enter your mobile number to sign in to your account'
                  : `Enter the 6-digit verification code sent to +91 ${phoneNumber}`}
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-500/15 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                {error}
              </div>
            )}

            {step === 'OTP' && devMockOtp && (
              <div className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-400 border border-amber-500/20 flex items-center justify-between">
                <span>Mock OTP: <strong>{devMockOtp}</strong></span>
                <button
                  type="button"
                  onClick={fillMockOtp}
                  className="text-emerald-400 underline font-semibold cursor-pointer"
                >
                  Auto-fill
                </button>
              </div>
            )}

            {step === 'INPUT' ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div className="space-y-1 text-left">
                  <label className="text-xs font-medium text-zinc-300">Mobile Number</label>
                  <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 focus-within:border-emerald-500">
                    <span className="flex items-center px-3 border-r border-zinc-800 text-xs font-semibold text-zinc-400">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="98765 43210"
                      className="w-full px-3 py-2 text-sm text-white bg-transparent outline-none placeholder:text-zinc-500"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Bright Green Accent Button matching the visual */}
                <button
                  type="submit"
                  disabled={isSubmitting || phoneNumber.length !== 10}
                  className="w-full h-10 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm shadow-sm transition disabled:opacity-50 flex items-center justify-center cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : mode === 'REGISTER' ? (
                    'Sign Up with Mobile'
                  ) : (
                    'Sign In with Mobile'
                  )}
                </button>

                {/* Divider */}
                <div className="relative pt-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-zinc-950 px-2 text-[10px] text-zinc-500 font-semibold tracking-wider">
                      Or continue with
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPhoneNumber('9998887776');
                  }}
                  className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white transition flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
                >
                  <Github size={16} />
                  <span>Demo Quick Fill</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="flex justify-between gap-1.5">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="h-11 w-11 rounded-lg border border-zinc-800 bg-zinc-900 text-center text-lg font-bold text-white focus:border-emerald-500 focus:outline-none"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otp.join('').length !== 6}
                  className="w-full h-10 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm shadow-sm transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : 'Verify & Continue'}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('INPUT')}
                    className="text-zinc-400 hover:text-white transition"
                  >
                    Change Number
                  </button>
                  {countdown > 0 ? (
                    <span className="text-zinc-500">Resend in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-emerald-400 font-semibold hover:underline"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </form>
            )}

            <p className="text-center text-[10px] text-zinc-500 pt-2">
              By clicking continue, you agree to our{' '}
              <span className="underline hover:text-zinc-300 cursor-pointer">Terms of Service</span> and{' '}
              <span className="underline hover:text-zinc-300 cursor-pointer">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
