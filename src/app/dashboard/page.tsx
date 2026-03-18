// ============================================
// MitrRAI - Dashboard (Feature Hub)
// Shows all features, quick stats, and quick-access cards
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import {
  Sparkles, Ghost, MessageCircle, Users, BookOpen,
  Star, Zap, Radio, GraduationCap, Crown,
  ArrowRight, Bell, ChevronRight,
} from 'lucide-react';

interface QuickStat {
  matches: number;
  friends: number;
  messages: number;
  posts: number;
}

const FEATURES = [
  {
    id: 'arya',
    title: 'Arya AI',
    desc: 'Your AI bestie — chat, vent, get advice',
    icon: Sparkles,
    href: '/arya',
    gradient: 'from-purple-600 to-violet-700',
    glow: 'shadow-purple-500/20',
    badge: 'AI',
  },
  {
    id: 'anon',
    title: 'Anonymous Chat',
    desc: 'Meet strangers. No identity. Just vibes',
    icon: Ghost,
    href: '/anon',
    gradient: 'from-emerald-600 to-teal-700',
    glow: 'shadow-emerald-500/20',
    badge: null,
  },
  {
    id: 'feed',
    title: 'Campus Feed',
    desc: 'Post activities — Study, Sports, Food, SOS',
    icon: Zap,
    href: '/home',
    gradient: 'from-blue-600 to-indigo-700',
    glow: 'shadow-blue-500/20',
    badge: null,
  },
  {
    id: 'chat',
    title: 'Direct Chat',
    desc: 'Message your matched buddies',
    icon: MessageCircle,
    href: '/chat',
    gradient: 'from-pink-600 to-rose-700',
    glow: 'shadow-pink-500/20',
    badge: null,
  },
  {
    id: 'circles',
    title: 'Study Circles',
    desc: 'Join communities, create live study rooms',
    icon: Users,
    href: '/circles',
    gradient: 'from-amber-600 to-orange-700',
    glow: 'shadow-amber-500/20',
    badge: null,
  },
  {
    id: 'doubts',
    title: 'Doubts & Confessions',
    desc: 'Ask doubts, confess anonymously, react',
    icon: BookOpen,
    href: '/doubts',
    gradient: 'from-red-600 to-rose-700',
    glow: 'shadow-red-500/20',
    badge: null,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<QuickStat>({ matches: 0, friends: 0, messages: 0, posts: 0 });
  const [greeting, setGreeting] = useState('Hey');
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good morning');
    else if (hr < 17) setGreeting('Good afternoon');
    else if (hr < 21) setGreeting('Good evening');
    else setGreeting('Night owl mode');
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      try {
        const [matchRes, friendRes] = await Promise.all([
          fetch('/api/match').then(r => r.json()).catch(() => ({ data: { matches: [] } })),
          fetch('/api/friends').then(r => r.json()).catch(() => ({ data: { friends: [] } })),
        ]);
        setStats({
          matches: matchRes?.data?.matches?.length || 0,
          friends: friendRes?.data?.friends?.length || 0,
          messages: 0,
          posts: 0,
        });
      } catch { /* silent */ }
      setLoadingStats(false);
    };
    loadStats();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold">Welcome to <span className="gradient-text">MitrRAI</span></h1>
          <p className="text-sm text-[var(--muted)] max-w-xs mx-auto">Your all-in-one campus companion for SVNIT</p>
          <Link href="/login" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const firstName = user.name?.split(' ')[0] || 'there';

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-[var(--muted)] mb-0.5">{greeting} 👋</p>
          <h1 className="text-xl font-bold text-[var(--foreground)]">{firstName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/notifications" className="relative p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all">
            <Bell size={18} className="text-[var(--muted)]" />
          </Link>
          <Link href="/me" className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-sm font-bold shadow-md shadow-[var(--primary)]/20">
            {firstName.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>

      {/* ─── Quick Stats ─── */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-[var(--primary-light)]">
            {loadingStats ? '—' : stats.matches}
          </p>
          <p className="text-[10px] text-[var(--muted)]">Matches</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">
            {loadingStats ? '—' : stats.friends}
          </p>
          <p className="text-[10px] text-[var(--muted)]">Friends</p>
        </div>
        <div className="card p-3 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 to-transparent" />
          <Link href="/subscription" className="relative">
            <Crown size={18} className="mx-auto text-amber-400 mb-0.5" />
            <p className="text-[10px] text-amber-400 font-semibold">Go Pro</p>
          </Link>
        </div>
      </div>

      {/* ─── Arya Banner ─── */}
      <Link href="/arya" className="block mb-6">
        <div className="relative overflow-hidden rounded-2xl p-4 border border-purple-500/20" style={{
          background: 'linear-gradient(135deg, rgba(147,51,234,0.15), rgba(79,70,229,0.1))',
        }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl" />
          <div className="flex items-center gap-3 relative">
            <div className="relative shrink-0">
              <Image src="/arya-avatar.png" alt="Arya" width={48} height={48} className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/30" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[var(--background)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[var(--foreground)]">Chat with Arya</p>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400">AI</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] truncate">Your campus bestie — exams, stress, doubts, or just vibes 💜</p>
            </div>
            <ChevronRight size={18} className="text-purple-400 shrink-0" />
          </div>
        </div>
      </Link>

      {/* ─── Feature Grid ─── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Explore</h2>
          <span className="text-[10px] text-[var(--muted)]">{FEATURES.length} features</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <Link key={f.id} href={f.href} className="group">
                <div className={`card p-4 hover:border-[var(--primary)]/30 transition-all hover:shadow-lg ${f.glow} active:scale-[0.98]`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-md ${f.glow}`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    {f.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        f.badge === 'AI' ? 'bg-purple-500/20 text-purple-400' :
                        f.badge === 'LIVE' ? 'bg-green-500/20 text-green-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>{f.badge}</span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-[var(--foreground)] mb-0.5">{f.title}</p>
                  <p className="text-[10px] text-[var(--muted)] leading-relaxed line-clamp-2">{f.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── Quick Links ─── */}
      <div className="space-y-1.5">
        {[
          { label: 'My Matches', href: '/matches', icon: Star, color: 'text-amber-400' },
          { label: 'Study Rooms', href: '/rooms', icon: BookOpen, color: 'text-blue-400' },
          { label: 'Friends', href: '/friends', icon: Users, color: 'text-emerald-400' },
          { label: 'Subscription', href: '/subscription', icon: Crown, color: 'text-purple-400' },
        ].map(link => (
          <Link key={link.href} href={link.href} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)]/20 transition-all group">
            <link.icon size={16} className={link.color} />
            <span className="flex-1 text-xs font-medium text-[var(--foreground)]">{link.label}</span>
            <ChevronRight size={14} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>

      {/* ─── Footer ─── */}
      <div className="mt-8 text-center">
        <p className="text-[10px] text-[var(--muted)]">
          MitrRAI — Your all-in-one campus companion 💜
        </p>
        <div className="flex justify-center gap-3 mt-2">
          <Link href="/privacy" className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Privacy</Link>
          <Link href="/terms" className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Terms</Link>
          <Link href="/me/help" className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Help</Link>
          <Link href="/me/feedback" className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Feedback</Link>
        </div>
      </div>
    </div>
  );
}
