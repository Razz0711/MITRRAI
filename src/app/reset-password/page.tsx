// ============================================
// MitrrAi - Password Reset Page (OTP-based)
// 3-step flow: enter email → enter OTP → set new password
// ============================================

'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

function ResetPasswordInner() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (data.success) {
        setStep('otp');
        setResendTimer(30);
        setMessage('A 6-digit code has been sent to your email.');
      } else {
        setError(data.error || 'Failed to send reset code');
      }
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email: email.trim().toLowerCase(), code: otpCode.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setStep('password');
        setMessage('');
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage('Password updated successfully! Redirecting to login...');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(data.error || 'Failed to update password');
      }
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.jpg" alt="MitrrAi" width={56} height={56} className="h-14 w-auto mx-auto mb-3" priority />
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {step === 'email' ? 'Reset Password' : step === 'otp' ? 'Verify Email' : 'Set New Password'}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {step === 'email'
              ? 'Enter your SVNIT email to receive a reset code'
              : step === 'otp'
                ? <>Enter the 6-digit code sent to <strong className="text-[var(--primary-light)]">{email}</strong></>
                : 'Choose a new password for your account'}
          </p>
        </div>

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">SVNIT Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@svnit.ac.in"
                className="input-field text-sm"
                autoFocus
                required
              />
            </div>

            {message && (
              <p className="text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
            {error && (
              <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full text-sm py-2.5" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <div className="space-y-3">
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="input-field text-center text-2xl font-mono tracking-[0.5em] py-3"
              maxLength={6}
              autoFocus
            />

            {message && (
              <p className="text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
            {error && (
              <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleVerifyCode}
              disabled={otpCode.length !== 6 || loading}
              className="btn-primary w-full text-sm py-2.5 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setStep('email'); setOtpCode(''); setError(''); setMessage(''); }}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                ← Change email
              </button>
              <button
                onClick={() => handleSendCode()}
                disabled={resendTimer > 0 || loading}
                className="text-xs text-[var(--primary-light)] hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="input-field text-sm"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="input-field text-sm"
                required
              />
            </div>

            {message && (
              <p className="text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
            {error && (
              <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full text-sm py-2.5" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-[var(--muted)] mt-6">
          <button
            onClick={() => router.push('/login')}
            className="text-[var(--primary-light)] hover:underline font-medium"
          >
            Back to Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-[var(--muted)]">Loading...</div></div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
