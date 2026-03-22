// ============================================
// MitrRAI - Circles Page (Discord Model Redesign)
// Circle = community, Room = live session inside
// Left: circle list | Right: circle detail + rooms
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Search, Plus, ArrowLeft } from 'lucide-react';

interface Circle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

interface Membership {
  circleId: string;
  userId?: string;
  createdAt: string;
}

interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  description: string;
  circleId: string;
  creatorId: string;
  creatorName: string;
  maxMembers: number;
  status: string;
  createdAt: string;
}

/* ─── Avatar color helper ─── */
const AVATAR_COLORS = ['bg-violet-600','bg-emerald-600','bg-blue-600','bg-pink-600','bg-amber-600','bg-cyan-600','bg-indigo-600','bg-rose-600'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
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
  const [detailTab, setDetailTab] = useState<'rooms' | 'members'>('rooms');

  // Create room form
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('');
  const [roomMax, setRoomMax] = useState(5);
  const [creating, setCreating] = useState(false);

  // All members for the circle
  const [circleMembers, setCircleMembers] = useState<{userId: string; userName: string}[]>([]);

  // Dept stats
  const [allStudents, setAllStudents] = useState<{id: string; department: string}[]>([]);

  const roomPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCircles = useCallback(async () => {
    if (!user) return;
    try {
      const [circlesRes, roomsRes, studentsRes] = await Promise.all([
        fetch(`/api/circles?userId=${user.id}`),
        fetch('/api/rooms'),
        fetch('/api/students'),
      ]);
      const data = await circlesRes.json();
      const roomsData = await roomsRes.json();
      const studentsData = await studentsRes.json();
      if (data.success) {
        setCircles(data.data.circles || []);
        setMemberships(data.data.memberships || []);
        setMemberCounts(data.data.memberCounts || {});
      }
      if (roomsData.success) setRooms(roomsData.data.rooms || []);
      if (studentsData.success) setAllStudents(studentsData.data || []);
    } catch (err) {
      console.error('loadCircles:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCircles();
  }, [loadCircles]);

  // Poll rooms every 5s so live room status stays fresh
  useEffect(() => {
    const pollRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        if (data.success) setRooms(data.data.rooms || []);
      } catch { /* ignore */ }
    };
    roomPollRef.current = setInterval(pollRooms, 5000);
    return () => { if (roomPollRef.current) clearInterval(roomPollRef.current); };
  }, []);

  const loadMembers = useCallback(async (circleId: string) => {
    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'members', circleId }),
      });
      const data = await res.json();
      if (data.success) setCircleMembers(data.data.members || []);
    } catch (err) {
      console.error('loadMembers:', err);
    }
  }, []);

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

  const handleCreateRoom = async () => {
    if (!user || !roomName.trim() || !selectedCircle) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName,
          topic: roomTopic,
          description: '',
          creatorId: user.id,
          creatorName: user.name || user.email?.split('@')[0] || 'Student',
          maxMembers: roomMax,
          circleId: selectedCircle.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setRoomName('');
        setRoomTopic('');
        setRoomMax(5);
        await loadCircles();
      }
    } catch (err) {
      console.error('createRoom:', err);
    } finally {
      setCreating(false);
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

  const getCircleStatus = (circle: Circle) => {
    const circleRooms = rooms.filter(r => r.circleId === circle.id && r.status === 'active');
    if (circleRooms.length > 0) return { status: 'live', detail: `${circleRooms[0].name} live` };
    return { status: 'quiet', detail: 'Quiet now' };
  };

  const selectCircle = (circle: Circle) => {
    setSelectedCircle(circle);
    setDetailTab('rooms');
    setShowCreate(false);
    loadMembers(circle.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="h-[calc(100vh-4.5rem)] md:h-[calc(100vh-3.5rem)] flex">
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
    ? displayList.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : displayList;

  const activeCircle = selectedCircle || (joined.length > 0 ? joined[0] : circles[0]);
  const circleRooms = activeCircle ? rooms.filter(r => r.circleId === activeCircle.id) : [];
  const liveRooms = circleRooms.filter(r => r.status === 'active');

  // Dept stats — how many from your dept are in each circle
  const myDept = user?.department || '';
  const deptStudentIds = new Set(allStudents.filter(s => s.department === myDept && s.id !== user?.id).map(s => s.id));


  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="h-[calc(100vh-4.5rem)] md:h-[calc(100vh-3.5rem)] flex">

        {/* ═══════ CIRCLE LIST (left panel) ═══════ */}
        <div className={`flex flex-col flex-1 md:flex-none md:w-72 lg:w-80 md:border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)] ${selectedCircle ? 'hidden md:flex' : 'flex'}`}>

          {/* Header */}
          <div className="p-4 pb-2 flex items-center gap-2">
            <span className="text-xl">🟣</span>
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
                const deptInCircle = memberships.filter(m => m.circleId === circle.id && m.userId != null && deptStudentIds.has(m.userId)).length;
                return (
                  <button
                    key={circle.id}
                    onClick={() => selectCircle(circle)}
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
                        {memberCounts[circle.id] || 0} members{deptInCircle > 0 ? ` · ${deptInCircle} from your dept` : ''}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════ CIRCLE DETAIL (right panel) ═══════ */}
        <div className={`${selectedCircle ? 'flex' : 'hidden md:flex'} flex-col flex-1 overflow-y-auto bg-[var(--background)]`}>
          {activeCircle ? (
            <div className="p-6 max-w-2xl">
              {/* Mobile back button */}
              <button
                onClick={() => setSelectedCircle(null)}
                className="md:hidden flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Circles
              </button>
              {/* ─── Circle header ─── */}
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: activeCircle.color + '20' }}
                >
                  {activeCircle.emoji}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[var(--foreground)]">{activeCircle.name}</h2>
                  <p className="text-xs text-[var(--muted)] mt-1">{activeCircle.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {/* Member avatars */}
                    <div className="flex -space-x-2">
                      {circleMembers.slice(0, 4).map(m => (
                        <div key={m.userId} className={`w-6 h-6 rounded-full ${avatarColor(m.userName || 'U')} flex items-center justify-center text-white text-[8px] font-bold border-2 border-[var(--background)]`}>
                          {(m.userName || 'U').charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-[var(--muted)]">{memberCounts[activeCircle.id] || 0} members</span>
                    {liveRooms.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                        ● {liveRooms.length} room{liveRooms.length > 1 ? 's' : ''} live
                      </span>
                    )}
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

              {/* ─── Detail tabs ─── */}
              <div className="flex items-center gap-4 mb-5 border-b border-[var(--border)] pb-2">
                {(['rooms', 'members'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setDetailTab(t); if (t === 'members') loadMembers(activeCircle.id); }}
                    className={`text-xs font-semibold pb-2 border-b-2 transition-all capitalize ${
                      detailTab === t
                        ? 'border-[var(--primary)] text-[var(--primary-light)]'
                        : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {t === 'rooms' ? 'Rooms' : 'Members'}
                  </button>
                ))}
              </div>

              {/* ─── Rooms tab ─── */}
              {detailTab === 'rooms' && (
                <>
                  {/* LIVE NOW */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-green-500" />
                        LIVE NOW
                      </h3>
                      <button
                        onClick={() => setShowCreate(true)}
                        className="text-[10px] font-semibold text-[var(--primary-light)] hover:underline"
                      >
                        + New room
                      </button>
                    </div>

                    {liveRooms.length > 0 ? (
                      liveRooms.map(room => (
                        <Link
                          key={room.id}
                          href={`/rooms/${room.id}`}
                          className="block p-4 rounded-2xl mb-3 transition-all hover:border-green-500/30"
                          style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-lg">📚</div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-[var(--foreground)]">{room.name}{room.topic ? ` — ${room.topic}` : ''}</h4>
                              <p className="text-[10px] text-[var(--muted)]">Started by {room.creatorName || 'someone'} · {timeAgo(room.createdAt)}</p>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">● Live</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {room.topic && <span className="text-[9px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-semibold">{room.topic}</span>}
                            <span className="text-[10px] text-[var(--muted)]">👥 {room.maxMembers} max</span>
                            <span className="text-[10px] text-emerald-400">{timeAgo(room.createdAt)}</span>
                            <span className="ml-auto text-[10px] font-bold text-white px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500">Join</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="p-4 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                        <p className="text-xs text-[var(--muted)]">No live rooms right now</p>
                      </div>
                    )}
                  </div>

                  {/* Start a new room */}
                  {!showCreate ? (
                    <button
                      onClick={() => setShowCreate(true)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface)] transition-all w-full text-left mb-5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
                        <Plus size={14} className="text-[var(--primary-light)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">Start a new room</p>
                        <p className="text-[10px] text-[var(--muted)]">DSA · CP · Project · Discussion · Pomodoro</p>
                      </div>
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl mb-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--foreground)]">📚 New Room in {activeCircle.name}</span>
                        <button onClick={() => setShowCreate(false)} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">✕</button>
                      </div>
                      <input
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                        placeholder="Room name (e.g., Trees & Graphs DSA)"
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-[var(--glass-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--primary)]/50"
                        autoFocus
                      />
                      <input
                        value={roomTopic}
                        onChange={e => setRoomTopic(e.target.value)}
                        placeholder="Topic (e.g., DSA, CP, Math)"
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-[var(--glass-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--primary)]/50"
                      />
                      <div className="flex items-center gap-3">
                        <select
                          value={roomMax}
                          onChange={e => setRoomMax(Number(e.target.value))}
                          className="px-3 py-2 rounded-xl text-xs border border-[var(--glass-border)] text-[var(--foreground)] outline-none"
                          style={{ backgroundColor: 'var(--surface)', colorScheme: 'dark' }}
                        >
                          {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n} style={{ backgroundColor: 'var(--surface)', color: 'var(--foreground)' }}>{n} people</option>)}
                        </select>
                        <button
                          onClick={handleCreateRoom}
                          disabled={creating || !roomName.trim()}
                          className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40"
                        >
                          {creating ? 'Creating...' : 'Create Room'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* RECENT ACTIVITY */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2 mb-3">
                      <span className="w-1 h-4 rounded-full bg-violet-500" />
                      RECENT ACTIVITY
                    </h3>
                    {circleRooms.length > 0 ? (
                      <div className="space-y-2">
                        {circleRooms.slice(0, 5).map(room => (
                          <div key={room.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                            <div className={`w-8 h-8 rounded-full ${avatarColor(room.creatorName || 'U')} flex items-center justify-center text-white text-xs font-bold`}>
                              {(room.creatorName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-[var(--foreground)]">
                                <span className="font-bold">{room.creatorName || 'Someone'}</span> started a room — {room.name}
                              </p>
                            </div>
                            <span className="text-[10px] text-[var(--muted)]">{timeAgo(room.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                        <p className="text-xs text-[var(--muted)]">No recent activity yet. Start a room or invite friends!</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─── Members tab ─── */}
              {detailTab === 'members' && (
                <div>
                  {/* Dept stats */}
                  {myDept && (
                    <div className="rounded-2xl p-4 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🏛️</span>
                        <div>
                          <p className="text-sm font-bold text-[var(--foreground)]">Your department in Circles</p>
                          <p className="text-[10px] text-[var(--muted)]">How many {myDept} students are in each circle</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {circles.map(circle => {
                          // Count dept members in this circle (approximation from memberships)
                          const deptInCircle = memberships.filter(m => m.circleId === circle.id && m.userId != null && deptStudentIds.has(m.userId)).length;
                          const totalInCircle = memberCounts[circle.id] || 0;
                          const barWidth = totalInCircle > 0 ? Math.max(10, (deptInCircle / totalInCircle) * 100) : 10;
                          return (
                            <div key={circle.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ backgroundColor: circle.color + '20' }}>
                                {circle.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-[var(--foreground)]">{circle.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {deptInCircle} from your dept
                                  </span>
                                  <div className="flex-1 h-1 rounded-full bg-white/10 max-w-[80px]">
                                    <div className={`h-full rounded-full`} style={{ width: `${barWidth}%`, backgroundColor: circle.color }} />
                                  </div>
                                </div>
                              </div>
                              {isJoined(circle.id) ? (
                                <span className="text-[10px] font-bold text-emerald-400">Joined</span>
                              ) : (
                                <button onClick={() => handleToggle(circle.id)} className="text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--primary-light)]">Join →</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Member list */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2 mb-3">
                    <span className="w-1 h-4 rounded-full bg-amber-500" />
                    MEMBERS ({circleMembers.length})
                  </h3>
                  {circleMembers.length > 0 ? (
                    <div className="space-y-1">
                      {circleMembers.map(m => (
                        <div key={m.userId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--surface)] transition-all">
                          <div className={`w-8 h-8 rounded-full ${avatarColor(m.userName || 'U')} flex items-center justify-center text-white text-xs font-bold`}>
                            {(m.userName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-[var(--foreground)]">{m.userName || 'Student'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                      <p className="text-xs text-[var(--muted)]">No members to show</p>
                    </div>
                  )}
                </div>
              )}
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
