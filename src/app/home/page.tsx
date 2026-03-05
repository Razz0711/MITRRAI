// ============================================
// MitrAI - HOME — Social Discovery Feed
// People nearby + radar pings + quick actions — the heartbeat
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { StudentProfile, BirthdayInfo } from '@/lib/types';
import BirthdayBanner from '@/components/BirthdayBanner';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  Radar, Flame, MessageCircleMore, CircleDot,
  GraduationCap, ArrowLeftRight, DoorOpen, Users,
  Handshake, ChevronRight, Search, MapPin, Clock,
  MessageCircle, Heart, Share2, Sparkles, Radio,
  Plus, Zap, Send,
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

const ACTIVITIES: Record<string, { emoji: string; label: string; color: string }> = {
  'study-dsa': { emoji: '💻', label: 'DSA Practice', color: '#7c3aed' },
  'study-math': { emoji: '📐', label: 'Math Study', color: '#06b6d4' },
  'study-general': { emoji: '📚', label: 'General Study', color: '#3b82f6' },
  'music': { emoji: '🎸', label: 'Music Jam', color: '#ec4899' },
  'cricket': { emoji: '🏏', label: 'Cricket', color: '#22c55e' },
  'gym': { emoji: '🏋️', label: 'Gym Buddy', color: '#f59e0b' },
  'gaming': { emoji: '🎮', label: 'Gaming', color: '#8b5cf6' },
  'chai': { emoji: '☕', label: 'Chai & Chat', color: '#f97316' },
  'walk': { emoji: '🚶', label: 'Evening Walk', color: '#14b8a6' },
  'movie': { emoji: '🎬', label: 'Watch Movie', color: '#e11d48' },
  'food': { emoji: '🍕', label: 'Food Run', color: '#ea580c' },
  'hangout': { emoji: '😎', label: 'Just Hangout', color: '#6366f1' },
};

export default function HomePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pings, setPings] = useState<RadarPing[]>([]);
  const [pingsLoading, setPingsLoading] = useState(true);

  // Birthdays
  const [birthdays, setBirthdays] = useState<BirthdayInfo[]>([]);
  const [wishedMap, setWishedMap] = useState<Record<string, boolean>>({});

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️';
    if (hour < 17) return '🌤️';
    return '🌙';
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

  const loadPings = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/radar?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setPings(data.data.pings || []);
      }
    } catch { /* ignore */ }
    finally { setPingsLoading(false); }
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

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="stats" count={3} label="Loading home..." />
      </div>
    );
  }

  const firstName = (student?.name || user?.name || 'Student').split(' ')[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
      {/* Ambient Background Glow */}
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      {/* ─── Greeting Hero ─── */}
      <div className="slide-up">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {getGreetingEmoji()} {getGreeting()},
            </h1>
            <h2 className="text-2xl font-extrabold tracking-tight">
              <span className="gradient-text">{firstName}</span>
            </h2>
          </div>
          <Link href="/me" className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary)] via-[var(--accent)] to-[var(--secondary)] p-[2px]">
              <div className="w-full h-full rounded-2xl bg-[var(--background)] flex items-center justify-center text-lg font-bold text-[var(--foreground)]">
                {firstName[0]?.toUpperCase()}
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--success)] rounded-full border-2 border-[var(--background)]" />
          </Link>
        </div>
        <p className="text-sm text-[var(--muted)]">
          {student?.department || 'SVNIT Surat'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>

      {/* ─── Birthday Banner ─── */}
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

      {/* ─── Quick Actions Row ─── */}
      <div className="slide-up-stagger-2">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {([
            { href: '/matches', icon: Handshake, label: 'Find Buddy', gradient: 'from-violet-500 to-purple-600' },
            { href: '/anon', icon: MessageCircleMore, label: 'Anon Chat', gradient: 'from-pink-500 to-rose-600' },
            { href: '/doubts', icon: Flame, label: 'Campus Feed', gradient: 'from-orange-500 to-red-600' },
            { href: '/circles', icon: CircleDot, label: 'Circles', gradient: 'from-cyan-500 to-blue-600' },
            { href: '/radar', icon: Radio, label: 'Broadcast', gradient: 'from-emerald-500 to-green-600' },
          ] as const).map((item, i) => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-2 shrink-0 group">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                <item.icon size={22} className="text-white" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-semibold text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Live People Nearby ─── */}
      <div className="slide-up-stagger-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="w-2.5 h-2.5 bg-[var(--success)] rounded-full inline-block" />
              <span className="w-2.5 h-2.5 bg-[var(--success)] rounded-full inline-block absolute inset-0 animate-ping opacity-50" />
            </div>
            <h3 className="text-base font-bold">People Looking For...</h3>
          </div>
          <Link href="/radar" className="text-xs font-semibold text-[var(--primary-light)] hover:text-[var(--primary)] transition-colors flex items-center gap-1">
            See all <ChevronRight size={14} />
          </Link>
        </div>

        {pingsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-4 shimmer h-24 rounded-2xl" />
            ))}
          </div>
        ) : pings.length === 0 ? (
          <div className="card-glass p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
              📡
            </div>
            <p className="text-sm font-semibold mb-1">Campus is quiet right now</p>
            <p className="text-xs text-[var(--muted)] mb-5">Be the first to broadcast what you&apos;re looking for!</p>
            <Link href="/radar" className="btn-primary text-xs inline-flex items-center gap-2">
              <Radio size={14} /> Start Broadcasting
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pings.slice(0, 5).map((ping, idx) => {
              const act = ACTIVITIES[ping.activityId];
              const isMe = ping.userId === user?.id;
              return (
                <div
                  key={ping.id}
                  className={`card p-4 transition-all duration-300 hover:border-[rgba(124,58,237,0.3)] group ${idx === 0 ? 'slide-up' : ''}`}
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: (act?.color || '#7c3aed') + '18' }}
                      >
                        {act?.emoji || '📡'}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--success)] rounded-full border-2 border-[var(--surface-solid)]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold truncate">
                          {isMe ? 'You' : (ping.isAnonymous ? '🕵️ Someone' : ping.userName)}
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

            {pings.length > 5 && (
              <Link href="/radar" className="block text-center py-3 text-sm font-semibold text-[var(--primary-light)] hover:text-[var(--primary)] transition-colors">
                View {pings.length - 5} more people →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ─── Explore Grid ─── */}
      <div className="slide-up-stagger-4">
        <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Explore More</h3>
        <div className="grid grid-cols-4 gap-2.5">
          {([
            { href: '/ratings', icon: GraduationCap, label: 'Rate Prof', color: '#f59e0b', badge: 'NEW' },
            { href: '/skills', icon: ArrowLeftRight, label: 'Skill Swap', color: '#06b6d4' },
            { href: '/rooms', icon: DoorOpen, label: 'Rooms', color: '#22c55e' },
            { href: '/friends', icon: Users, label: 'Friends', color: '#3b82f6' },
          ] as const).map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="card-hover p-3 flex flex-col items-center text-center relative group"
            >
              {'badge' in item && item.badge && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-all duration-300"
                style={{ backgroundColor: item.color + '15' }}
              >
                <item.icon size={18} strokeWidth={1.8} style={{ color: item.color }} />
              </div>
              <p className="text-[10px] font-semibold text-[var(--foreground)]">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom spacer for mobile */}
      <div className="h-4" />
    </div>
  );
}
