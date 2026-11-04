import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, loginWithTokens } = useAuth();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
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
      setError('Please enter a valid 10-digit Indian phone number.');
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

    // Auto-focus next input
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
    setError(null);

    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          sessionId,
          otp: code,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Verification failed.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-light text-accent">
            <ShieldCheck size={28} />
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-primary">
            {step === 'PHONE' ? 'Login or Sign Up' : 'Enter Verification Code'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {step === 'PHONE'
              ? 'Enter your phone number to continue with OLX ORBIT'
              : `We sent a 6-digit code to +91 ${phoneNumber}`}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* Developer Mock OTP Helper */}
        {step === 'OTP' && devMockOtp && (
          <div className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200 flex items-center justify-between">
            <span>Dev Mock OTP: <strong>{devMockOtp}</strong></span>
            <button
              type="button"
              onClick={fillMockOtp}
              className="text-accent underline font-semibold cursor-pointer"
            >
              Auto-fill
            </button>
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Indian Mobile Number
              </label>
              <div className="flex rounded-lg border border-gray-300 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                <span className="flex items-center px-3 bg-gray-50 border-r border-gray-200 text-sm font-semibold text-gray-600">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="98765 43210"
                  className="w-full px-3 py-2.5 text-base font-medium outline-none rounded-r-lg"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || phoneNumber.length !== 10}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-3 text-base font-bold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="animate-spin" size={20} />
              ) : (
                <>
                  Continue <ArrowRight className="ml-2" size={18} />
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              By proceeding, you agree to our Terms of Use and Privacy Policy under the Indian DPDP Act.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
            <div className="flex justify-between gap-2">
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
                  className="h-12 w-12 rounded-lg border-2 border-gray-300 text-center text-xl font-bold text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otp.join('').length !== 6}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-3 text-base font-bold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : 'Verify & Log In'}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="text-gray-500 hover:text-primary font-medium"
              >
                Change Phone Number
              </button>
              {countdown > 0 ? (
                <span className="text-gray-400">Resend OTP in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-accent font-semibold hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
