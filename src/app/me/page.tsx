// ============================================
// MitrAI - ME Tab Page
// Profile, Stats, Academic links, Account settings
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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={3} label="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
      {/* Profile Header */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-xl shrink-0">
            {(student?.name || user?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{student?.name || user?.name || 'Student'}</h1>
            <p className="text-xs text-[var(--muted)]">{student?.department || 'SVNIT Surat'}</p>
            {student?.admissionNumber && (
              <p className="text-[10px] text-[var(--muted)]">#{student.admissionNumber}</p>
            )}
          </div>
          <Link href="/onboarding" className="btn-ghost text-xs px-3 py-1.5 shrink-0">
            Edit
          </Link>
        </div>
        {/* Quick Profile Info */}
        {student && (
          <div className="mt-4 pt-3 border-t border-[var(--border)] grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs font-bold">{student.yearLevel}</p>
              <p className="text-[10px] text-[var(--muted)]">Year</p>
            </div>
            <div>
              <p className="text-xs font-bold">{student.targetExam || '—'}</p>
              <p className="text-[10px] text-[var(--muted)]">Target</p>
            </div>
            <div>
              <p className="text-xs font-bold">{student.studyHoursTarget}h</p>
              <p className="text-[10px] text-[var(--muted)]">Daily Goal</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div>
        <h2 className="text-sm font-semibold mb-3">📊 My Stats</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Streak</p>
            <p className="text-lg font-bold">🔥 {studyStreak} days</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">XP</p>
            <p className="text-lg font-bold">⚡ {xp?.totalXp || 0}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Level</p>
            <p className="text-lg font-bold">🎯 {xp?.level || 'Beginner'}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Best Streak</p>
            <p className="text-lg font-bold">🏆 {xp?.longestStreak || studyStreak} days</p>
          </div>
        </div>

        {/* XP Progress */}
        {xp && (
          <div className="mt-3">
            <div className="w-full h-2 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(100, ((xp.totalXp || 0) % 500) / 5)}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-1">{(xp.totalXp || 0) % 500}/500 XP to next level</p>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {badges.map(b => (
              <span
                key={b.badgeId}
                title={b.badgeName}
                className="inline-flex items-center gap-1 text-xs bg-white/5 border border-[var(--border)] rounded-full px-2.5 py-1"
              >
                {b.badgeEmoji} {b.badgeName}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Academic Section */}
      <div>
        <h2 className="text-sm font-semibold mb-3">🎓 Academic</h2>
        <div className="space-y-1">
          <MenuLink href="/analytics" icon="📈" label="Analytics" desc="Study insights & trends" />
        </div>
      </div>

      {/* Account Section */}
      <div>
        <h2 className="text-sm font-semibold mb-3">⚙️ Account</h2>
        <div className="space-y-1">
          <MenuLink href="/subscription" icon="✨" label="Pro Subscription" desc="Unlock all features" highlight />
          <MenuLink href="/dashboard" icon="🏠" label="Full Dashboard" desc="Detailed profile & stats" />
          <MenuLink href="/feedback" icon="📝" label="Feedback" desc="Help us improve MitrAI" />
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface-light)] transition-colors text-left"
          >
            <span className="text-lg">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</p>
              <p className="text-[10px] text-[var(--muted)]">Switch appearance</p>
            </div>
            <span className="text-[10px] text-[var(--muted)]">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
          {user && (
            <>
              <button
                onClick={() => {
                  if (window.confirm('Export your data? This will open a new tab.')) {
                    window.open(`/api/export?userId=${user.id}`, '_blank');
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface-light)] transition-colors text-left"
              >
                <span className="text-lg">📦</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Export Data</p>
                  <p className="text-[10px] text-[var(--muted)]">Download your data (GDPR)</p>
                </div>
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-left"
              >
                <span className="text-lg">🚪</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-400">Sign Out</p>
                  <p className="text-[10px] text-[var(--muted)]">{user.email}</p>
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--muted)] pb-4">
        <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms</Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy</Link>
        <span>·</span>
        <span>© {new Date().getFullYear()} MitrAI</span>
      </div>
    </div>
  );
}

function MenuLink({ href, icon, label, desc, highlight }: {
  href: string;
  icon: string;
  label: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface-light)] transition-colors ${
        highlight ? 'border border-amber-500/20' : ''
      }`}
    >
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${highlight ? 'text-amber-400' : ''}`}>{label}</p>
        <p className="text-[10px] text-[var(--muted)]">{desc}</p>
      </div>
      <span className="text-[var(--muted)] text-xs">›</span>
    </Link>
  );
}
