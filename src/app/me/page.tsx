// ============================================
// MitrAI - ME Tab Page
// Clean profile, progress, settings
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';
import { StudentProfile } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function MePage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState<{ totalXp: number; level: string; currentStreak: number; longestStreak: number } | null>(null);
  const [badges, setBadges] = useState<{ badgeId: string; badgeName: string; badgeEmoji: string; earnedAt: string }[]>([]);
  const [studyStreak, setStudyStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadData();
    loadGamification();
    loadStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        const userEmail = user?.email?.toLowerCase() || '';
        const mine = (data.data as StudentProfile[]).filter(
          (s: StudentProfile) => s.email?.toLowerCase() === userEmail
        );
        const savedId = localStorage.getItem('mitrai_student_id');
        const found = savedId ? mine.find((s: StudentProfile) => s.id === savedId) : mine[0];
        if (found) setStudent(found);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadGamification = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/gamification?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setXp(data.data.xp);
        setBadges(data.data.badges || []);
      }
    } catch { /* ignore */ }
  };

  const loadStreak = () => {
    try {
      const data = JSON.parse(localStorage.getItem('mitrai_study_streak') || '{"streak":0}');
      setStudyStreak(data.streak || 0);
    } catch { setStudyStreak(0); }
  };

  const xpProgress = xp ? ((xp.totalXp || 0) % 500) : 0;
  const xpPercent = Math.min(100, xpProgress / 5);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={3} label="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">

      {/* ── Profile Card ── */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg shadow-[var(--primary)]/20">
            {(student?.name || user?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">{student?.name || user?.name || 'Student'}</h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {student?.department || 'SVNIT Surat'}
              {student?.yearLevel ? ` · ${student.yearLevel}` : ''}
            </p>
          </div>
          <Link href="/onboarding" className="text-xs text-[var(--primary-light)] font-medium px-3 py-1.5 rounded-lg border border-[var(--primary)]/20 hover:bg-[var(--primary)]/10 transition-colors shrink-0">
            Edit
          </Link>
        </div>
      </div>

      {/* ── Progress Strip ── */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🔥</span>
              <span className="text-sm font-bold">{studyStreak}</span>
              <span className="text-[10px] text-[var(--muted)]">day streak</span>
            </div>
            <div className="w-px h-4 bg-[var(--border)]" />
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⚡</span>
              <span className="text-sm font-bold">{xp?.totalXp || 0}</span>
              <span className="text-[10px] text-[var(--muted)]">XP</span>
            </div>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary-light)]">
            {xp?.level || 'Beginner'}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-700"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-[var(--muted)] mt-1.5">{xpProgress}/500 XP to next level</p>

        {badges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3 pt-3 border-t border-[var(--border)]">
            {badges.map(b => (
              <span
                key={b.badgeId}
                title={b.badgeName}
                className="text-[10px] bg-white/5 border border-[var(--border)] rounded-full px-2 py-0.5"
              >
                {b.badgeEmoji} {b.badgeName}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Menu Items ── */}
      <div className="card overflow-hidden mb-4">
        <MenuItem href="/friends" icon="🤝" label="Friends & Ratings" />
        <MenuItem href="/matches" icon="🎯" label="Find Study Buddy" />
      </div>

      <div className="card overflow-hidden mb-4">
        <MenuItem href="/subscription" icon="✨" label="Pro Subscription" accent />
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left border-t border-[var(--border)]"
        >
          <span className="text-base w-5 text-center">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="text-[13px] font-medium flex-1">Appearance</span>
          <span className="text-[11px] text-[var(--muted)] mr-1">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          <span className="text-[var(--muted)] text-xs">›</span>
        </button>
        <MenuItem href="/feedback" icon="💬" label="Feedback" border />
      </div>

      {/* Invite Batchmates */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📤</span>
          <span className="text-[13px] font-medium">Invite Batchmates</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-[11px] text-[var(--muted)] truncate border border-[var(--border)]">
            {typeof window !== 'undefined' ? `${window.location.origin}/login?ref=${student?.admissionNumber || user?.id?.slice(0, 6) || 'svnit'}` : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const link = `${window.location.origin}/login?ref=${student?.admissionNumber || user?.id?.slice(0, 6) || 'svnit'}`;
                navigator.clipboard.writeText(link);
              }}
              className="btn-secondary text-xs px-3 py-2 whitespace-nowrap"
            >
              📋 Copy
            </button>
            <button
              onClick={() => {
                const link = `${window.location.origin}/login?ref=${student?.admissionNumber || user?.id?.slice(0, 6) || 'svnit'}`;
                const msg = encodeURIComponent(`Hey! Join MitrAI \u2014 find study buddies at SVNIT 🎓\n${link}`);
                window.open(`https://wa.me/?text=${msg}`, '_blank');
              }}
              className="text-xs px-3 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              📱 WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Pro Banner */}
      <Link href="/subscription" className="card p-4 mb-4 border-amber-500/20 block hover:border-amber-500/40 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-amber-400">✨ MitrAI Pro</p>
            <p className="text-[11px] text-[var(--muted)]">Free during launch — unlock all features</p>
          </div>
          <span className="text-[11px] text-amber-400 font-medium">Explore →</span>
        </div>
      </Link>

      {/* Sign Out */}
      {user && (
        <button
          onClick={logout}
          className="w-full card py-3 text-center text-sm font-medium text-red-400 hover:bg-red-500/5 transition-colors mb-4"
        >
          Sign Out
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-[var(--muted)] pb-6">
        <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms</Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy</Link>
        <span>·</span>
        <span>MitrAI v1.0</span>
      </div>
    </div>
  );
}

function MenuItem({ href, icon, label, accent, border = true }: {
  href: string;
  icon: string;
  label: string;
  accent?: boolean;
  border?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors ${
        border ? 'border-t border-[var(--border)] first:border-t-0' : ''
      }`}
    >
      <span className="text-base w-5 text-center">{icon}</span>
      <span className={`text-[13px] font-medium flex-1 ${accent ? 'text-amber-400' : ''}`}>{label}</span>
      <span className="text-[var(--muted)] text-xs">›</span>
    </Link>
  );
}
