// ============================================
// MitrrAi - Login / Sign Up Page
// ============================================

'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { validateSVNITEmail, ParsedEmail } from '@/lib/email-parser';

// Crisp SVG logo — no blur, scales perfectly
function MitrrAiLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mlg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="45%" stopColor="#c026d3" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="16" fill="url(#mlg)" />
      {/* Infinity loop — two people connected */}
      <path
        d="M28,28 C26,23 22,19 17,19 C11,19 7,23 7,28 C7,33 11,37 17,37 C22,37 26,33 28,28 C30,23 34,19 39,19 C45,19 49,23 49,28 C49,33 45,37 39,37 C34,37 30,33 28,28 Z"
        stroke="white" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.95"
      />
      <circle cx="28" cy="28" r="2.5" fill="white" />
    </svg>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup, user } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [parsedEmail, setParsedEmail] = useState<ParsedEmail | null>(null);
  const [emailParseError, setEmailParseError] = useState('');

  // OTP states
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [loadingText, _setLoadingText] = useState('Verifying...');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [otpVerified, setOtpVerified] = useState(false); // tracks if OTP was already verified (prevents re-verify after login failure)

  // Resend timer countdown
  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const t = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendTimer]);

  // Auto-switch to signup mode when invited via ?ref= link
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setIsSignup(true);
    }
  }, [searchParams]);

  // Auto-parse email when typing during signup
  useEffect(() => {
    if (!isSignup) { setParsedEmail(null); setEmailParseError(''); return; }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || (!/^[^@]+@([a-z0-9-]+\.)?svnit\.ac\.in$/.test(trimmed) && trimmed !== 'demo@mitrai.study')) {
      setParsedEmail(null);
      setEmailParseError('');
      return;
    }
    const result = validateSVNITEmail(trimmed);
    if (result.valid && result.parsed) {
      setParsedEmail(result.parsed);
      setEmailParseError('');
      // Auto-fill fields
      setAdmissionNumber(result.parsed.admissionNumber);
      setDepartment(result.parsed.department);
      setYearLevel(result.parsed.yearLevel);
    } else {
      setParsedEmail(null);
      setEmailParseError(result.error || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, isSignup]);

  // Redirect if already logged in
  if (user) {
    if (isSignup) { router.push('/home');
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 transition-opacity duration-300">
        <div className="w-16 h-16 bg-[var(--surface)] rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-[var(--primary)]/10">
          <Image src="/logo.jpg" alt="MitrrAi" width={40} height={40} className="w-10 h-10 rounded-xl" />
        </div>
        <div className="flex gap-1.5 items-center justify-center tracking-widest text-[var(--primary)]">
          <span className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-white/40 text-sm mt-5 font-medium animate-pulse">
          {isSignup ? 'Setting up your profile...' : 'Taking you to campus...'}
        </p>
      </div>
    );
  }

  const DEMO_EMAIL = 'demo@mitrai.study';
  const isSvnitEmail = (e: string) => e === DEMO_EMAIL || /^[^@]+@([a-z0-9-]+\.)?svnit\.ac\.in$/.test(e);

  const sendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!isSvnitEmail(trimmedEmail)) {
      setError('Only SVNIT email addresses are allowed (e.g. name@svnit.ac.in or name@amhd.svnit.ac.in)');
      return;
    }
    setOtpSending(true);
    setOtpVerified(false); // reset verified state when resending
    setError('');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email: trimmedEmail }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.success) {
        setOtpStep(true);
        setOtpResendTimer(30);
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (err) {
      console.error('sendOtp:', err);
      if ((err as Error).name === 'AbortError') {
        setError('Request timed out — please check your internet and try again.');
      } else {
        setError('Network error — please check your internet and try again.');
      }
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtpAndProceed = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    setOtpVerifying(true);
    setError('');
    try {
      // Skip OTP API call if already verified (retry after login/signup failure)
      if (!otpVerified) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const res = await fetch('/api/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', email: trimmedEmail, code: otpCode.trim() }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Invalid code');
          setOtpVerifying(false);
          return;
        }
        // Mark OTP as verified so retries skip the verify step
        setOtpVerified(true);
      }

      // OTP verified — now do actual login/signup
      if (isSignup) {
        const result = await signup({
          name: name.trim(),
          email: trimmedEmail,
          password,
          admissionNumber: admissionNumber.trim().toUpperCase(),
          department,
          yearLevel,
          dob,
          matchKey: parsedEmail?.matchKey,
          programType: parsedEmail?.programType,
          batchYear: parsedEmail?.batchYear,
          deptCode: parsedEmail?.deptCode,
          rollNo: parsedEmail?.rollNo,
          deptKnown: parsedEmail?.deptKnown,
          profileAutoFilled: !!parsedEmail,
        });
        if (result.success) {
          router.push('/home');
        } else {
          setError(result.error || 'Something went wrong. Tap "Verify & Continue" to retry.');
        }
      } else {
        const result = await login(trimmedEmail, password);
        if (result.success) {
          router.push('/home');
        } else {
          setError(result.error || 'Invalid credentials');
        }
      }
    } catch (err) {
      console.error('verifyOtp:', err);
      if ((err as Error).name === 'AbortError') {
        setError('Request timed out — tap "Verify & Continue" to retry.');
      } else {
        setError('Network error — tap "Verify & Continue" to retry.');
      }
    } finally {
      setOtpVerifying(false);
    }
  };

  // Try admin login for non-SVNIT emails (login mode only)
  const tryAdminLogin = async (adminEmail: string, adminPassword: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin');
        return true;
      }
    } catch { /* ignore */ }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!isSvnitEmail(trimmedEmail)) {
      // If in login mode with a non-SVNIT email, try admin auth first
      if (!isSignup && trimmedEmail && password) {
        setOtpSending(true);
        const isAdmin = await tryAdminLogin(trimmedEmail, password);
        setOtpSending(false);
        if (isAdmin) return;
      }
      setError('Only SVNIT email addresses are allowed (e.g. name@svnit.ac.in or name@amhd.svnit.ac.in)');
      return;
    }

    if (isSignup) {
      if (!name.trim()) { setError('Name is required'); return; }
      if (!gender) { setError('Please select your gender'); return; }
      if (!dob) { setError('Please enter your date of birth'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    } else {
      if (!trimmedEmail || !password) { setError('Please enter email and password'); return; }
    }

    // Demo account — skip OTP entirely (both login and signup)
    if (trimmedEmail === DEMO_EMAIL) {
      setOtpSending(true);
      setError('');
      try {
        if (isSignup) {
          const result = await signup({
            name: name.trim(),
            email: trimmedEmail,
            password,
            admissionNumber: admissionNumber.trim().toUpperCase(),
            department,
            yearLevel,
            gender,
            dob,
            matchKey: parsedEmail?.matchKey,
            programType: parsedEmail?.programType,
            batchYear: parsedEmail?.batchYear,
            deptCode: parsedEmail?.deptCode,
            rollNo: parsedEmail?.rollNo,
            deptKnown: parsedEmail?.deptKnown,
            profileAutoFilled: !!parsedEmail,
          });
          if (result.success) {
            router.push('/home');
          } else {
            setError(result.error || 'Signup failed — please try again.');
          }
        } else {
          const result = await login(trimmedEmail, password);
          if (result.success) {
            router.push('/home');
          } else {
            setError(result.error || 'Invalid credentials');
          }
        }
      } catch {
        setError('Network error — please try again.');
      } finally {
        setOtpSending(false);
      }
      return;
    }

    // All validations passed → send OTP
    sendOtp();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3"><MitrrAiLogo size={56} /></div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {isSignup ? 'Join MitrrAi' : 'Welcome back'}
          </h1>
          <p className="text-sm text-[var(--muted-strong)] mt-1">
            {isSignup ? 'Register with your SVNIT college email' : 'Sign in with your SVNIT college email'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignup && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted-strong)] mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="input-field text-sm"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--muted-strong)] mb-1.5">SVNIT Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="college email"
              className="input-field text-sm"
              autoFocus={!isSignup}
            />
            {isSignup && emailParseError && (
              <p className="text-[10px] text-[var(--warning)] mt-1">{emailParseError}</p>
            )}
          </div>

          {/* Auto-filled badge when email is parsed */}
          {isSignup && parsedEmail && (
            <div className="p-3 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 space-y-1.5">
              <p className="text-[10px] font-semibold text-[var(--success)]">✓ Auto-detected from your email</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-[var(--success)]/15 text-[10px] text-[var(--success)]">{parsedEmail.programLabel}</span>
                <span className="px-2 py-0.5 rounded bg-[var(--success)]/15 text-[10px] text-[var(--success)]">{parsedEmail.department}</span>
                <span className="px-2 py-0.5 rounded bg-[var(--success)]/15 text-[10px] text-[var(--success)]">{parsedEmail.yearLevel}</span>
                <span className="px-2 py-0.5 rounded bg-[var(--success)]/15 text-[10px] text-[var(--success)]">Batch &apos;{parsedEmail.batchYear}</span>
                <span className="px-2 py-0.5 rounded bg-[var(--success)]/15 text-[10px] text-[var(--success)]">{parsedEmail.admissionNumber}</span>
              </div>
            </div>
          )}

          {/* Gender picker */}
          {isSignup && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted-strong)] mb-1.5">Gender</label>
              <div className="flex gap-3">
                {(['Male', 'Female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                    style={{
                      background: gender === g ? 'var(--primary)' : 'transparent',
                      borderColor: gender === g ? 'var(--primary)' : 'rgba(255,255,255,0.12)',
                      color: gender === g ? '#fff' : 'var(--muted-strong)',
                    }}
                  >
                    {g === 'Male' ? '♂ Male' : '♀ Female'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSignup && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted-strong)] mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="input-field text-sm"
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-[11px] text-[var(--muted-strong)] mt-0.5">Only day & month shown publicly for birthday celebrations</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[var(--muted-strong)]">Password</label>
              {!isSignup && (
                <button
                  type="button"
                  onClick={() => router.push('/reset-password')}
                  className="text-[11px] font-semibold text-[var(--primary-light)] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? 'Min 6 characters' : 'Your password'}
              className="input-field text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full text-sm py-2.5" disabled={otpSending}>
            {otpSending ? 'Sending verification code...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* OTP Verification Modal */}
        {otpStep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="card p-6 w-full max-w-sm slide-up">
              <div className="text-center mb-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center text-2xl">
                  ✉️
                </div>
                <h2 className="text-lg font-bold">Verify Your Email</h2>
                <p className="text-xs text-[var(--muted-strong)] mt-1">
                  Enter the 6-digit code sent to <strong className="text-[var(--primary-light)]">{email}</strong>
                </p>
              </div>

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

                {error && (
                  <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  onClick={verifyOtpAndProceed}
                  disabled={otpCode.length !== 6 || otpVerifying}
                  className="btn-primary w-full text-sm py-2.5 disabled:opacity-50"
                >
                  {otpVerifying ? loadingText : otpVerified ? 'Retry Login' : 'Verify & Continue'}
                </button>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setOtpStep(false); setOtpCode(''); setOtpVerified(false); setError(''); }}
                    className="text-xs text-[var(--muted-strong)] hover:text-[var(--foreground)] transition-colors"
                  >
                    ← Go back
                  </button>
                  <button
                    onClick={sendOtp}
                    disabled={otpResendTimer > 0 || otpSending}
                    className="text-xs text-[var(--primary-light)] hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {otpResendTimer > 0 ? `Resend in ${otpResendTimer}s` : 'Resend code'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle */}
        <p className="text-center text-xs text-[var(--muted-strong)] mt-6">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            className="text-[var(--primary-light)] hover:underline font-medium"
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>

        {/* Help — WhatsApp contact */}
        <div className="mt-8 pt-5 border-t border-[var(--border)] text-center">
          <p className="text-[11px] text-[var(--muted-strong)] mb-2">Having trouble signing in?</p>
          <a
            href="https://wa.me/917061001946?text=Hi%2C%20I%20need%20help%20logging%20into%20MitrrAi.%20My%20email%3A%20"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Chat with Admin on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-[var(--muted)]">Loading...</div></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
