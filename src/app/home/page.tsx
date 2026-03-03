// ============================================
// MitrAI - HOME Tab Page
// Greeting, quick stats, birthdays, schedule, quick actions
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { StudentProfile, BirthdayInfo, Day } from '@/lib/types';
import BirthdayBanner from '@/components/BirthdayBanner';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function HomePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Birthdays
  const [birthdays, setBirthdays] = useState<BirthdayInfo[]>([]);
  const [wishedMap, setWishedMap] = useState<Record<string, boolean>>({});

  // Stats
  const [studyStreak, setStudyStreak] = useState(0);
  const [xp, setXp] = useState<{ totalXp: number; level: string } | null>(null);
  const [badges, setBadges] = useState<{ badgeId: string; badgeName: string; badgeEmoji: string }[]>([]);

  // Invite
  const [inviteCopied, setInviteCopied] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    if (!user) return;
    loadData();
    loadBirthdays();
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

  const loadBirthdays = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/birthday?days=7&userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setBirthdays(data.data.birthdays || []);
        setWishedMap(data.data.wishedMap || {});
      }
    } catch { /* ignore */ }
  }, [user]);

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
      const streakData = JSON.parse(localStorage.getItem('mitrai_study_streak') || '{"dates":[],"streak":0}');
      const today = new Date().toISOString().slice(0, 10);
      const dates: string[] = streakData.dates || [];
      if (!dates.includes(today)) dates.push(today);

      let streak = 0;
      const checkDate = new Date();
      for (;;) {
        const dateStr = checkDate.toISOString().slice(0, 10);
        if (dates.includes(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      }
      setStudyStreak(streak);
      localStorage.setItem('mitrai_study_streak', JSON.stringify({ dates: dates.slice(-30), streak }));
    } catch { setStudyStreak(1); }
  };

  const handleWish = async (toUserId: string, toUserName: string) => {
    if (!user) return;
    try {
      await fetch('/api/birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: user.id, fromUserName: user.name, toUserId, toUserName }),
      });
    } catch { /* ignore */ }
  };

  const getInviteLink = () => {
    const admNo = student?.admissionNumber || user?.id?.slice(0, 6) || 'svnit';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mitrai-study.vercel.app';
    return `${origin}/login?ref=${admNo}`;
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(getInviteLink());
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const link = getInviteLink();
    const msg = encodeURIComponent(`Hey! Join MitrAI — find study buddies at SVNIT 🎓\n${link}\nMade by students, for students!`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="stats" count={3} label="Loading home..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-bold">
          {getGreeting()}, <span className="gradient-text">{student?.name || user?.name || 'Student'}</span> 👋
        </h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          {student?.department || 'SVNIT Surat'} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-3 text-center">
          <p className="text-lg font-bold">🔥 {studyStreak}</p>
          <p className="text-[10px] text-[var(--muted)]">Day Streak</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold">⚡ {xp?.totalXp || 0}</p>
          <p className="text-[10px] text-[var(--muted)]">XP Earned</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold">🎯 {xp?.level || 'New'}</p>
          <p className="text-[10px] text-[var(--muted)]">Level</p>
        </div>
      </div>

      {/* Badges (if any) */}
      {badges.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {badges.map(b => (
            <span key={b.badgeId} className="inline-flex items-center gap-1 text-xs bg-white/5 border border-[var(--border)] rounded-full px-2.5 py-1">
              {b.badgeEmoji} {b.badgeName}
            </span>
          ))}
        </div>
      )}

      {/* Birthday Alerts */}
      {user && birthdays.length > 0 && (
        <div className="mb-6">
          <BirthdayBanner
            birthdays={birthdays}
            currentUserId={user.id}
            wishedMap={wishedMap}
            onWish={handleWish}
          />
        </div>
      )}

      {/* Hero CTA — Find Your Study Buddy */}
      <Link href="/matches" className="card p-5 mb-6 block border-[var(--primary)]/30 hover:border-[var(--primary)]/60 transition-all group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">🤝 Find Your <span className="gradient-text">Study Buddy</span></p>
            <p className="text-xs text-[var(--muted)] mt-1">AI-powered matching across 5 dimensions</p>
          </div>
          <span className="text-xs text-[var(--primary-light)] font-medium group-hover:translate-x-0.5 transition-transform">Match Now →</span>
        </div>
      </Link>

      {/* Primary Actions */}
      <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/radar" className="card-hover p-4 text-center block border-green-500/20 relative overflow-hidden">
          <span className="absolute top-1.5 right-1.5 text-[8px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">NEW</span>
          <span className="text-2xl mb-1 block">📡</span>
          <p className="text-xs font-semibold">Campus Radar</p>
          <p className="text-[10px] text-[var(--muted)]">See who&apos;s around you</p>
        </Link>
        <Link href="/doubts" className="card-hover p-4 text-center block border-orange-500/20">
          <span className="text-2xl mb-1 block">🔥</span>
          <p className="text-xs font-semibold">Campus Feed</p>
          <p className="text-[10px] text-[var(--muted)]">Confessions & hot takes</p>
        </Link>
        <Link href="/anon" className="card-hover p-4 text-center block border-purple-500/20">
          <span className="text-2xl mb-1 block">🎭</span>
          <p className="text-xs font-semibold">Anonymous Chat</p>
          <p className="text-[10px] text-[var(--muted)]">Talk freely, no names</p>
        </Link>
        <Link href="/circles" className="card-hover p-4 text-center block">
          <span className="text-2xl mb-1 block">⭕</span>
          <p className="text-xs font-semibold">Circles</p>
          <p className="text-[10px] text-[var(--muted)]">Interest communities</p>
        </Link>
      </div>

      {/* More Actions */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <Link href="/skills" className="card-hover p-3 text-center block relative">
          <span className="absolute top-0.5 right-0.5 text-[7px] font-bold text-green-400">NEW</span>
          <span className="text-lg block mb-0.5">🔄</span>
          <p className="text-[10px] font-medium">Skill Swap</p>
        </Link>
        <Link href="/rooms" className="card-hover p-3 text-center block">
          <span className="text-lg block mb-0.5">📚</span>
          <p className="text-[10px] font-medium">Rooms</p>
        </Link>
        <Link href="/circles" className="card-hover p-3 text-center block">
          <span className="text-lg block mb-0.5">⭕</span>
          <p className="text-[10px] font-medium">Circles</p>
        </Link>
        <Link href="/friends" className="card-hover p-3 text-center block">
          <span className="text-lg block mb-0.5">👥</span>
          <p className="text-[10px] font-medium">Friends</p>
        </Link>
      </div>

      {/* Today's Schedule */}
      {student && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold mb-2">📅 Today&apos;s Schedule</h2>
          <div className="flex gap-1.5 mb-3">
            {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((day, i) => {
              const fullDays: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
              const jsDay = new Date().getDay(); // 0=Sun, 1=Mon...
              const isToday = ((i + 1) % 7) === jsDay;
              const isAvailable = student.availableDays.includes(fullDays[i]);
              return (
                <div
                  key={day}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    isToday
                      ? isAvailable
                        ? 'bg-[var(--success)]/20 text-[var(--success)] ring-1 ring-[var(--success)]/50'
                        : 'bg-[var(--error)]/10 text-[var(--error)] ring-1 ring-[var(--error)]/30'
                      : isAvailable
                        ? 'bg-[var(--success)]/10 text-[var(--success)]'
                        : 'bg-white/5 text-[var(--muted)]'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[var(--muted)]">
            Study time: <span className="text-[var(--foreground)] font-medium">{student.availableTimes}</span> •{' '}
            Target: <span className="text-[var(--foreground)] font-medium">{student.studyHoursTarget}h/day</span>
          </p>
        </div>
      )}

      {/* Invite Batchmates */}
      <div className="card p-4 mb-6 border-[var(--primary)]/20">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📤</span>
          <h2 className="text-sm font-semibold">Invite Batchmates</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-[var(--surface)] rounded-lg px-3 py-2 text-xs text-[var(--muted)] truncate border border-[var(--border)]">
            {getInviteLink()}
          </div>
          <div className="flex gap-2">
            <button onClick={copyInviteLink} className="btn-secondary text-xs px-3 py-2 whitespace-nowrap">
              {inviteCopied ? '✅ Copied!' : '📋 Copy'}
            </button>
            <button onClick={shareOnWhatsApp} className="text-xs px-3 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors whitespace-nowrap">
              📱 WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Pro Banner */}
      <Link href="/subscription" className="card p-4 border-amber-500/20 block hover:border-amber-500/40 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">✨ MitrAI Pro</p>
            <p className="text-xs text-[var(--muted)]">Free during launch — unlock all features</p>
          </div>
          <span className="text-xs text-amber-400 font-medium">Explore →</span>
        </div>
      </Link>
    </div>
  );
}
