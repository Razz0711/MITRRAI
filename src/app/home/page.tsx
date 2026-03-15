// ============================================
// MitrAI - Home Page (IOC-style Redesign)
// Personal greeting, action cards, shortcuts, FAB
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { BirthdayInfo, ChatThread, UserStatus } from '@/lib/types';
import BirthdayBanner from '@/components/BirthdayBanner';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Bell } from 'lucide-react';

/* ─── types ─── */
interface RadarPing {
  id: string;
  userId: string;
  userName: string;
  activityId: string;
  zone: string;
  location?: string;
  note: string;
  isAnonymous: boolean;
  createdAt: string;
}
interface AnonStats {
  queueCount: number;
  activeRooms: number;
}

/* ─── main component ─── */
export default function HomePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [pings, setPings] = useState<RadarPing[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [anonStats, setAnonStats] = useState<AnonStats | null>(null);
  const [birthdays, setBirthdays] = useState<BirthdayInfo[]>([]);
  const [wishedMap, setWishedMap] = useState<Record<string, boolean>>({});
  const [matchCount, setMatchCount] = useState(0);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, UserStatus>>({});



  /* ─── helpers ─── */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const avatarColors = ['bg-violet-600','bg-emerald-600','bg-blue-600','bg-pink-600','bg-amber-600','bg-cyan-600','bg-indigo-600','bg-rose-600'];
  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  /* ─── data loading ─── */
  useEffect(() => {
    if (!user) return;
    loadSnapshot();
    loadBirthdays();
    loadMatches();
    loadStatuses();
    const interval = setInterval(() => { loadSnapshot(); }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSnapshot = async () => {
    if (!user) return;
    try {
      const [radarRes, chatRes, anonRes] = await Promise.all([
        fetch(`/api/radar?userId=${user.id}`),
        fetch(`/api/chat?userId=${user.id}`),
        fetch('/api/anon?check=stats'),
      ]);
      const [radarData, chatData, anonData] = await Promise.all([
        radarRes.json(), chatRes.json(), anonRes.json(),
      ]);
      if (radarData?.success) setPings(radarData.data?.pings || []);
      if (Array.isArray(chatData?.threads)) setThreads(chatData.threads as ChatThread[]);
      if (anonData?.success) setAnonStats(anonData.data as AnonStats);
    } catch { /* ignore */ } finally {
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
    } catch { /* ignore */ }
  }, [user]);

  const loadMatches = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.id }),
      });
      const data = await res.json();
      if (data.success && data.data.matches) {
        setMatchCount(data.data.matches.length);
      }
    } catch { /* ignore */ }
  };

  const loadStatuses = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const map: Record<string, UserStatus> = {};
        data.data.forEach((s: UserStatus) => { map[s.userId] = s; });
        setOnlineStatuses(map);
      }
    } catch { /* ignore */ }
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

  // Suppress unused vars for lint
  void onlineStatuses;
  void getAvatarColor;

  /* ─── loading state ─── */
  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <LoadingSkeleton type="stats" count={3} label="Loading home..." />
      </div>
    );
  }

  /* ─── computed ─── */
  const firstName = (user?.name || 'Student').split(' ')[0];
  const liveOthers = pings.filter(p => p.userId !== user?.id);
  const anonLiveTotal = (anonStats?.queueCount || 0) + (anonStats?.activeRooms || 0) * 2;
  const isCampusQuiet = liveOthers.length === 0;
  const unreadTotal = threads.reduce((sum, t) => {
    if (t.user1Id === user?.id) return sum + t.unreadCount1;
    return sum + t.unreadCount2;
  }, 0);

  // First live ping from someone else (for pending action card)
  const firstLivePing = liveOthers.length > 0 ? liveOthers[0] : null;

  /* ─── render ─── */
  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 relative min-h-screen pb-24">

      {/* ═══ TOPBAR — Avatar + Greeting + Bell ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-base font-bold shadow-lg ring-2 ring-violet-500/30">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[11px] text-[var(--muted)]">{getGreeting()}</p>
            <h1 className="text-lg font-bold text-[var(--foreground)] leading-tight">
              Hey, {firstName}! 👋
            </h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors relative">
          <Bell size={18} />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">{unreadTotal > 9 ? '9+' : unreadTotal}</span>
          )}
        </button>
      </div>

      {/* ═══ STATUS PILLS ═══ */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <span className={`w-1.5 h-1.5 rounded-full ${isCampusQuiet ? 'bg-green-500' : 'bg-green-500 animate-pulse'}`} />
          {isCampusQuiet ? 'Campus quiet now' : `${liveOthers.length} live on campus`}
        </span>
        {anonLiveTotal > 0 && (
          <Link href="/anon" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-pink-500/12 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            {anonLiveTotal} in Anon →
          </Link>
        )}
      </div>

      {/* ═══ PENDING ACTION CARD — Amber ═══ */}
      {firstLivePing && (
        <Link
          href="/radar"
          className="block rounded-2xl p-4 transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.12))',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-xl shrink-0">
              👋
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--foreground)]">
                {firstLivePing.isAnonymous ? 'Someone' : firstLivePing.userName} is live at {firstLivePing.location || firstLivePing.zone || 'Campus'}
              </p>
              <p className="text-[11px] text-amber-400 mt-0.5">
                {firstLivePing.activityId} · {timeAgo(firstLivePing.createdAt)}
              </p>
            </div>
            <span className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 transition-colors">
              Ping
            </span>
          </div>
        </Link>
      )}

      {/* ═══ Birthday banner ═══ */}
      {birthdays.length > 0 && (
        <BirthdayBanner
          birthdays={birthdays}
          wishedMap={wishedMap}
          onWish={handleWish}
          currentUserId={user?.id || ''}
        />
      )}

      {/* ═══ 6 CARDS — 3×2 GRID ═══ */}
      <div className="grid grid-cols-2 gap-3">
        {/* 1. Radar */}
        <Link href="/radar" className="relative rounded-2xl p-4 flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.02] group"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(22,163,74,0.12))', border: '1px solid rgba(34,197,94,0.18)' }}
        >
          <div>
            <span className="text-2xl">📡</span>
            {!isCampusQuiet && (
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/25">
                {liveOthers.length} live
              </span>
            )}
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Radar</h3>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">Who&apos;s active on campus</p>
          </div>
          <span className="absolute bottom-3 right-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors text-xs">→</span>
        </Link>

        {/* 2. Anon Chat */}
        <Link href="/anon" className="relative rounded-2xl p-4 flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.02] group"
          style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(126,34,206,0.12))', border: '1px solid rgba(168,85,247,0.18)' }}
        >
          <div>
            <span className="text-2xl">🎭</span>
            {anonLiveTotal > 0 && (
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/25">
                {anonLiveTotal} live
              </span>
            )}
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Anon Chat</h3>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">No names, talk freely</p>
          </div>
          <span className="absolute bottom-3 right-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors text-xs">→</span>
        </Link>

        {/* 3. Campus Feed */}
        <Link href="/campus-feed" className="relative rounded-2xl p-4 flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.02] group"
          style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(13,148,136,0.12))', border: '1px solid rgba(20,184,166,0.18)' }}
        >
          <div>
            <span className="text-2xl">💬</span>
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Campus Feed</h3>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">Public discussion board</p>
          </div>
          <span className="absolute bottom-3 right-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors text-xs">→</span>
        </Link>

        {/* 4. Circles */}
        <Link href="/circles" className="relative rounded-2xl p-4 flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.02] group"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(37,99,235,0.12))', border: '1px solid rgba(59,130,246,0.18)' }}
        >
          <div>
            <span className="text-2xl">⭕</span>
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Circles</h3>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">Join study communities</p>
          </div>
          <span className="absolute bottom-3 right-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors text-xs">→</span>
        </Link>

        {/* 5. Matches */}
        <Link href="/matches" className="relative rounded-2xl p-4 flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.02] group"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.12))', border: '1px solid rgba(245,158,11,0.18)' }}
        >
          <div>
            <span className="text-2xl">🤝</span>
            {matchCount > 0 && (
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/25">
                {matchCount} found
              </span>
            )}
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Matches</h3>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">Your study buddy picks</p>
          </div>
          <span className="absolute bottom-3 right-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors text-xs">→</span>
        </Link>

        {/* 6. Arya AI */}
        <Link href="/arya" className="relative rounded-2xl p-4 flex flex-col justify-between min-h-[130px] transition-all hover:scale-[1.02] group"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(67,56,202,0.12))', border: '1px solid rgba(99,102,241,0.18)' }}
        >
          <div className="relative">
            <span className="text-2xl">✨</span>
            <span className="absolute top-0 left-8 w-2 h-2 rounded-full bg-green-500 border border-[var(--background)]" />
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Arya AI</h3>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">Always here for you</p>
          </div>
          <span className="absolute bottom-3 right-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors text-xs">→</span>
        </Link>
      </div>
    </div>
  );
}
