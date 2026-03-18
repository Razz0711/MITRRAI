// ============================================
// MitrRAI - Admin Dashboard Page
// Protected by ADMIN_KEY — shows stats, pending subscriptions, reports
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AdminStats {
  totalUsers: number;
  totalMaterials: number;
  pendingSubscriptions: number;
  pendingReports: number;
}

interface PendingSub {
  user_id: string;
  plan: string;
  transaction_id: string;
  status: string;
  created_at: string;
}

interface PendingReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  department: string;
  year_level: string;
  created_at: string;
  last_active_at?: string;
  aryaMessageCount?: number;
  aryaVoiceCount?: number;
  anonMessageCount?: number;
  reportCount?: number;
}

interface FeedbackItem {
  id: string;
  name: string;
  email: string;
  type: string;
  rating: number;
  message: string;
  created_at: string;
}

interface AnonStatsData {
  totalPasses: number;
  activePasses: number;
  totalReports: number;
  pendingReports: number;
  totalBans: number;
}

interface CouponItem {
  code: string;
  plan: string;
  maxUses: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface PendingPaymentItem {
  id: string;
  userId: string;
  plan: string;
  amount: number;
  transactionId: string;
  upiRef: string;
  status: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [pendingSubs, setPendingSubs] = useState<PendingSub[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [anonStats, setAnonStats] = useState<AnonStatsData | null>(null);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentItem[]>([]);
  const [couponPlan, setCouponPlan] = useState('monthly');
  const [couponCount, setCouponCount] = useState(5);
  const [couponMaxUses, setCouponMaxUses] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [actionMsg, setActionMsg] = useState('');

  // Full users states
  const [allUsers, setAllUsers] = useState<RecentUser[] | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userQuery, setUserQuery] = useState('');

  // Check cookie-based admin auth on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/auth');
        const data = await res.json();
        if (data.authenticated) {
          setAuthenticated(true);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Load dashboard when authenticated (either via cookie or manual key)
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = adminKey
        ? `/api/admin?adminKey=${encodeURIComponent(adminKey)}`
        : '/api/admin';
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to load admin data');
        if (!adminKey) setAuthenticated(false);
        return;
      }
      setAuthenticated(true);
      setStats(data.data.stats);
      setRecentUsers(data.data.recentUsers || []);
      setPendingSubs(data.data.pendingSubscriptions || []);
      setPendingReports(data.data.pendingReports || []);
      setRecentFeedback(data.data.recentFeedback || []);
      setAnonStats(data.data.anonStats || null);
      setCoupons(data.data.coupons || []);
      setPendingPayments(data.data.pendingPayments || []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    if (authenticated) loadDashboard();
  }, [authenticated, loadDashboard]);

  const handleAdminAction = async (action: string, targetId: string, extra?: Record<string, string>) => {
    setActionMsg('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey, action, targetId, ...extra }),
      });
      const data = await res.json();
      setActionMsg(data.message || data.error || 'Done');
      loadDashboard();
    } catch {
      setActionMsg('Action failed');
    }
  };

  const handleGenerateCoupons = async () => {
    setGeneratedCodes([]);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey, action: 'generate-coupons', plan: couponPlan, count: couponCount, maxUses: couponMaxUses }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedCodes(data.data.codes);
        setActionMsg(`Generated ${data.data.codes.length} coupons!`);
        loadDashboard();
      } else {
        setActionMsg(data.error || 'Failed to generate');
      }
    } catch {
      setActionMsg('Generation failed');
    }
  };

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const url = adminKey ? `/api/admin/users?adminKey=${encodeURIComponent(adminKey)}` : '/api/admin/users';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAllUsers(data.data);
      }
    } catch (e) {
      setActionMsg('Failed to load full database');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthenticated(false);
    setAdminKey('');
    router.push('/admin/login');
  };

  if (loading && !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--muted)]">Checking admin session...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-[var(--foreground)]">Admin Dashboard</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Please sign in to access</p>
          </div>
          <a href="/admin/login" className="btn-primary inline-block text-sm py-2.5 px-6">
            Sign In
          </a>
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--muted)] mb-2">Or use admin key:</p>
            <form onSubmit={(e) => { e.preventDefault(); loadDashboard(); }} className="space-y-3">
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin Key"
                className="input-field text-sm"
              />
              {error && <p className="text-xs text-[var(--error)]">{error}</p>}
              <button type="submit" className="btn-secondary w-full text-xs py-2" disabled={loading}>
                {loading ? 'Verifying...' : 'Access with Key'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Admin Dashboard</h1>
        <button onClick={handleLogout} className="text-xs text-[var(--muted)] hover:text-[var(--error)]">
          🚪 Logout
        </button>
      </div>

      {actionMsg && (
        <div className="text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg px-3 py-2">
          {actionMsg}
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
            { label: 'Materials', value: stats.totalMaterials, icon: '📚' },
            { label: 'Pending Subs', value: stats.pendingSubscriptions, icon: '💳' },
            { label: 'Pending Reports', value: stats.pendingReports, icon: '🚩' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <span>{s.icon}</span>
                <span className="text-xs text-[var(--muted)]">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending Subscriptions */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Pending Subscriptions ({pendingSubs.length})</h2>
        {pendingSubs.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No pending subscriptions</p>
        ) : (
          <div className="space-y-2">
            {pendingSubs.map(sub => (
              <div key={sub.user_id} className="card p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--foreground)]">{sub.user_id}</p>
                  <p className="text-[10px] text-[var(--muted)]">Plan: {sub.plan} | TxnID: {sub.transaction_id}</p>
                  <p className="text-[10px] text-[var(--muted)]">{new Date(sub.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAdminAction('approve-subscription', sub.user_id)} className="text-xs px-3 py-1 rounded bg-[var(--success)]/20 text-[var(--success)] hover:bg-[var(--success)]/30">
                    Approve
                  </button>
                  <button onClick={() => handleAdminAction('reject-subscription', sub.user_id)} className="text-xs px-3 py-1 rounded bg-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error)]/30">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Reports */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">User Reports ({pendingReports.length})</h2>
        {pendingReports.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No pending reports</p>
        ) : (
          <div className="space-y-2">
            {pendingReports.map(report => (
              <div key={report.id} className="card p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[var(--foreground)]">Report: {report.reason}</p>
                    <p className="text-[10px] text-[var(--muted)]">Reporter: {report.reporter_id}</p>
                    <p className="text-[10px] text-[var(--muted)]">Reported: {report.reported_user_id}</p>
                    {report.details && <p className="text-[10px] text-[var(--muted)] mt-1">{report.details}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAdminAction('resolve-report', report.id)} className="text-xs px-3 py-1 rounded bg-[var(--success)]/20 text-[var(--success)]">
                      Resolve
                    </button>
                    <button onClick={() => handleAdminAction('dismiss-report', report.id)} className="text-xs px-3 py-1 rounded bg-[var(--muted)]/20 text-[var(--muted)]">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Feedback */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Recent Feedback</h2>
        <div className="space-y-2">
          {recentFeedback.map(fb => (
            <div key={fb.id} className="card p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-[var(--foreground)]">{fb.name}</span>
                <span className="text-[10px] text-[var(--muted)]">{fb.type}</span>
                <span className="text-[10px] text-amber-400">{'★'.repeat(fb.rating)}</span>
              </div>
              <p className="text-xs text-[var(--muted)]">{fb.message}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Users Database */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Users Database {!allUsers ? '(Recent 50)' : `(${allUsers.length})`}
          </h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search name or email..." 
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
              className="input-field text-xs py-1.5 w-48"
            />
            {!allUsers && (
              <button 
                onClick={loadAllUsers} 
                disabled={loadingUsers}
                className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap"
              >
                {loadingUsers ? 'Loading...' : 'Load All Data'}
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto bg-[var(--surface)] p-2 rounded-xl border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                <th className="pb-2 pr-4 pl-2">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4 text-center">Arya Chats</th>
                <th className="pb-2 pr-4 text-center">Anon Posts</th>
                <th className="pb-2 pr-4 text-center">Reports</th>
                <th className="pb-2 pr-4">Last Active</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(allUsers || recentUsers)
                .filter(u => !userQuery || u.name.toLowerCase().includes(userQuery.toLowerCase()) || u.email.toLowerCase().includes(userQuery.toLowerCase()))
                .map(u => (
                <tr key={u.id} className="border-b border-[var(--border)]/30 hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-4 pl-2 text-[var(--foreground)] font-medium">{u.name}</td>
                  <td className="py-2.5 pr-4 text-[var(--muted)] select-all">{u.email}</td>
                  <td className="py-2.5 pr-4 text-center">
                    <span className="inline-block px-2 text-[10px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] rounded-full">
                      {u.aryaMessageCount || 0} {u.aryaVoiceCount ? `(🎤 ${u.aryaVoiceCount})` : ''}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-center">
                    <span className="inline-block px-2 text-[10px] font-bold bg-violet-500/10 text-violet-400 rounded-full">
                      {u.anonMessageCount || 0}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-center">
                    {(u.reportCount || 0) > 0 ? (
                      <span className="inline-block px-2 text-[10px] font-bold bg-red-500/10 text-red-500 rounded-full">
                        {u.reportCount}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]/50">-</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-[var(--muted)] whitespace-nowrap">
                    {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="py-2.5 text-[var(--muted)] whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {(allUsers || recentUsers).filter(u => !userQuery || u.name.toLowerCase().includes(userQuery.toLowerCase()) || u.email.toLowerCase().includes(userQuery.toLowerCase())).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--muted)] text-xs">No users found matching "{userQuery}"</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Anon Chat Stats ─── */}
      {anonStats && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">🎭 Anonymous Chat Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Passes', value: anonStats.totalPasses, icon: '🎫' },
              { label: 'Active Passes', value: anonStats.activePasses, icon: '✅' },
              { label: 'Total Reports', value: anonStats.totalReports, icon: '🚩' },
              { label: 'Pending Reports', value: anonStats.pendingReports, icon: '⏳' },
              { label: 'Total Bans', value: anonStats.totalBans, icon: '🚫' },
            ].map(s => (
              <div key={s.label} className="card p-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm">{s.icon}</span>
                  <span className="text-[10px] text-[var(--muted)]">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-[var(--foreground)]">{s.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Pending Anon Payments ─── */}
      {pendingPayments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">💳 Pending Anon Payments ({pendingPayments.length})</h2>
          <div className="space-y-3">
            {pendingPayments.map(p => (
              <div key={p.id} className="card p-4 border-l-4 border-amber-500">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {p.userName || 'Unknown'} <span className="text-[var(--muted)] font-normal">({p.userEmail})</span>
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Plan: <span className="text-[var(--primary)] font-medium">{p.plan}</span> &bull; Amount: <span className="font-medium">₹{p.amount}</span>
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      Transaction ID: <span className="font-mono text-[var(--foreground)]">{p.transactionId}</span>
                      {p.upiRef && <span> &bull; UPI Ref: <span className="font-mono">{p.upiRef}</span></span>}
                    </p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">
                      Submitted: {new Date(p.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAdminAction('approve-payment', p.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleAdminAction('reject-payment', p.id, { reason: 'Payment not found' })}
                      className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Coupon Generator ─── */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">🎫 Generate Anon Chat Coupons</h2>
        <div className="card p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-[var(--muted)] block mb-1">Plan</label>
              <select value={couponPlan} onChange={e => setCouponPlan(e.target.value)} className="input-field text-xs py-1.5">
                <option value="weekly">Weekly (₹19)</option>
                <option value="monthly">Monthly (₹49)</option>
                <option value="semester">Semester (₹199)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--muted)] block mb-1">Count</label>
              <input type="number" value={couponCount} onChange={e => setCouponCount(Number(e.target.value))} min={1} max={100} className="input-field text-xs py-1.5" />
            </div>
            <div>
              <label className="text-[10px] text-[var(--muted)] block mb-1">Max Uses Each</label>
              <input type="number" value={couponMaxUses} onChange={e => setCouponMaxUses(Number(e.target.value))} min={1} max={1000} className="input-field text-xs py-1.5" />
            </div>
            <div className="flex items-end">
              <button onClick={handleGenerateCoupons} className="btn-primary text-xs px-4 py-1.5 w-full">
                Generate
              </button>
            </div>
          </div>

          {generatedCodes.length > 0 && (
            <div className="bg-[var(--surface)] rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--success)]">✅ Generated {generatedCodes.length} codes:</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(generatedCodes.join('\n')); setActionMsg('Codes copied!'); }}
                  className="text-[10px] text-[var(--primary)] hover:underline"
                >
                  Copy All
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {generatedCodes.map(code => (
                  <span key={code} className="font-mono text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded">
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Existing Coupons ─── */}
      {coupons.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Existing Coupons ({coupons.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Plan</th>
                  <th className="pb-2 pr-3">Uses</th>
                  <th className="pb-2 pr-3">Active</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.code} className="border-b border-[var(--border)]/50">
                    <td className="py-1.5 pr-3 font-mono text-[var(--primary)]">{c.code}</td>
                    <td className="py-1.5 pr-3 text-[var(--foreground)]">{c.plan}</td>
                    <td className="py-1.5 pr-3 text-[var(--muted)]">{c.usedCount}/{c.maxUses}</td>
                    <td className="py-1.5 pr-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {c.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-1.5 text-[var(--muted)]">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
