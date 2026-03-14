'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { StudentProfile, BirthdayInfo } from '@/lib/types';
import BirthdayBanner from '@/components/BirthdayBanner';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  Flame,
  Handshake,
  MapPin,
  MessageCircleMore,
  Radio,
  Send,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

interface RadarPing {
  id: string;
  userId: string;
  userName: string;
  activityId: string;
  zone: string;
  note: string;
  isAnonymous: boolean;
  createdAt: string;
  expiresAt: string;
}

const ACTIVITIES: Record<string, { label: string; color: string }> = {
  'study-dsa': { label: 'DSA Practice', color: '#7c3aed' },
  'study-math': { label: 'Math Study', color: '#06b6d4' },
  'study-general': { label: 'General Study', color: '#3b82f6' },
  'music': { label: 'Music Jam', color: '#ec4899' },
  'cricket': { label: 'Cricket', color: '#22c55e' },
  'gym': { label: 'Gym Buddy', color: '#f59e0b' },
  'gaming': { label: 'Gaming', color: '#8b5cf6' },
  'chai': { label: 'Chai and Chat', color: '#f97316' },
  'walk': { label: 'Evening Walk', color: '#14b8a6' },
  'movie': { label: 'Watch Movie', color: '#e11d48' },
  'food': { label: 'Food Run', color: '#ea580c' },
  'hangout': { label: 'Just Hangout', color: '#6366f1' },
};

export default function HomePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pings, setPings] = useState<RadarPing[]>([]);
  const [pingsLoading, setPingsLoading] = useState(true);

  const [birthdays, setBirthdays] = useState<BirthdayInfo[]>([]);
  const [wishedMap, setWishedMap] = useState<Record<string, boolean>>({});

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
    loadPings();
    const pingInterval = setInterval(loadPings, 15000);
    return () => clearInterval(pingInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success) {
        setStudent(data.data as StudentProfile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    } catch {
      // ignore
    }
  }, [user]);

  const loadPings = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/radar?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setPings(data.data.pings || []);
      }
    } catch {
      // ignore
    } finally {
      setPingsLoading(false);
    }
  };

  const handleWish = async (toUserId: string, toUserName: string) => {
    if (!user) return;
    try {
      await fetch('/api/birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: user.id, fromUserName: user.name, toUserId, toUserName }),
      });
    } catch {
      // ignore
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const profileChecklist = [
    { label: 'Goal added', done: Boolean(student?.targetExam) },
    { label: 'Strengths listed', done: Boolean(student?.strongSubjects?.length) },
    { label: 'Focus areas listed', done: Boolean(student?.weakSubjects?.length) },
    { label: 'Availability added', done: Boolean(student?.availableDays?.length && student?.availableTimes) },
    { label: 'Study style set', done: Boolean(student?.studyMethod?.length) },
    { label: 'Weekly goal set', done: Boolean(student?.shortTermGoal || student?.weeklyGoals) },
  ];

  const completedChecklistItems = profileChecklist.filter((item) => item.done).length;
  const profileProgress = Math.round((completedChecklistItems / profileChecklist.length) * 100);
  const profileReady = Boolean(
    student?.targetExam &&
    student?.strongSubjects?.length &&
    student?.weakSubjects?.length &&
    student?.availableDays?.length &&
    student?.availableTimes
  );
  const liveCampusCount = pings.filter((ping) => ping.userId !== user?.id).length;
  const topPings = pings.slice(0, 4);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="stats" count={3} label="Loading home..." />
      </div>
    );
  }

  const firstName = (student?.name || user?.name || 'Student').split(' ')[0];

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      <div className="slide-up">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              <Sparkles size={12} className="text-[var(--accent)]" />
              Study partner hub
            </div>
            <div className="mt-3 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight">
                {getGreeting()},
              </h1>
              <h2 className="text-2xl font-extrabold tracking-tight">
                <span className="gradient-text">{firstName}</span>
              </h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {student?.department || 'SVNIT Surat'} - {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
            <MetricCard label="Profile" value={`${profileProgress}%`} hint={profileReady ? 'Ready to match' : 'Keep going'} />
            <MetricCard label="Live now" value={`${liveCampusCount}`} hint="Campus pings" />
          </div>
        </div>
      </div>

      {user && birthdays.length > 0 && (
        <div className="slide-up-stagger-1">
          <BirthdayBanner
            birthdays={birthdays}
            currentUserId={user.id}
            wishedMap={wishedMap}
            onWish={handleWish}
          />
        </div>
      )}

      <section className="card-glass p-5 sm:p-6 slide-up-stagger-2">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-light)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {profileReady ? <Handshake size={12} className="text-[var(--primary-light)]" /> : <Target size={12} className="text-[var(--warning)]" />}
              {profileReady ? 'Ready for matching' : 'Complete your profile'}
            </div>
            <h3 className="mt-3 text-xl font-bold text-[var(--foreground)]">
              {profileReady ? 'You are ready to meet your best-fit study buddy' : 'Finish setup before we start matching'}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {profileReady
                ? 'Your profile has enough signal for matching across goals, subjects, and availability. Next up: review your top matches and start a real conversation.'
                : `You have already covered ${completedChecklistItems} of ${profileChecklist.length} setup items. A few more answers will make your matches meaningfully better.`}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={profileReady ? '/matches' : '/onboarding'}
                className="btn-primary inline-flex items-center gap-2"
              >
                {profileReady ? 'See my matches' : 'Finish profile'}
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/radar"
                className="btn-secondary inline-flex items-center gap-2"
              >
                Check campus radar
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Profile readiness</p>
                <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{profileProgress}%</p>
              </div>
              <span className="badge badge-primary">{completedChecklistItems}/{profileChecklist.length} complete</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-[var(--surface-light)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-500"
                style={{ width: `${profileProgress}%` }}
              />
            </div>
            <div className="mt-4 grid gap-2">
              {profileChecklist.slice(0, 4).map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
                    item.done ? 'bg-[var(--success)]/10 text-[var(--foreground)]' : 'bg-[var(--surface-light)] text-[var(--muted)]'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={item.done ? 'text-[var(--success)]' : 'text-[var(--muted)]'}>
                    {item.done ? 'Done' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 slide-up-stagger-3">
        <ActionCard
          href={profileReady ? '/matches' : '/onboarding'}
          eyebrow={profileReady ? 'Primary path' : 'Finish setup'}
          title={profileReady ? 'Review top matches' : 'Complete onboarding'}
          description={profileReady ? 'See ranked study partners and connect quickly.' : 'Add your study style and availability to unlock better matches.'}
          icon={<Handshake size={18} />}
        />
        <ActionCard
          href="/radar"
          eyebrow="Live campus"
          title="See who is active now"
          description="Spot students looking for a session, chai break, or quick help."
          icon={<Radio size={18} />}
        />
        <ActionCard
          href="/chat"
          eyebrow="Conversations"
          title="Open your chats"
          description="Pick up existing conversations with friends and study buddies."
          icon={<MessageCircleMore size={18} />}
        />
      </section>

      <section className="slide-up-stagger-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="w-2.5 h-2.5 bg-[var(--success)] rounded-full inline-block" />
              <span className="w-2.5 h-2.5 bg-[var(--success)] rounded-full inline-block absolute inset-0 animate-ping opacity-50" />
            </div>
            <div>
              <h3 className="text-base font-bold">Active on campus now</h3>
              <p className="text-xs text-[var(--muted)]">Use this to jump into live study intent, not just browse features.</p>
            </div>
          </div>
          <Link href="/radar" className="text-xs font-semibold text-[var(--primary-light)] hover:text-[var(--primary)] transition-colors flex items-center gap-1">
            See all <ChevronRight size={14} />
          </Link>
        </div>

        {pingsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="card p-4 shimmer h-24 rounded-2xl" />
            ))}
          </div>
        ) : pings.length === 0 ? (
          <div className="card-glass p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--primary)]/10 flex items-center justify-center text-sm font-bold text-[var(--primary-light)] mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
              Radar
            </div>
            <p className="text-sm font-semibold mb-1">Campus is quiet right now</p>
            <p className="text-xs text-[var(--muted)] mb-5">Post what you want to do and let the right people discover you.</p>
            <Link href="/radar" className="btn-primary text-xs inline-flex items-center gap-2">
              <Radio size={14} /> Start broadcasting
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {topPings.map((ping, idx) => {
              const act = ACTIVITIES[ping.activityId];
              const isMe = ping.userId === user?.id;

              return (
                <div
                  key={ping.id}
                  className={`card p-4 transition-all duration-300 hover:border-[rgba(124,58,237,0.3)] group ${idx === 0 ? 'slide-up' : ''}`}
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: (act?.color || '#7c3aed') + '18' }}
                      >
                        {act?.label?.charAt(0) || 'A'}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--success)] rounded-full border-2 border-[var(--surface-solid)]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold truncate">
                          {isMe ? 'You' : (ping.isAnonymous ? 'Someone' : ping.userName)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-light)] text-[var(--muted)]">
                          <MapPin size={9} /> {ping.zone}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: act?.color || 'var(--primary-light)' }}>
                        Looking for <span className="font-semibold">{act?.label || 'something'}</span>
                      </p>
                      {ping.note && (
                        <p className="text-xs text-[var(--muted)] mt-1 italic">&ldquo;{ping.note}&rdquo;</p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                          <Clock size={10} /> {timeAgo(ping.createdAt)}
                        </span>
                        {!isMe && !ping.isAnonymous && (
                          <Link
                            href={`/chat?friendId=${encodeURIComponent(ping.userId)}&friendName=${encodeURIComponent(ping.userName)}`}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--primary-light)] hover:text-white hover:bg-[var(--primary)] px-3 py-1 rounded-full border border-[var(--primary)]/30 hover:border-transparent transition-all duration-200"
                          >
                            <Send size={11} /> Connect
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {pings.length > topPings.length && (
              <Link href="/radar" className="block text-center py-3 text-sm font-semibold text-[var(--primary-light)] hover:text-[var(--primary)] transition-colors">
                View {pings.length - topPings.length} more people
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="slide-up-stagger-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">More ways to use MitrAI</h3>
          <span className="text-[10px] text-[var(--muted)]">Lower priority, still useful</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard
            href="/doubts"
            eyebrow="Campus feed"
            title="Ask or answer openly"
            description="Post doubts, confessions, and quick help requests in the anonymous feed."
            icon={<Flame size={18} />}
          />
          <ActionCard
            href="/rooms"
            eyebrow="Group study"
            title="Join a study room"
            description="Work in small topic-based rooms when one-on-one matching is not enough."
            icon={<Users size={18} />}
          />
          <ActionCard
            href="/friends"
            eyebrow="Network"
            title="Manage your people"
            description="Track friends, requests, and the people you already study with."
            icon={<BookOpen size={18} />}
          />
        </div>
      </section>

      <div className="h-4" />
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{value}</p>
      <p className="text-[10px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function ActionCard({
  href,
  eyebrow,
  title,
  description,
  icon,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="card-hover p-4 group">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{eyebrow}</p>
          <h3 className="mt-2 text-sm font-bold text-[var(--foreground)]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/12 text-[var(--primary-light)] transition-transform duration-300 group-hover:scale-105">
          {icon}
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary-light)]">
        Open
        <ArrowRight size={14} />
      </div>
    </Link>
  );
}
