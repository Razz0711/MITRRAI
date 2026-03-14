// ============================================
// MitrAI - Circles Page (Split-View Redesign)
// Left: circle list | Right: circle detail
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ChatSideNav from '@/components/ChatSideNav';
import { Search, Plus } from 'lucide-react';

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

interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  description: string;
  circleId: string;
  creatorId: string;
  maxMembers: number;
  status: string;
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
  const [listTab, setListTab] = useState<'joined' | 'discover'>('joined');
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);

  const loadCircles = useCallback(async () => {
    if (!user) return;
    try {
      const [circlesRes, roomsRes] = await Promise.all([
        fetch(`/api/circles?userId=${user.id}`),
        fetch('/api/rooms'),
      ]);
      const data = await circlesRes.json();
      const roomsData = await roomsRes.json();
      if (data.success) {
        setCircles(data.data.circles || []);
        setMemberships(data.data.memberships || []);
        setMemberCounts(data.data.memberCounts || {});
      }
      if (roomsData.success) setRooms(roomsData.data.rooms || []);
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
      if (data.success) await loadCircles();
    } catch (err) {
      console.error('circle toggle:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Determine circle status based on real data
  const getCircleStatus = (circle: Circle) => {
    const circleRooms = rooms.filter(r => r.circleId === circle.id && r.status === 'active');
    if (circleRooms.length > 0) return { status: 'live', detail: `${circleRooms.length} live room${circleRooms.length > 1 ? 's' : ''}` };
    const count = memberCounts[circle.id] || 0;
    return { status: count > 0 ? 'active' : 'quiet', detail: `${count} member${count !== 1 ? 's' : ''}` };
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="h-[calc(100vh-4.5rem)] md:h-[calc(100vh-3.5rem)] flex">
          <ChatSideNav />
          <div className="flex-1 flex items-center justify-center">
            <LoadingSkeleton type="cards" count={4} label="Loading circles..." />
          </div>
        </div>
      </div>
    );
  }

  const joined = circles.filter((c) => isJoined(c.id));
  const available = circles.filter((c) => !isJoined(c.id));
  const displayList = listTab === 'joined' ? joined : available;
  const filtered = search
    ? displayList.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()))
    : displayList;

  // Auto-select first circle on desktop if none selected
  const activeCircle = selectedCircle || (joined.length > 0 ? joined[0] : circles[0]);
  const circleRooms = activeCircle ? rooms.filter(r => r.circleId === activeCircle.id) : [];



  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="h-[calc(100vh-4.5rem)] md:h-[calc(100vh-3.5rem)] flex">
        <ChatSideNav />

        {/* ═══════ CIRCLE LIST (left panel) ═══════ */}
        <div className="flex flex-col flex-1 md:flex-none md:w-72 lg:w-80 md:border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)]">

          {/* Header */}
          <div className="p-4 pb-2">
            <h1 className="text-lg font-bold text-[var(--foreground)]">Circles</h1>
          </div>

          {/* Search */}
          <div className="px-3 pb-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)]/50"
              />
            </div>
          </div>

          {/* Joined / Discover tabs */}
          <div className="flex items-center gap-1 px-3 pb-3">
            <button
              onClick={() => setListTab('joined')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                listTab === 'joined'
                  ? 'bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/30'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Joined
            </button>
            <button
              onClick={() => setListTab('discover')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                listTab === 'discover'
                  ? 'bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/30'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Discover
            </button>
          </div>

          {/* Circle list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-[var(--muted)]">
                  {search ? `No matches for "${search}"` : listTab === 'joined' ? 'No circles joined yet' : 'All circles joined!'}
                </p>
              </div>
            ) : (
              filtered.map((circle) => {
                const cs = getCircleStatus(circle);
                const isActive = activeCircle?.id === circle.id;
                return (
                  <button
                    key={circle.id}
                    onClick={() => setSelectedCircle(circle)}
                    className={`w-full text-left px-3 py-3 flex items-center gap-3 transition-all border-l-2 ${
                      isActive
                        ? 'bg-[var(--surface)] border-l-[var(--primary)]'
                        : 'border-l-transparent hover:bg-[var(--surface)]/50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: circle.color + '20' }}
                    >
                      {circle.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate text-[var(--foreground)]">{circle.name}</h3>
                        {cs.status === 'live' && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 shrink-0">
                            ● Live
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--muted)] truncate">
                        {memberCounts[circle.id] || 0} members · {cs.detail}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════ CIRCLE DETAIL (right panel — desktop) ═══════ */}
        <div className="hidden md:flex flex-col flex-1 overflow-y-auto bg-[var(--background)]">
          {activeCircle ? (
            <div className="p-6">
              {/* Circle header */}
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: activeCircle.color + '20' }}
                >
                  {activeCircle.emoji}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[var(--foreground)]">{activeCircle.name}</h2>
                  <p className="text-xs text-[var(--muted)] mt-1">{activeCircle.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-[var(--muted)]">{memberCounts[activeCircle.id] || 0} members</span>
                  </div>
                </div>
                {isJoined(activeCircle.id) ? (
                  <button
                    onClick={() => handleToggle(activeCircle.id)}
                    disabled={actionLoading === activeCircle.id}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] border border-[var(--border)] hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50"
                  >
                    {actionLoading === activeCircle.id ? 'Leaving...' : 'Leave'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggle(activeCircle.id)}
                    disabled={actionLoading === activeCircle.id}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
                    style={{ background: `linear-gradient(135deg, ${activeCircle.color}, ${activeCircle.color}dd)` }}
                  >
                    {actionLoading === activeCircle.id ? 'Joining...' : '+ Join'}
                  </button>
                )}
              </div>

              {/* LIVE ROOMS section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-gradient-to-b from-green-500 to-emerald-600" />
                    LIVE ROOMS
                  </h3>
                  <Link href="/rooms" className="text-[10px] font-semibold text-[var(--primary-light)] hover:underline">
                    + New room
                  </Link>
                </div>

                {circleRooms.filter(r => r.status === 'active').length > 0 ? (
                  circleRooms.filter(r => r.status === 'active').map(room => (
                    <Link key={room.id} href={`/rooms/${room.id}`} className="block p-4 rounded-2xl mb-3 transition-all hover:bg-[var(--surface)]/80" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-lg">📚</div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-[var(--foreground)]">{room.name}{room.topic ? ` — ${room.topic}` : ''}</h4>
                          <p className="text-[10px] text-[var(--muted)]">Started {timeAgo(room.createdAt)}</p>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">● Live</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {room.topic && <span className="text-[9px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-semibold">{room.topic}</span>}
                        <span className="text-[10px] text-[var(--muted)]">👥 {room.maxMembers} max</span>
                        <span className="ml-auto text-[10px] font-bold text-white px-3 py-1 rounded-lg" style={{ background: 'linear-gradient(135deg, var(--primary), #6d28d9)' }}>Join</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-4 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                    <p className="text-xs text-[var(--muted)]">No live rooms right now</p>
                  </div>
                )}

                {/* Start a new room */}
                <Link href="/rooms" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface)] transition-all mt-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
                    <Plus size={14} className="text-[var(--primary-light)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Start a new room</p>
                    <p className="text-[10px] text-[var(--muted)]">DSA · CP · Project · Discussion</p>
                  </div>
                </Link>
              </div>

              {/* RECENT ACTIVITY */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2 mb-3">
                  <span className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
                  RECENT ACTIVITY
                </h3>
                <div className="p-6 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                  <p className="text-xs text-[var(--muted)]">No recent activity yet. Join a room or start a discussion!</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl mb-4">⭕</div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Select a circle</p>
                <p className="text-xs text-[var(--muted)] mt-1">Choose a circle from the list to see details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
