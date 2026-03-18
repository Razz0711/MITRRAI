// ============================================
// MitrrAi - ME Page (IOC-style Redesign)
// Profile + Account + Preferences + Support
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { StudentProfile } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { X } from 'lucide-react';

export default function MePage() {
  const { user, logout } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(0);
  const [circleCount, setCircleCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [topMatch, setTopMatch] = useState(0);
  const [zoomPhoto, setZoomPhoto] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [comingSoon, setComingSoon] = useState(false);

  const showComingSoon = () => { setComingSoon(true); setTimeout(() => setComingSoon(false), 2500); };

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [studentRes, matchRes, circleRes] = await Promise.all([
        fetch(`/api/students?id=${encodeURIComponent(user.id)}`),
        fetch(`/api/match?userId=${encodeURIComponent(user.id)}`),
        fetch(`/api/circles?userId=${user.id}`),
      ]);

      const studentData = await studentRes.json();
      if (studentData.success) setStudent(studentData.data as StudentProfile);

      const matchData = await matchRes.json();
      if (matchData.success) {
        const matches = matchData.data?.matches || matchData.data || [];
        setMatchCount(Array.isArray(matches) ? matches.length : 0);
        if (Array.isArray(matches) && matches.length > 0) {
          const topScore = Math.max(...matches.map((m: { score?: { overall?: number } }) => m.score?.overall || 0));
          setTopMatch(Math.round(topScore));
        }
      }

      const circleData = await circleRes.json();
      if (circleData.success) {
        const memberships = circleData.data?.memberships || [];
        setCircleCount(memberships.length);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  // Check theme on mount
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    setDarkMode(theme !== 'light');
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // Suppress unused lint
  void sessionCount;

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={3} label="Loading profile..." />
      </div>
    );
  }

  const fullName = student?.name || user?.name || 'Student';
  const department = student?.department || 'SVNIT Surat';
  const yearLevel = student?.yearLevel || '';

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-5 pb-28">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Me</h1>
        <Link
          href="/me/edit"
          className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          ✏️
        </Link>
      </div>

      {/* ═══ PROFILE CARD ═══ */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-4 mb-4">
          {/* Avatar with camera icon */}
          <div className="relative shrink-0">
            {student?.photoUrl ? (
              <Image
                src={student.photoUrl}
                alt={fullName}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover shadow-lg ring-2 ring-violet-500/30 cursor-pointer transition-transform active:scale-95"
                onClick={() => setZoomPhoto(true)}
                unoptimized
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-2 ring-violet-500/30 cursor-pointer transition-transform active:scale-95"
                onClick={() => setZoomPhoto(true)}
              >
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => setZoomPhoto(true)}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-violet-600 border-2 border-[var(--background)] flex items-center justify-center text-white text-[10px]"
            >
              📷
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold truncate text-[var(--foreground)]">{fullName}</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {department}{yearLevel ? ` · ${yearLevel}` : ''}
            </p>
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              SVNIT Verified
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
          <div className="text-center py-3">
            <div className="text-lg font-bold text-[var(--foreground)]">{matchCount}</div>
            <div className="text-[10px] text-[var(--muted)]">Matches</div>
          </div>
          <div className="text-center py-3 border-l border-[var(--border)]">
            <div className="text-lg font-bold text-[var(--foreground)]">{circleCount}</div>
            <div className="text-[10px] text-[var(--muted)]">Circles</div>
          </div>
          <div className="text-center py-3 border-l border-[var(--border)]">
            <div className="text-lg font-bold text-[var(--foreground)]">{sessionCount}</div>
            <div className="text-[10px] text-[var(--muted)]">Sessions</div>
          </div>
          <div className="text-center py-3 border-l border-[var(--border)]">
            <div className="text-lg font-bold text-[var(--foreground)]">{topMatch > 0 ? `${topMatch}%` : '—'}</div>
            <div className="text-[10px] text-[var(--muted)]">Top match</div>
          </div>
        </div>
      </div>

      {/* Photo Zoom Modal */}
      {zoomPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setZoomPhoto(false)}>
          <button
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setZoomPhoto(false); }}
          >
            <X size={24} />
          </button>
          {student?.photoUrl ? (
            <Image
              src={student.photoUrl}
              alt={fullName}
              width={384}
              height={384}
              className="w-64 h-64 md:w-96 md:h-96 rounded-full border-4 border-white/20 object-cover shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              unoptimized
            />
          ) : (
            <div
              className="w-64 h-64 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 border-4 border-white/20 flex items-center justify-center text-white font-bold text-6xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* ═══ ACCOUNT SECTION ═══ */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] px-1 mb-2">ACCOUNT</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          {/* Pro Subscription */}
          <Link href="/subscription" className="flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-lg">⭐</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--foreground)]">Pro Subscription</p>
              <p className="text-[10px] text-[var(--muted)]">Unlock unlimited matches & Arya AI</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/25">Upgrade</span>
            <span className="text-[var(--muted)] text-xs ml-1">›</span>
          </Link>

          <div className="h-px bg-[var(--border)]" />

          {/* Invite Friends */}
          <button
            onClick={() => {
              const msg = encodeURIComponent(`Hey! Join MitrrAi — find study buddies at SVNIT\nhttps://mitrrai.vercel.app`);
              window.open(`https://wa.me/?text=${msg}`, '_blank');
            }}
            className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-lg">🎁</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--foreground)]">Invite Friends</p>
              <p className="text-[10px] text-[var(--muted)]">5 invites = 1 month Pro free</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-emerald-400">0/5</p>
              <p className="text-[9px] text-[var(--muted)]">joined</p>
            </div>
            <span className="text-[var(--muted)] text-xs ml-1">›</span>
          </button>
        </div>
      </div>

      {/* ═══ PREFERENCES SECTION ═══ */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] px-1 mb-2">PREFERENCES</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          {/* Change Language */}
          <Link href="/me/language" className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-lg">🌐</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--foreground)]">Change Language</p>
              <p className="text-[10px] text-[var(--muted)]">English (default)</p>
            </div>
            <span className="text-[var(--muted)] text-xs">›</span>
          </Link>

          <div className="h-px bg-[var(--border)]" />

          {/* Switch Theme */}
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-lg">🌙</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--foreground)]">Switch Theme</p>
              <p className="text-[10px] text-[var(--muted)]">{darkMode ? 'Dark mode is on' : 'Light mode is on'}</p>
            </div>
            {/* Toggle switch */}
            <div className={`relative w-12 h-7 rounded-full transition-colors ${darkMode ? 'bg-violet-600' : 'bg-gray-400'}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>



          {/* Privacy */}
          <Link href="/me/privacy" className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-lg">🔒</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--foreground)]">Privacy</p>
              <p className="text-[10px] text-[var(--muted)]">Control who sees you</p>
            </div>
            <span className="text-[var(--muted)] text-xs">›</span>
          </Link>
        </div>
      </div>

      {/* ═══ SUPPORT SECTION ═══ */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] px-1 mb-2">SUPPORT</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          {/* Feedback */}
          <Link href="/me/feedback" className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center text-lg">💬</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--foreground)]">Feedback</p>
              <p className="text-[10px] text-[var(--muted)]">Help us improve MitrrAi</p>
            </div>
            <span className="text-[var(--muted)] text-xs">›</span>
          </Link>

          <div className="h-px bg-[var(--border)]" />

          {/* Help & FAQ */}
          <Link href="/me/help" className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-lg">❓</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--foreground)]">Help & FAQ</p>
              <p className="text-[10px] text-[var(--muted)]">How to use MitrrAi</p>
            </div>
            <span className="text-[var(--muted)] text-xs">›</span>
          </Link>
        </div>
      </div>

      {/* ═══ SIGN OUT ═══ */}
      {user && (
        <button
          onClick={logout}
          className="w-full py-3.5 rounded-2xl text-center text-sm font-semibold text-red-400 hover:bg-red-500/5 transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          Sign Out
        </button>
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-[var(--muted)] pb-6">
        <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms</Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy</Link>
        <span>·</span>
        <span>MitrrAi v1.0</span>
      </div>

      {/* Coming Soon Toast */}
      {comingSoon && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className="px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-2xl animate-bounce" style={{background:'linear-gradient(135deg, #8B5CF6, #6d28d9)',boxShadow:'0 8px 32px rgba(124,58,237,0.4)'}}>
            🚀 Coming Soon!
          </div>
        </div>
      )}
    </div>
  );
}
