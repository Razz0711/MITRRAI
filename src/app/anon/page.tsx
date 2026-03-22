// ============================================
// MitrRAI - Anonymous Chat Lobby
// Room type selection, queue, coupon gate, UPI payments
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ROOM_TYPES, ANON_PRICING, UPI_CONFIG } from '@/lib/anon-aliases';
import { useNotificationSound } from '@/hooks/useNotificationSound';


type Status = 'loading' | 'no-pass' | 'pending-payment' | 'banned' | 'idle' | 'queuing' | 'matched';

export default function AnonLobbyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { play: playSound } = useNotificationSound();

  const [status, setStatus] = useState<Status>('loading');
  const [banInfo, setBanInfo] = useState<{ reason?: string; expiresAt?: string }>({});
  const [passInfo, setPassInfo] = useState<{ plan?: string; expiresAt?: string; isPro?: boolean }>({});
  const [selectedType, setSelectedType] = useState<string>('career');
  const [alias, setAlias] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [queueSeconds, setQueueSeconds] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Free trial state
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [trialGranted, setTrialGranted] = useState(false);
  const [usedTrial, setUsedTrial] = useState(false);
  const [isOpenAccess, setIsOpenAccess] = useState(false);
  const [openAccessEndsAt, setOpenAccessEndsAt] = useState('');

  // Live stats
  const [stats, setStats] = useState<{ queueCount: number; activeRooms: number; queueByType: Record<string, number> } | null>(null);
  const statsRef = useRef<NodeJS.Timeout | null>(null);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof ANON_PRICING[number] | null>(null);
  const [txnId, setTxnId] = useState('');
  const [txnError, setTxnError] = useState('');
  const [txnLoading, setTxnLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{ plan: string; createdAt: string; status: string } | null>(null);

  // Check status on mount
  useEffect(() => {
    if (!user) return;
    checkStatus();
    fetchStats();
    // Poll stats every 10 seconds
    statsRef.current = setInterval(fetchStats, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (statsRef.current) clearInterval(statsRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/anon?check=stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch { /* ignore */ }
  };

  const checkStatus = async () => {
    try {
      const [statusRes, payRes] = await Promise.all([
        fetch('/api/anon?check=status'),
        fetch('/api/anon/pay'),
      ]);
      const statusData = await statusRes.json();
      const payData = await payRes.json();

      // Check pending payment
      if (payData.success && payData.data.payment) {
        const payment = payData.data.payment;
        if (payment.status === 'pending') {
          setPendingPayment({ plan: payment.plan, createdAt: payment.createdAt, status: payment.status });
        }
        if (payment.status === 'rejected') {
          setPendingPayment({ plan: payment.plan, createdAt: payment.createdAt, status: 'rejected' });
        }
      }

      if (!statusData.success) { setStatus('idle'); return; }

      const d = statusData.data;

      // Track trial state
      if (d.trialGranted) setTrialGranted(true);
      if (d.isFreeTrial) setIsFreeTrial(true);
      if (d.usedTrial) setUsedTrial(true);
      if (d.isOpenAccess) setIsOpenAccess(true);
      if (d.openAccessEndsAt) setOpenAccessEndsAt(d.openAccessEndsAt);

      if (d.banned) {
        setStatus('banned');
        setBanInfo({ reason: d.banReason, expiresAt: d.banExpiresAt });
        return;
      }
      if (d.activeRoomId) {
        router.push(`/anon/${d.activeRoomId}`);
        return;
      }
      if (!d.hasPass) {
        // Check if they have a pending payment
        if (payData.success && payData.data.payment?.status === 'pending') {
          setStatus('pending-payment');
        } else {
          setStatus('no-pass');
        }
        if (d.pass) setPassInfo({ plan: d.pass.plan, expiresAt: d.pass.expiresAt, isPro: d.isPro });
        return;
      }
      setPassInfo({ plan: d.pass?.plan, expiresAt: d.pass?.expiresAt, isPro: d.isPro });
      setStatus('idle');
    } catch {
      setStatus('idle');
    }
  };

  const handleJoinQueue = async () => {
    setStatus('queuing');
    setQueueSeconds(0);
    try {
      const res = await fetch('/api/anon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomType: selectedType }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.error === 'NO_PASS') { setStatus('no-pass'); return; }
        if (data.error === 'BANNED') { setStatus('banned'); setBanInfo({ reason: data.reason, expiresAt: data.expiresAt }); return; }
        setStatus('idle');
        return;
      }
      setAlias(data.data.alias);
      startPolling();
    } catch {
      setStatus('idle');
    }
  };

  const startPolling = useCallback(() => {
    timerRef.current = setInterval(() => setQueueSeconds(s => s + 1), 1000);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/anon?check=poll');
        const data = await res.json();
        if (data.success && data.data.matched) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          // 🔊 Play match found sound
          playSound('match');
          setStatus('matched');
          setTimeout(() => router.push(`/anon/${data.data.roomId}`), 800);
        }
      } catch { /* keep polling */ }
    }, 3000);
  }, [playSound, router]);

  const handleLeaveQueue = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    await fetch('/api/anon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave' }),
    });
    setStatus('idle');
    setAlias('');
    setQueueSeconds(0);
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch('/api/anon/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setCouponError(data.error || 'Failed to redeem');
      } else {
        setCouponCode('');
        setCouponError('');
        setStatus('idle');
        setPassInfo({ plan: data.data.pass.plan, expiresAt: data.data.pass.expiresAt });
      }
    } catch {
      setCouponError('Network error');
    } finally {
      setCouponLoading(false);
    }
  };

  // ── Payment flow ──
  const handleSubscribeClick = (plan: typeof ANON_PRICING[number]) => {
    setSelectedPlan(plan);
    setTxnId('');
    setTxnError('');
    setPaySuccess(false);
    setShowPayModal(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedPlan || !txnId.trim()) return;
    if (txnId.trim().length < 4) {
      setTxnError('Transaction ID must be at least 4 characters');
      return;
    }
    setTxnLoading(true);
    setTxnError('');
    try {
      const res = await fetch('/api/anon/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan.plan, transactionId: txnId.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setTxnError(data.error || 'Failed to submit payment');
      } else {
        setPaySuccess(true);
        setPendingPayment({ plan: selectedPlan.plan, createdAt: new Date().toISOString(), status: 'pending' });
      }
    } catch {
      setTxnError('Network error');
    } finally {
      setTxnLoading(false);
    }
  };

  const generateUpiLink = (amount: number) => {
    const params = new URLSearchParams({
      pa: UPI_CONFIG.upiId,
      pn: UPI_CONFIG.merchantName,
      am: String(amount),
      cu: 'INR',
      tn: UPI_CONFIG.note,
    });
    return `upi://pay?${params.toString()}`;
  };

  const getQrImageUrl = (amount: number) => {
    const upiUrl = generateUpiLink(amount);
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiUrl)}&bgcolor=1a1a2e&color=ffffff&format=png`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--muted)] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">Please log in to access Anonymous Chat</p>
      </div>
    );
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const queueEstimate = stats ? Math.max(1, Math.ceil((stats.queueCount + 1) / 2)) : null;

  return (
    <div className="min-h-screen anon-polish relative">
      <div className="anon-aura anon-aura-1" />
      <div className="anon-aura anon-aura-2" />
      <div className="flex-1 overflow-y-auto px-4">
        <div className="max-w-2xl mx-auto">
        {/* Ambient glow */}
        <div className="ambient-glow" />

        {/* Header — Premium */}
        <div className="text-center mb-6 slide-up">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] font-bold mb-1">Safe anonymous space</p>
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-violet-500/20 via-pink-500/20 to-purple-500/20 flex items-center justify-center" style={{ animation: 'float 3s ease-in-out infinite' }}>
            <span className="text-lg font-bold gradient-text">Anon</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] mb-2">
            <span className="gradient-text">Anonymous Chat</span>
          </h1>
          <p className="text-[var(--muted)] text-sm max-w-xs mx-auto">
            Talk freely with fellow SVNITians. No names, no judgments.
          </p>
        </div>

        {/* Live Stats Bar — Glass */}
        {stats && (
          <div className="flex items-center justify-center gap-3 mb-6 slide-up-stagger-1 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(8px)' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-semibold text-green-400">
                {stats.activeRooms * 2} chatting
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(8px)' }}>
              <span className="text-xs font-semibold text-amber-400">
                {stats.queueCount} waiting
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(8px)' }}>
              <span className="text-xs font-semibold text-violet-300">
                {Object.keys(stats.queueByType || {}).length} room types active
              </span>
            </div>
          </div>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--muted)] text-sm">Checking access and pass status...</p>
          </div>
        )}

        {/* Banned */}
        {status === 'banned' && (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/15 flex items-center justify-center text-sm font-bold text-[var(--error)] mb-4">Banned</div>
            <h2 className="text-xl font-bold text-[var(--error)] mb-2">You&apos;re Temporarily Banned</h2>
            <p className="text-[var(--muted)] text-sm mb-2">{banInfo.reason || 'Multiple reports received'}</p>
            {banInfo.expiresAt && (
              <p className="text-sm text-[var(--muted)]">
                Expires: {new Date(banInfo.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </p>
            )}
            {!banInfo.expiresAt && <p className="text-sm text-[var(--error)]">This ban is permanent.</p>}
          </div>
        )}

        {/* No Pass — Pricing + Subscribe + Coupon */}
        {(status === 'no-pass' || status === 'pending-payment') && (
          <div className="space-y-6">
            {/* Pending payment notice */}
            {(status === 'pending-payment' || pendingPayment?.status === 'pending') && (
              <div className="card p-4 border-2 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-amber-400">Pending</span>
                  <div>
                    <h3 className="text-sm font-semibold text-amber-400">Payment Under Review</h3>
                    <p className="text-xs text-[var(--muted)]">
                      Your {pendingPayment?.plan || ''} plan payment is being verified. This usually takes a few hours.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected payment notice */}
            {pendingPayment?.status === 'rejected' && (
              <div className="card p-4 border-2 border-red-500/30 bg-red-500/5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[var(--error)]">Rejected</span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--error)]">Payment Rejected</h3>
                    <p className="text-xs text-[var(--muted)]">
                      Your previous payment could not be verified. Please try again or use a coupon code.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Teaser */}
            <div className="card p-8 text-center border-2 border-dashed border-[var(--primary)]/30">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--primary)]/15 flex items-center justify-center text-sm font-bold text-[var(--foreground)] mb-4">
                {usedTrial ? 'Expired' : 'Locked'}
              </div>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                {usedTrial ? 'Your Free Trial Has Ended' : 'Unlock Anonymous Chat'}
              </h2>
              <p className="text-[var(--muted)] text-sm mb-6">
                {usedTrial
                  ? 'Your 7-day free trial is over. Subscribe to keep chatting anonymously with fellow SVNITians!'
                  : 'Chat anonymously with fellow SVNITians. Vent, confess, get advice — all without revealing your identity.'}
              </p>

              {/* Pricing tiers with Subscribe buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {ANON_PRICING.map(tier => (
                  <div key={tier.plan} className={`p-4 rounded-xl border-2 transition-all flex flex-col ${
                    tier.plan === 'monthly' 
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5 sm:scale-105' 
                      : 'border-[var(--border)]'
                  }`}>
                    {tier.plan === 'monthly' && (
                      <div className="text-[10px] font-bold text-[var(--primary)] mb-1">POPULAR</div>
                    )}
                    <div className="text-sm font-semibold text-[var(--foreground)]">{tier.label}</div>
                    <div className="text-2xl font-bold text-[var(--primary)] mt-1">₹{tier.price}</div>
                    <div className="text-[10px] text-[var(--muted)] mb-3">{tier.durationDays} days</div>
                    <button
                      onClick={() => handleSubscribeClick(tier)}
                      className={`mt-auto w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                        tier.plan === 'monthly'
                          ? 'bg-[var(--primary)] text-white hover:opacity-90'
                          : 'bg-[var(--surface-light)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white'
                      }`}
                    >
                      Subscribe ₹{tier.price}
                    </button>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-2 text-left text-xs text-[var(--muted)] mb-6">
                <div className="flex items-center gap-2">• Random matching</div>
                <div className="flex items-center gap-2">• 5 room types</div>
                <div className="flex items-center gap-2">• Fun aliases</div>
                <div className="flex items-center gap-2">• Mutual reveal option</div>
                <div className="flex items-center gap-2">• Report & block</div>
                <div className="flex items-center gap-2">• SVNIT-only safe space</div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--muted)]">or use a coupon</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* Coupon input */}
              <div className="flex gap-2 max-w-sm mx-auto">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted)]"
                  maxLength={30}
                />
                <button
                  onClick={handleRedeemCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
                >
                  {couponLoading ? '...' : 'Redeem'}
                </button>
              </div>
              {couponError && <p className="text-[var(--error)] text-xs mt-2">{couponError}</p>}
              <p className="text-[10px] text-[var(--muted)] mt-3">
                Get coupon codes from campus events, club activities, or friends!
              </p>
            </div>
          </div>
        )}

        {/* UPI Payment Modal */}
        {showPayModal && selectedPlan && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !txnLoading && setShowPayModal(false)}>
            <div className="card p-6 max-w-md w-full space-y-5" onClick={e => e.stopPropagation()}>
              {!paySuccess ? (
                <>
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--primary)]/15 flex items-center justify-center text-sm font-bold text-[var(--foreground)] mb-2">Pay</div>
                    <h3 className="text-lg font-bold text-[var(--foreground)]">
                      Pay ₹{selectedPlan.price} for {selectedPlan.label} Plan
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {selectedPlan.durationDays} days of Anonymous Chat access
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-white rounded-2xl shadow-lg">
                      <Image
                        src={getQrImageUrl(selectedPlan.price)}
                        alt="UPI QR Code"
                        width={200}
                        height={200}
                        className="rounded-xl"
                        unoptimized
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <p className="text-xs text-[var(--muted)] mb-1">Scan with any UPI app to pay</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">UPI</span>
                      <span className="text-[10px] text-[var(--muted)]">GPay • PhonePe • Paytm • BHIM • Any UPI app</span>
                    </div>
                    <div className="mt-2 px-3 py-1.5 rounded-lg bg-[var(--surface-light)] border border-[var(--border)] inline-flex items-center gap-2">
                      <div>
                        <p className="text-[10px] text-[var(--muted)]">UPI ID</p>
                        <p className="text-xs font-mono font-semibold text-[var(--foreground)]">{UPI_CONFIG.upiId}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(UPI_CONFIG.upiId)}
                        className="text-xs text-[var(--primary)] hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                    <a
                      href={generateUpiLink(selectedPlan.price)}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                      Open UPI App Directly
                    </a>
                    <p className="text-[10px] text-[var(--muted)] mt-1 md:block hidden">
                      On desktop: scan the QR code above with any UPI app on your phone, or open your bank&apos;s UPI interface and pay to the UPI ID shown.
                    </p>
                  </div>

                  {/* Transaction ID input */}
                  <div className="mb-3">
                    <label className="text-xs text-[var(--foreground)] block mb-1 font-medium">
                      Transaction / UTR ID <span className="text-[var(--error)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={txnId}
                      onChange={e => { setTxnId(e.target.value); setTxnError(''); }}
                      placeholder="Enter your UPI transaction ID after payment"
                      className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted)]"
                      maxLength={50}
                    />
                    {txnError && <p className="text-[var(--error)] text-xs mt-1">{txnError}</p>}
                    <p className="text-[10px] text-[var(--muted)] mt-1">Find the 12-digit UTR/Reference number in your UPI app payment history</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPayModal(false)}
                      className="flex-1 py-2.5 rounded-lg text-sm text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors"
                      disabled={txnLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitPayment}
                      disabled={txnLoading || txnId.trim().length < 4}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {txnLoading ? 'Submitting...' : 'Submit Payment'}
                    </button>
                  </div>
                </>
              ) : (
                /* Success state */
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/15 flex items-center justify-center text-sm font-bold text-green-400 mb-4">Done</div>
                  <h3 className="text-lg font-bold text-[var(--success)]">Payment Submitted!</h3>
                  <p className="text-sm text-[var(--muted)] mt-2 mb-4">
                    Your payment is being verified. You&apos;ll get access once the admin approves it (usually within a few hours).
                  </p>
                  <button
                    onClick={() => { setShowPayModal(false); setStatus('pending-payment'); }}
                    className="btn-primary text-sm px-6 py-2"
                  >
                    Got it
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Idle — Vibe Card Selection */}
        {status === 'idle' && (
          <div className="space-y-6">
            {/* Open Access Banner */}
            {isOpenAccess && openAccessEndsAt && (
              <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.06))', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">
                    <strong className="text-green-400">Free for everyone</strong>
                    <span className="text-[var(--muted)]"> — Open for all SVNIT students</span>
                  </span>
                </div>
                <span className="text-xs font-semibold text-green-400">
                  Till {new Date(openAccessEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}

            {isFreeTrial && passInfo.expiresAt && !isOpenAccess && (
              <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(20,184,166,0.06))', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm">
                    <strong className="text-emerald-400">{trialGranted ? 'Free Trial Activated!' : 'Free Trial Active'}</strong>
                    <span className="text-[var(--muted)]"> — {Math.max(0, Math.ceil((new Date(passInfo.expiresAt).getTime() - Date.now()) / 86400000))} days left</span>
                  </span>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  Expires: {new Date(passInfo.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </span>
              </div>
            )}

            {passInfo.plan && !isFreeTrial && !isOpenAccess && (
              <div className="card p-3 flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">
                  {passInfo.isPro ? 'Pro Subscriber — Anonymous Chat included free!' : `${passInfo.plan.charAt(0).toUpperCase() + passInfo.plan.slice(1)} Pass Active`}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {passInfo.isPro ? 'Unlimited Access' : `Expires: ${passInfo.expiresAt ? new Date(passInfo.expiresAt).toLocaleDateString('en-IN') : '—'}`}
                </span>
              </div>
            )}

            {/* CHOOSE YOUR VIBE heading */}
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-[var(--primary)] to-[var(--accent)]" />
                CHOOSE YOUR VIBE
              </h2>
              <span className="text-[10px] text-[var(--muted)]">Tap to select · then find match</span>
            </div>

            {/* Vibe Tiles — Horizontal compact layout */}
            <div className="flex flex-col gap-2">

              {/* Placement Talk */}
              <button
                onClick={() => setSelectedType('career')}
                className="relative flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: selectedType === 'career' ? 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(234,88,12,0.06))' : 'var(--surface-card, #141414)',
                  border: selectedType === 'career' ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-base shrink-0">📋</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-bold text-white">Placement Talk</h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">🔥 Hot</span>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] truncate">Offers, anxiety, intern struggles — all of it.</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">Instant</span>
                  <span className="text-[9px] text-[var(--muted)]">{stats?.queueByType?.career || 5} active</span>
                </div>
                {selectedType === 'career' && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"><span className="text-white text-[10px]">✓</span></div>}
              </button>

              {/* College Gossip */}
              <button
                onClick={() => setSelectedType('confession')}
                className="relative flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: selectedType === 'confession' ? 'linear-gradient(135deg, rgba(236,72,153,0.10), rgba(239,68,68,0.06))' : 'var(--surface-card, #141414)',
                  border: selectedType === 'confession' ? '1px solid rgba(236,72,153,0.4)' : '1px solid var(--border)',
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center text-base shrink-0">📢</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-bold text-white">College Gossip</h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400">Trending</span>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] truncate">What&apos;s happening on campus? Spill it.</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">Instant</span>
                  <span className="text-[9px] text-[var(--muted)]">{stats?.queueByType?.confession || 8} active</span>
                </div>
                {selectedType === 'confession' && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"><span className="text-white text-[10px]">✓</span></div>}
              </button>

              {/* Dil Ki Baat */}
              <button
                onClick={() => setSelectedType('crush')}
                className="relative flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: selectedType === 'crush' ? 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(236,72,153,0.06))' : 'var(--surface-card, #141414)',
                  border: selectedType === 'crush' ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border)',
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-base shrink-0">💗</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-bold text-white">Dil Ki Baat</h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{stats?.queueByType?.crush || 2} waiting</span>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] truncate">Crush, feelings, advice — anonymous love corner.</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--surface-light)] text-[var(--muted)]">~1 min</span>
                </div>
                {selectedType === 'crush' && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"><span className="text-white text-[10px]">✓</span></div>}
              </button>

              {/* No Filter */}
              <button
                onClick={() => setSelectedType('radar')}
                className="relative flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: selectedType === 'radar' ? 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(59,130,246,0.06))' : 'var(--surface-card, #141414)',
                  border: selectedType === 'radar' ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border)',
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-base shrink-0">🎭</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-bold text-white">No Filter</h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">{stats?.queueByType?.radar || 3} in</span>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] truncate">Say what you actually think. No judgement.</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--surface-light)] text-[var(--muted)]">~2 min</span>
                </div>
                {selectedType === 'radar' && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"><span className="text-white text-[10px]">✓</span></div>}
              </button>

              {/* 3 AM Thoughts */}
              <button
                onClick={() => setSelectedType('night_owl')}
                className="relative flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: selectedType === 'night_owl' ? 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(99,102,241,0.06))' : 'var(--surface-card, #141414)',
                  border: selectedType === 'night_owl' ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border)',
                  opacity: new Date().getHours() >= 23 || new Date().getHours() < 4 ? 1 : 0.6,
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-base shrink-0">🌙</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-bold text-white">3 AM Thoughts</h3>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--surface-light)] text-[var(--muted)]">
                      {new Date().getHours() >= 23 || new Date().getHours() < 4 ? '● Live' : 'Opens 11PM'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] truncate">Can&apos;t sleep? Neither can they. Late night only.</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--surface-light)] text-[var(--muted)] font-semibold">11PM-4AM</span>
                </div>
                {selectedType === 'night_owl' && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"><span className="text-white text-[10px]">✓</span></div>}
              </button>
            </div>

            {/* Find a Random Match CTA */}
            <button
              onClick={handleJoinQueue}
              className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9, #a855f7)',
                backgroundSize: '200% 200%',
                animation: 'gradientShift 3s ease infinite',
                boxShadow: '0 4px 30px rgba(124, 58, 237, 0.5)',
              }}
            >
              Find a Random Match
            </button>

            {/* Footer info */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[var(--muted)]">
                Estimated wait: ~{queueEstimate || 1} min · Matching with a fellow SVNITian
              </p>
              <p className="text-[10px] text-[var(--muted)]">
                Be respectful · SVNIT email on file
              </p>
            </div>

            {/* Upgrade Plans — shown during free trial */}
            {isFreeTrial && !isOpenAccess && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-[var(--muted)] font-medium">Upgrade for unlimited access</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ANON_PRICING.map(tier => (
                    <div key={tier.plan} className={`p-4 rounded-xl border-2 transition-all flex flex-col ${
                      tier.plan === 'monthly' ? 'border-[var(--primary)] bg-[var(--primary)]/5 sm:scale-105' : 'border-[var(--border)]'
                    }`}>
                      {tier.plan === 'monthly' && <div className="text-[10px] font-bold text-[var(--primary)] mb-1">BEST VALUE</div>}
                      <div className="text-sm font-semibold text-[var(--foreground)]">{tier.label}</div>
                      <div className="text-2xl font-bold text-[var(--primary)] mt-1">₹{tier.price}</div>
                      <div className="text-[10px] text-[var(--muted)] mb-3">{tier.durationDays} days</div>
                      <button onClick={() => handleSubscribeClick(tier)} className={`mt-auto w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                        tier.plan === 'monthly' ? 'bg-[var(--primary)] text-white hover:opacity-90' : 'bg-[var(--surface-light)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white'
                      }`}>Upgrade ₹{tier.price}</button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-[var(--muted)]">or use a coupon</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <div className="flex gap-2 max-w-sm mx-auto">
                  <input type="text" value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }} placeholder="Enter coupon code" className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted)]" maxLength={30} />
                  <button onClick={handleRedeemCoupon} disabled={couponLoading || !couponCode.trim()} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">{couponLoading ? '...' : 'Redeem'}</button>
                </div>
                {couponError && <p className="text-[var(--error)] text-xs text-center">{couponError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Queuing — Premium animation */}
        {status === 'queuing' && (
          <div className="card p-10 text-center scale-in" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)' }}>
            <div className="relative w-24 h-24 mx-auto mb-8">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full" style={{ border: '3px solid rgba(124,58,237,0.15)' }} />
              {/* Spinning gradient ring */}
              <div className="absolute inset-0 rounded-full animate-spin" style={{
                border: '3px solid transparent',
                borderTopColor: 'var(--primary)',
                borderRightColor: 'var(--accent)',
                animationDuration: '1.5s',
              }} />
              {/* Pulse glow */}
              <div className="absolute inset-2 rounded-full" style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.15), transparent)',
                animation: 'pulseGlow 2s ease-in-out infinite',
              }} />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--primary-light)]">Searching</span>
            </div>
            <h2 className="text-xl font-extrabold text-[var(--foreground)] mb-2">Finding your match...</h2>
            <p className="text-[var(--muted)] text-sm mb-1">
              You are <span className="font-mono font-bold gradient-text">{alias}</span>
            </p>
            <p className="text-[var(--muted)] text-xs mb-6">
              {ROOM_TYPES.find(r => r.id === selectedType)?.emoji} {ROOM_TYPES.find(r => r.id === selectedType)?.label}
            </p>
            {queueEstimate !== null && (
              <p className="text-[11px] text-[var(--muted)] mb-2">Typical wait now: ~{queueEstimate} min</p>
            )}
            <div className="text-4xl font-mono font-bold text-[var(--foreground)] mb-8 tracking-wider">{formatTime(queueSeconds)}</div>
            <button
              onClick={handleLeaveQueue}
              className="text-sm text-[var(--muted)] hover:text-[var(--error)] transition-all duration-200 px-6 py-2 rounded-xl hover:bg-[var(--error)]/10"
            >
              Cancel & Leave Queue
            </button>
          </div>
        )}

        {/* Matched — Celebration */}
        {status === 'matched' && (
          <div className="card p-10 text-center scale-in" style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(34,197,94,0.08))',
            border: '2px solid rgba(34,197,94,0.3)',
            boxShadow: '0 0 40px rgba(34,197,94,0.15)',
          }}>
            <div className="text-2xl font-extrabold text-[var(--success)] mb-4" style={{ animation: 'float 1s ease-in-out infinite' }}>Match Found!</div>
            <h2 className="text-2xl font-extrabold mb-2">
              <span className="gradient-text">Match Found!</span>
            </h2>
            <p className="text-[var(--muted)] text-sm">Entering your chat room...</p>
            <div className="mt-4 w-16 h-1 mx-auto rounded-full overflow-hidden bg-[var(--surface-light)]">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--success)]" style={{ animation: 'shimmer 0.8s ease-in-out' }} />
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .anon-polish {
          z-index: 1;
        }

        .anon-aura {
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(58px);
          opacity: 0.13;
          z-index: 0;
        }

        .anon-aura-1 {
          width: 280px;
          height: 210px;
          top: 120px;
          right: -100px;
          background: rgba(168, 85, 247, 0.35);
        }

        .anon-aura-2 {
          width: 230px;
          height: 180px;
          top: 360px;
          left: -90px;
          background: rgba(236, 72, 153, 0.24);
        }

        @media (max-width: 640px) {
          .anon-aura {
            opacity: 0.08;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .anon-aura {
            display: none;
          }
        }
      `}</style>
      </div>
    </div>
  );
}

function _SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[var(--muted)] px-1 mb-2">
      {children}
    </div>
  );
}
