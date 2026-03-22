// ============================================
// MitrRAI - Study Rooms Page (Redesigned)
// Clean UI with CSS variables, inline create
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';


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
  durationMinutes: number;
  expiresAt: string;
}

interface Circle {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export default function RoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [myRooms, setMyRooms] = useState<StudyRoom[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  // Create form
  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomMax, setRoomMax] = useState(5);
  const [roomDuration, setRoomDuration] = useState(60);
  const [roomCircle, setRoomCircle] = useState('');
  const [creating, setCreating] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    try {
      const [allRes, myRes, circlesRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch(`/api/rooms?filter=mine&userId=${user.id}`),
        fetch(`/api/circles?userId=${user.id}`),
      ]);
      const allData = await allRes.json();
      const myData = await myRes.json();
      const circlesData = await circlesRes.json();
      if (allData.success) setRooms(allData.data.rooms || []);
      if (myData.success) setMyRooms(myData.data.rooms || []);
      if (circlesData.success) setCircles(circlesData.data.circles || []);
    } catch (err) {
      console.error('loadRooms:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreate = async () => {
    if (!user || !roomName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName,
          topic: roomTopic,
          description: roomDesc,
          creatorId: user.id,
          creatorName: user.email?.split('@')[0] || 'Student',
          maxMembers: roomMax,
          durationMinutes: roomDuration,
          circleId: roomCircle || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setRoomName('');
        setRoomTopic('');
        setRoomDesc('');
        setRoomMax(5);
        setRoomDuration(60);
        setRoomCircle('');
        await loadRooms();
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

  const timeLeft = (expiresAt: string): { label: string; urgent: boolean } => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { label: 'Expired', urgent: true };
    const mins = Math.floor(diff / 60000);
    if (mins < 5) return { label: `${mins}m left`, urgent: true };
    if (mins < 60) return { label: `${mins}m left`, urgent: false };
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return { label: rem > 0 ? `${hrs}h ${rem}m left` : `${hrs}h left`, urgent: false };
  };

  const DURATION_OPTIONS = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
  ];

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={4} label="Loading rooms..." />
      </div>
    );
  }

  const now = Date.now();
  const isExpired = (room: StudyRoom) => room.expiresAt && new Date(room.expiresAt).getTime() < now;
  const displayRooms = (tab === 'mine' ? myRooms : rooms).filter(r => !isExpired(r));

  return (
    <div className="min-h-screen">
      <div className="flex-1 overflow-y-auto">
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold mb-1">
          <span className="gradient-text">Study Rooms</span> 📚
        </h1>
        <p className="text-xs text-[var(--muted)]">
          Collaborate in small groups • {rooms.length} rooms active
        </p>
      </div>

      {/* Create CTA / Inline Form */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full card p-4 text-left hover:border-[var(--primary)]/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center text-lg">
              ➕
            </div>
            <span className="text-sm text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
              Create a new study room...
            </span>
          </div>
        </button>
      ) : (
        <div className="card p-5 border-[var(--primary)]/30 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">📚 New Room</span>
            <button onClick={() => setShowCreate(false)} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">✕ Cancel</button>
          </div>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room name (e.g., DSA Practice)"
            className="input-field text-xs"
            autoFocus
          />
          <input
            value={roomTopic}
            onChange={(e) => setRoomTopic(e.target.value)}
            placeholder="Topic (e.g., Arrays & Linked Lists)"
            className="input-field text-xs"
          />
          <textarea
            value={roomDesc}
            onChange={(e) => setRoomDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="input-field text-xs resize-none"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Max Members</label>
              <select
                value={roomMax}
                onChange={(e) => setRoomMax(Number(e.target.value))}
                className="input-field text-xs"
              >
                {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>{n} people</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Duration ⏱</label>
              <select
                value={roomDuration}
                onChange={(e) => setRoomDuration(Number(e.target.value))}
                className="input-field text-xs"
              >
                {DURATION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1">
            <label className="label">Circle (optional)</label>
            <select
              value={roomCircle}
              onChange={(e) => setRoomCircle(e.target.value)}
              className="input-field text-xs"
            >
              <option value="">None</option>
              {circles.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !roomName.trim()}
            className="btn-primary w-full text-xs"
          >
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface)]">
        {[
          { key: 'all' as const, label: 'All Rooms', count: rooms.length },
          { key: 'mine' as const, label: 'My Rooms', count: myRooms.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.key
                ? 'bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Room List */}
      {displayRooms.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="text-3xl mb-2 block">📂</span>
          <p className="text-sm font-medium mb-1">No rooms yet</p>
          <p className="text-xs text-[var(--muted)]">Be the first to create one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayRooms.map((room) => (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className="card p-4 block hover:border-[var(--primary)]/40 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-sm shrink-0">
                    📚
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold truncate">{room.name}</h3>
                    {room.topic && (
                      <p className="text-[10px] text-[var(--primary-light)] truncate">📋 {room.topic}</p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                    room.status === 'active'
                      ? 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/25'
                      : 'bg-[var(--surface-light)] text-[var(--muted)]'
                  }`}
                >
                  {room.status === 'active' ? '● Active' : room.status}
                </span>
              </div>
              {room.description && (
                <p className="text-xs text-[var(--muted)] mb-2 line-clamp-2">{room.description}</p>
              )}
              <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                <span>👥 Max {room.maxMembers}</span>
                <div className="flex items-center gap-2">
                  {room.expiresAt && (() => {
                    const { label, urgent } = timeLeft(room.expiresAt);
                    return (
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold ${urgent ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        ⏱ {label}
                      </span>
                    );
                  })()}
                  <span>{timeAgo(room.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
    </div>
    </div>
  );
}
