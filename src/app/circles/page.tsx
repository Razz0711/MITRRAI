// ============================================
// MitrAI - Circles Page (Redesigned)
// Clean interest groups with CSS variables
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import SubTabBar from '@/components/SubTabBar';

interface Circle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

interface Membership {
  circleId: string;
  createdAt: string;
}

export default function CirclesPage() {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadCircles = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/circles?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setCircles(data.data.circles || []);
        setMemberships(data.data.memberships || []);
        setMemberCounts(data.data.memberCounts || {});
      }
    } catch (err) {
      console.error('loadCircles:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCircles();
  }, [loadCircles]);

  const isJoined = (circleId: string) =>
    memberships.some((m) => m.circleId === circleId);

  const handleToggle = async (circleId: string) => {
    if (!user) return;
    setActionLoading(circleId);
    const action = isJoined(circleId) ? 'leave' : 'join';
    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, circleId, userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        await loadCircles();
      }
    } catch (err) {
      console.error('circle toggle:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={4} label="Loading circles..." />
      </div>
    );
  }

  const joined = circles.filter((c) => isJoined(c.id));
  const available = circles.filter((c) => !isJoined(c.id));
  const filtered = (arr: Circle[]) =>
    search ? arr.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())) : arr;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
      <SubTabBar group="chat" />

      {/* Ambient */}
      <div className="ambient-glow" />

      {/* Header — Premium */}
      <div className="text-center slide-up">
        <h1 className="text-xl font-extrabold mb-1">
          <span className="gradient-text">Communities</span>
        </h1>
        <p className="text-xs text-[var(--muted)]">
          {circles.length} circles · {Object.values(memberCounts).reduce((a, b) => a + b, 0)} members
        </p>
      </div>

      {/* Search — Glass */}
      <div className="relative slide-up-stagger-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search communities..."
          className="input-field pl-10 text-xs py-3"
        />
      </div>

      {/* My Circles */}
      {filtered(joined).length > 0 && (
        <section className="slide-up-stagger-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[var(--primary)] to-[var(--accent)]" />
              My Circles
            </h2>
            <span className="text-[10px] font-medium text-[var(--muted)] px-2.5 py-1 rounded-full bg-[var(--surface)]">{joined.length} joined</span>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {filtered(joined).map((circle) => (
              <div
                key={circle.id}
                className="card p-4 transition-all duration-300 glow-hover"
                style={{ borderLeftWidth: '3px', borderLeftColor: circle.color }}
              >
                <Link href={`/circles/${circle.id}`} className="block">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: circle.color + '18' }}>
                      {circle.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate">{circle.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--success)] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] inline-block" /> Joined
                        </span>
                        <span className="text-[10px] text-[var(--muted)]">
                          {memberCounts[circle.id] || 0} members
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted)] line-clamp-2 mb-3">
                    {circle.description}
                  </p>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); handleToggle(circle.id); }}
                  disabled={actionLoading === circle.id}
                  className="w-full py-2 rounded-xl text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 border border-[var(--border)] transition-all duration-200 disabled:opacity-50"
                >
                  {actionLoading === circle.id ? 'Leaving...' : 'Leave'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available Circles */}
      <section className={joined.length > 0 ? 'slide-up-stagger-3' : 'slide-up-stagger-2'}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[var(--secondary)] to-[var(--primary)]" />
            {joined.length > 0 ? 'Trending Communities' : 'Communities'}
          </h2>
          <span className="text-[10px] font-medium text-[var(--muted)] px-2.5 py-1 rounded-full bg-[var(--surface)]">{available.length} available</span>
        </div>
        {filtered(available).length === 0 ? (
          <div className="card p-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
              {search ? '🔍' : '🎉'}
            </div>
            <p className="text-sm font-semibold mb-1">
              {search ? `No matches for "${search}"` : "You've joined everything!"}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {search ? 'Try a different keyword' : 'You\'re part of every community. Legend!'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {filtered(available).map((circle, idx) => (
              <div
                key={circle.id}
                className="card p-4 transition-all duration-300 glow-hover flex flex-col"
              >
                <Link href={`/circles/${circle.id}`} className="flex-1 block">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: circle.color + '18' }}>
                      {circle.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold truncate">{circle.name}</h3>
                        {idx < 3 && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white">TRENDING</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--muted)]">
                        {memberCounts[circle.id] || 0} member{(memberCounts[circle.id] || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted)] line-clamp-2 mb-3">
                    {circle.description}
                  </p>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); handleToggle(circle.id); }}
                  disabled={actionLoading === circle.id}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${circle.color}, ${circle.color}dd)`,
                    boxShadow: `0 2px 12px ${circle.color}30`,
                  }}
                >
                  {actionLoading === circle.id ? 'Joining...' : '+ Join Community'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
