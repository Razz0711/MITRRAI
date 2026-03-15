'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabaseBrowser } from '@/lib/supabase-browser';

/* ─── Types ─── */
interface Ping {
  id: string;
  userId: string;
  userName: string;
  activityId: string;
  location: string;
  note: string;
  isAnonymous: boolean;
  isSOS: boolean;
  createdAt: string;
}

/* ─── Activities (4-col emoji grid) ─── */
const ACTIVITIES = [
  { id: 'dsa',      emoji: '💻', label: 'DSA' },
  { id: 'math',     emoji: '📐', label: 'Math' },
  { id: 'study',    emoji: '📗', label: 'Study' },
  { id: 'chai',     emoji: '☕', label: 'Chai' },
  { id: 'gaming',   emoji: '🎮', label: 'Gaming' },
  { id: 'food',     emoji: '🍔', label: 'Food Run' },
  { id: 'cricket',  emoji: '🏏', label: 'Cricket' },
  { id: 'other',    emoji: '✏️', label: 'Other...' },
];

/* ─── Locations ─── */
const LOCATIONS = [
  { id: 'library',    emoji: '📚', label: 'Library' },
  { id: 'canteen',    emoji: '🍽️', label: 'Canteen' },
  { id: 'hostel',     emoji: '🏠', label: 'Hostel' },
  { id: 'department', emoji: '🏛️', label: 'Dept' },
  { id: 'ground',     emoji: '⛳', label: 'Ground' },
  { id: 'gate',       emoji: '🚪', label: 'Gate' },
];

/* ─── Avatar color helper ─── */
const COLORS = ['bg-violet-600','bg-emerald-600','bg-blue-600','bg-pink-600','bg-amber-600','bg-cyan-600','bg-indigo-600','bg-rose-600'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function getActivity(id: string) {
  return ACTIVITIES.find(a => a.id === id) || { emoji: '📡', label: id };
}
function getLocation(id: string) {
  return LOCATIONS.find(l => l.id === id) || { emoji: '📍', label: id };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function timeLeft(dateStr: string) {
  const created = new Date(dateStr).getTime();
  const expiry = created + 2 * 60 * 60 * 1000;
  const remaining = expiry - Date.now();
  if (remaining <= 0) return 'Expired';
  const mins = Math.floor(remaining / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

/* ═══════════════════════════════════════════ */
/*  RADAR PAGE                                 */
/* ═══════════════════════════════════════════ */
export default function RadarPage() {
  const { user } = useAuth();
  const supabase = supabaseBrowser;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  const [pings, setPings] = useState<Ping[]>([]);
  const [myPing, setMyPing] = useState<Ping | null>(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [selectedActivity, setSelectedActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [note, setNote] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSOS, setIsSOS] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  /* ─── Load pings ─── */
  const loadPings = useCallback(async () => {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('radar_pings')
        .select('*')
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false });
      if (data) {
        const mapped: Ping[] = data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          userId: r.user_id as string,
          userName: r.user_name as string,
          activityId: r.activity_id as string,
          location: r.location as string,
          note: (r.note as string) || '',
          isAnonymous: r.is_anonymous as boolean,
          isSOS: ((r.note as string) || '').includes('[SOS]'),
          createdAt: r.created_at as string,
        }));
        setPings(mapped);
        if (user) {
          const mine = mapped.find(p => p.userId === user.id);
          setMyPing(mine || null);
        }
      }
    } catch (err) {
      console.error('loadPings:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    loadPings();
    const ch = supabase.channel('radar-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radar_pings' }, () => {
        loadPings();
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [supabase, loadPings]);

  /* ─── Go Live / Stop ─── */
  const goLive = async () => {
    if (!user || !selectedActivity || !selectedLocation) return;
    setBroadcasting(true);
    try {
      const actLabel = selectedActivity === 'other' ? (customActivity || 'Other') : getActivity(selectedActivity).label;
      const noteVal = isSOS ? `${note} [SOS]` : note;
      // Delete old ping first
      await supabase.from('radar_pings').delete().eq('user_id', user.id);
      await supabase.from('radar_pings').insert({
        user_id: user.id,
        user_name: user.name || 'Anonymous',
        activity_id: selectedActivity === 'other' ? customActivity : selectedActivity,
        location: selectedLocation,
        note: noteVal,
        is_anonymous: isAnonymous,
      });
      // Use actLabel to avoid lint
      console.log('Broadcast:', actLabel);
      await loadPings();
    } catch (err) {
      console.error('goLive:', err);
    } finally {
      setBroadcasting(false);
    }
  };

  const stopBroadcast = async () => {
    if (!user) return;
    await supabase.from('radar_pings').delete().eq('user_id', user.id);
    setMyPing(null);
    await loadPings();
  };

  /* ─── Derived data ─── */
  const otherPings = pings.filter(p => p.userId !== user?.id);
  const sosPings = otherPings.filter(p => p.isSOS);
  const feedPings = otherPings;
  const totalActive = pings.length;

  // Heatmap counts
  const locationCounts = LOCATIONS.map(loc => ({
    ...loc,
    count: pings.filter(p => p.location === loc.id).length,
  }));
  const maxCount = Math.max(...locationCounts.map(l => l.count), 1);

  const barColors = ['bg-green-500', 'bg-violet-500', 'bg-amber-500', 'bg-blue-500', 'bg-pink-500', 'bg-orange-500'];

  /* ═══════════════════════════════════════════ */
  /*  RENDER                                     */
  /* ═══════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center animate-pulse">
          <span className="w-3 h-3 rounded-full bg-[var(--primary)]" />
        </div>
        <p className="text-xs text-[var(--muted)]">Loading radar…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">

      {/* ─── Header ─── */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">Campus Radar</span>
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1">Who&apos;s active right now · Only SVNIT can see this</p>
      </div>

      {/* ─── Status Bar ─── */}
      {myPing ? (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">You&apos;re live on Radar</p>
              <p className="text-[10px] text-[var(--muted)]">
                {getActivity(myPing.activityId).label} · {getLocation(myPing.location).label} · expires in {timeLeft(myPing.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={stopBroadcast}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all"
          >
            Stop
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <p className="text-sm text-[var(--muted)]">You&apos;re not broadcasting</p>
          </div>
          <a href="#broadcast-form" className="px-4 py-2 rounded-xl text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-all">
            Go Live
          </a>
        </div>
      )}

      {/* ─── WHERE'S THE ACTION (Heatmap) ─── */}
      <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--foreground)] flex items-center gap-1.5">
            <span className="w-1 h-4 rounded-full bg-violet-500" />
            WHERE&apos;S THE ACTION
          </p>
          <span className="text-[10px] text-[var(--muted)]">{totalActive} active on campus</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {locationCounts.map((loc, i) => (
            <div key={loc.id} className="rounded-xl border border-[var(--glass-border)] bg-white/5 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{loc.emoji}</span>
                <span className="text-xs font-bold text-[var(--foreground)]">{loc.label}</span>
              </div>
              <p className="text-[10px] text-[var(--muted)] mb-1.5">{loc.count} active</p>
              <div className="w-full h-1 rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all`}
                  style={{ width: `${(loc.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Study SOS ─── */}
      {sosPings.length > 0 && sosPings.map(sos => (
        <div key={sos.id} className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 rounded-lg bg-red-500/20 text-xs font-bold text-red-400">SOS</span>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">Study SOS — Someone needs help!</p>
              <p className="text-[10px] text-[var(--muted)]">
                {sos.isAnonymous ? 'Anonymous' : sos.userName} · {getLocation(sos.location).label} · &ldquo;{sos.note.replace(' [SOS]', '')}&rdquo;
              </p>
            </div>
          </div>
          <button
            onClick={() => { /* ping them */ }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all shrink-0"
          >
            Help →
          </button>
        </div>
      ))}

      {/* ─── LIVE FEED ─── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--foreground)] flex items-center gap-1.5">
            <span className="w-1 h-4 rounded-full bg-emerald-500" />
            LIVE RIGHT NOW
          </p>
          <span className="text-[10px] text-[var(--muted)]">{feedPings.length} broadcasting</span>
        </div>

        {feedPings.length === 0 ? (
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-8 text-center">
            <p className="text-2xl mb-2">📡</p>
            <p className="text-sm font-bold text-[var(--foreground)]">Campus is quiet right now</p>
            <p className="text-xs text-[var(--muted)] mt-1">Be the first — others will join!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {feedPings.map(ping => {
              const act = getActivity(ping.activityId);
              const loc = getLocation(ping.location);
              const displayName = ping.isAnonymous ? 'Anonymous' : ping.userName;
              const noteText = ping.note?.replace(' [SOS]', '') || '';

              return (
                <div key={ping.id} className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-full ${avatarColor(displayName)} flex items-center justify-center text-white text-sm font-bold`}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--surface)]" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-[var(--foreground)]">{displayName}</span>
                          {ping.isAnonymous && (
                            <span className="text-[10px] text-[var(--muted)]">· will reveal on match</span>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            {act.emoji} {act.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-[var(--muted)] border border-white/10">
                            {loc.emoji} {loc.label}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-400">{timeAgo(ping.createdAt)}</span>
                        </div>

                        {noteText && (
                          <p className="text-xs italic text-[var(--muted)]">&ldquo;{noteText}&rdquo;</p>
                        )}
                      </div>
                    </div>

                    {/* Ping button */}
                    <button className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-all shrink-0">
                      👋 Ping
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── UPDATE YOUR BROADCAST (Form) ─── */}
      <div id="broadcast-form" className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--foreground)] flex items-center gap-1.5 mb-4">
          <span className="w-1 h-4 rounded-full bg-amber-500" />
          UPDATE YOUR BROADCAST
        </p>

        {/* Activity Grid (4 columns) */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {ACTIVITIES.map(act => (
            <button
              key={act.id}
              onClick={() => {
                setSelectedActivity(act.id);
                if (act.id !== 'other') setCustomActivity('');
              }}
              className={`rounded-xl p-3 text-center border transition-all ${
                selectedActivity === act.id
                  ? 'border-violet-500/50 bg-violet-500/15 text-violet-400'
                  : 'border-[var(--glass-border)] bg-white/5 text-[var(--muted)] hover:border-white/20'
              }`}
            >
              <span className="text-xl block mb-1">{act.emoji}</span>
              <span className="text-[10px] font-semibold">{act.label}</span>
            </button>
          ))}
        </div>

        {/* Custom activity input */}
        {selectedActivity === 'other' && (
          <input
            type="text"
            value={customActivity}
            onChange={e => setCustomActivity(e.target.value)}
            placeholder="What are you doing?"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white/5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] mb-4 outline-none focus:border-violet-500/50"
          />
        )}

        {/* Location chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {LOCATIONS.map(loc => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                selectedLocation === loc.id
                  ? 'border-violet-500/50 bg-violet-500/15 text-violet-400'
                  : 'border-[var(--glass-border)] bg-white/5 text-[var(--muted)] hover:border-white/20'
              }`}
            >
              <span>{loc.emoji}</span> {loc.label}
            </button>
          ))}
        </div>

        {/* Quick note */}
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Quick note (optional)"
          className="w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-white/5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] mb-4 outline-none focus:border-violet-500/50"
        />

        {/* Bottom row: anonymous + SOS + Go Live */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--glass-border)] accent-violet-500"
              />
              <span className="text-xs text-[var(--muted)]">Stay anonymous</span>
            </label>
            <button
              onClick={() => setIsSOS(!isSOS)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                isSOS
                  ? 'bg-red-500/15 text-red-400 border-red-500/25'
                  : 'bg-white/5 text-[var(--muted)] border-[var(--glass-border)] hover:border-red-500/25'
              }`}
            >
              🆘 SOS
            </button>
          </div>
          <button
            onClick={goLive}
            disabled={!selectedActivity || !selectedLocation || broadcasting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {broadcasting ? 'Going live…' : 'Go Live →'}
          </button>
        </div>

        <p className="text-[10px] text-[var(--muted)] text-center mt-3">
          Broadcasts expire automatically · Only your campus can see this
        </p>
      </div>
    </div>
  );
}
