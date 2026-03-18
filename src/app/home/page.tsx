// ============================================
// MitrrAi - Campus Feed (Home Page)
// Compose bar, tag picker, feed, filter sheet
// Zero seeded data — all from campus_posts table
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  Bell, Send, X, Filter, Trash2, Flag, MoreHorizontal,
  MapPin, BookOpen, Dumbbell, Music, Utensils, MessageCircle,
  Trophy, Heart, Coffee, AlertTriangle, Sparkles, Users, ChevronDown,
} from 'lucide-react';

/* ─── constants ─── */
const CATEGORIES = [
  { id: 'study', label: 'Study', emoji: '📚', sub: ['DSA', 'Math', 'Physics', 'Coding', 'Exam prep', 'Project', 'Other'] },
  { id: 'sports', label: 'Sports', emoji: '🏏', sub: ['Cricket', 'Football', 'BGMI', 'Chess', 'Badminton', 'Other'] },
  { id: 'hangout', label: 'Hangout', emoji: '☕', sub: ['Chai', 'Walk', 'Movie', 'Just chill', 'Roam campus', 'Other'] },
  { id: 'food', label: 'Food', emoji: '🍕', sub: ['Canteen', 'Food run', 'Maggi', 'Mess', 'Order food', 'Other'] },
  { id: 'creative', label: 'Creative', emoji: '🎨', sub: ['Music jam', 'Drawing', 'Photography', 'Video editing', 'Writing', 'Other'] },
  { id: 'fitness', label: 'Fitness', emoji: '💪', sub: ['Gym', 'Running', 'Yoga', 'Evening walk', 'Cycling', 'Other'] },
  { id: 'talk', label: 'Talk', emoji: '💬', sub: ['Vent out', 'Advice needed', 'Placement talk', 'Just listen', 'Other'] },
  { id: 'sos', label: 'SOS', emoji: '🆘', sub: [] },
];

const LOCATIONS = ['Anywhere', 'Library', 'Canteen', 'Hostel', 'Ground', 'Dept'];
const DISTANCES = ['Any', 'Nearby · 200m', '500m', 'Campus'];

const KNOWN_PLACES: { name: string; lat: number; lng: number }[] = [
  { name: 'Library', lat: 21.1627, lng: 72.7871 },
  { name: 'Canteen', lat: 21.1631, lng: 72.7865 },
  { name: 'Hostel', lat: 21.1622, lng: 72.7880 },
  { name: 'Ground', lat: 21.1635, lng: 72.7858 },
  { name: 'Dept', lat: 21.1625, lng: 72.7875 },
];

interface FeedPost {
  id: string;
  userId: string;
  content: string;
  category: string;
  subcategory: string | null;
  location: string;
  lat: number | null;
  lng: number | null;
  isAnonymous: boolean;
  createdAt: string;
  userName?: string;
  userPhotoUrl?: string;
  reactions?: { imin: number; reply: number; connect: number };
  myReactions?: string[];
}

/* ─── helpers ─── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getFreshness(dateStr: string): 'fresh' | 'active' | 'older' {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 15 * 60 * 1000) return 'fresh';
  if (diff < 2 * 60 * 60 * 1000) return 'active';
  return 'older';
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `~${Math.round(meters)}m`;
  return `~${(meters / 1000).toFixed(1)}km`;
}

function nearestPlace(lat: number, lng: number): string {
  let closest = 'Campus';
  let minDist = Infinity;
  for (const p of KNOWN_PLACES) {
    const d = haversineDistance(lat, lng, p.lat, p.lng);
    if (d < minDist) { minDist = d; closest = p.name; }
  }
  return minDist < 300 ? closest : 'Campus';
}

/* ─── main component ─── */
export default function CampusFeedPage() {
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [studentPhoto, setStudentPhoto] = useState('');

  // Compose state
  const [composeText, setComposeText] = useState('');
  const [composeAnon, setComposeAnon] = useState(false);
  const [composeCat, setComposeCat] = useState('');
  const [composeSub, setComposeSub] = useState('');
  const [showTagSheet, setShowTagSheet] = useState(false);
  const [posting, setPosting] = useState(false);

  // Location
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState('Campus');

  // Filters (viewer side)
  const [filterCat, setFilterCat] = useState('all');
  const [filterLoc, setFilterLoc] = useState('anywhere');
  const [filterDist, setFilterDist] = useState('any');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [tempFilterCat, setTempFilterCat] = useState('all');
  const [tempFilterLoc, setTempFilterLoc] = useState('anywhere');
  const [tempFilterDist, setTempFilterDist] = useState('any');

  // Post actions
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setUserLocation(nearestPlace(pos.coords.latitude, pos.coords.longitude));
        },
        () => { setUserLocation('Campus'); }
      );
    }
  }, []);

  // Fetch student info from profiles table
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/students?id=${encodeURIComponent(user.id)}`);
        const d = await res.json();
        if (d.success && d.data) {
          const name = d.data.name || d.data.fullName || d.data.full_name || user.name || '';
          setStudentName(name);
          setStudentPhoto(d.data.photoUrl || d.data.photo_url || d.data.avatarUrl || d.data.avatar_url || '');
        } else {
          // Fallback to user object
          setStudentName(user.name || user.email?.split('@')[0] || '');
        }
      } catch {
        setStudentName(user.name || user.email?.split('@')[0] || '');
      }
    };
    fetchProfile();
  }, [user]);

  // Fetch feed
  const fetchFeed = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCat !== 'all') params.set('category', filterCat);
      if (filterLoc !== 'anywhere') params.set('location', filterLoc);
      params.set('limit', '50');
      const res = await fetch(`/api/feed?${params}`);
      const d = await res.json();
      if (d.success) {
        setPosts(d.data.posts || []);
        setTotalPosts(d.data.total || 0);
      }
    } catch (e) { console.error('fetchFeed:', e); }
    setLoading(false);
  }, [filterCat, filterLoc]);

  useEffect(() => { if (user) fetchFeed(); }, [user, fetchFeed]);

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Post action
  const handlePost = async () => {
    if (!composeText.trim() || !composeCat || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: composeText.trim(),
          category: composeCat,
          subcategory: composeSub || null,
          location: userLocation,
          lat: userLat,
          lng: userLng,
          isAnonymous: composeAnon,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setComposeText('');
        setComposeCat('');
        setComposeSub('');
        setComposeAnon(false);
        fetchFeed();
      }
    } catch (e) { console.error('handlePost:', e); }
    setPosting(false);
  };

  // React
  const handleReact = async (postId: string, type: string) => {
    try {
      const res = await fetch(`/api/feed/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'react', type }),
      });
      const d = await res.json();
      if (d.success) {
        setPosts(prev => prev.map(p => {
          if (p.id !== postId) return p;
          return {
            ...p,
            reactions: d.counts,
            myReactions: d.active
              ? [...(p.myReactions || []), type]
              : (p.myReactions || []).filter((r: string) => r !== type),
          };
        }));
      }
    } catch (e) { console.error('handleReact:', e); }
  };

  // Delete
  const handleDelete = async (postId: string) => {
    try {
      const res = await fetch(`/api/feed/${postId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        setDeleteConfirm(null);
        setMenuPostId(null);
      }
    } catch (e) { console.error('handleDelete:', e); }
  };

  // Apply filters
  const applyFilters = () => {
    setFilterCat(tempFilterCat);
    setFilterLoc(tempFilterLoc);
    setFilterDist(tempFilterDist);
    setShowFilterSheet(false);
  };

  const resetFilters = () => {
    setTempFilterCat('all');
    setTempFilterLoc('anywhere');
    setTempFilterDist('any');
  };

  const activeFilterCount = [filterCat !== 'all', filterLoc !== 'anywhere', filterDist !== 'any'].filter(Boolean).length;

  // Group posts
  const groupPosts = (posts: FeedPost[]) => {
    // SOS always at top
    const sos = posts.filter(p => p.category === 'sos');
    const rest = posts.filter(p => p.category !== 'sos');

    const fresh = rest.filter(p => getFreshness(p.createdAt) === 'fresh');
    const active = rest.filter(p => getFreshness(p.createdAt) === 'active');
    const older = rest.filter(p => getFreshness(p.createdAt) === 'older');

    // Distance filter client-side
    const filterByDist = (arr: FeedPost[]) => {
      if (filterDist === 'any' || !userLat || !userLng) return arr;
      const maxDist = filterDist === 'Nearby · 200m' ? 200 : filterDist === '500m' ? 500 : 5000;
      return arr.filter(p => {
        if (!p.lat || !p.lng) return true; // no location = show anyway
        return haversineDistance(userLat, userLng, p.lat, p.lng) <= maxDist;
      });
    };

    return {
      sos: filterByDist(sos),
      fresh: filterByDist(fresh),
      active: filterByDist(active),
      older: filterByDist(older),
    };
  };

  const grouped = groupPosts(posts);
  const todayCount = posts.filter(p => {
    const d = new Date(p.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const initial = studentName ? studentName.charAt(0).toUpperCase() : '?';
  const catInfo = CATEGORIES.find(c => c.id === composeCat);

  if (!user) return null;

  return (
    <div className="min-h-screen pb-4">
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-40 px-4 py-3" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/me" className="shrink-0">
            {studentPhoto ? (
              <Image src={studentPhoto} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover border-2 border-[var(--primary)]/30" unoptimized onError={() => setStudentPhoto('')} />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-sm font-bold">
                {initial}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[var(--muted)] leading-none">{getGreeting()}, {studentName.split(' ')[0] || 'there'}!</p>
            <h1 className="text-base font-bold text-[var(--foreground)] leading-tight">Campus Feed</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {userLocation}
            </span>
            <Link href="/notifications" className="p-2 rounded-xl hover:bg-[var(--surface-light)] text-[var(--muted)] transition-colors">
              <Bell size={18} />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4" ref={feedRef}>
        {/* ─── Compose Bar ─── */}
        <div className="card p-3 space-y-2.5">
          {/* Line 1: Input + Anon Toggle */}
          <div className="flex items-center gap-2.5">
            <input
              type="text"
              value={composeText}
              onChange={e => setComposeText(e.target.value.slice(0, 280))}
              placeholder="What do you want to do?"
              className="flex-1 bg-[var(--surface)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors"
            />
            <button
              onClick={() => setComposeAnon(!composeAnon)}
              className="shrink-0 flex items-center gap-1.5"
              title={composeAnon ? 'Posting anonymously' : 'Post with name'}
            >
              <span className="text-[9px] font-medium text-[var(--muted)]">Anon</span>
              <div className={`relative w-9 h-5 rounded-full transition-all duration-300 ${composeAnon ? 'bg-purple-500' : 'bg-zinc-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${composeAnon ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
            </button>
          </div>

          {/* Line 2: Location + Category + Post */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">
              <MapPin size={10} />
              {userLocation}
            </span>

            <button
              onClick={() => setShowTagSheet(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${composeCat ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'}`}
            >
              {composeCat ? (
                <>{catInfo?.emoji} {catInfo?.label}{composeSub ? ` · ${composeSub}` : ''}</>
              ) : (
                <><ChevronDown size={10} /> Tag post</>
              )}
            </button>

            <div className="flex-1" />

            <button
              onClick={handlePost}
              disabled={!composeText.trim() || !composeCat || posting}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-green-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-green-600 shadow-lg shadow-green-500/20"
            >
              {posting ? '...' : 'Post'}
            </button>
          </div>

          {composeText.length > 0 && (
            <div className="text-right text-[9px] text-[var(--muted)]">{composeText.length}/280</div>
          )}
        </div>

        {/* ─── Feed Toolbar ─── */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">{todayCount}</span> posts today
          </span>
          <button
            onClick={() => {
              setTempFilterCat(filterCat);
              setTempFilterLoc(filterLoc);
              setTempFilterDist(filterDist);
              setShowFilterSheet(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors relative"
          >
            <Filter size={12} />
            Filter
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-purple-500 text-white text-[8px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {filterCat !== 'all' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-400">
                {CATEGORIES.find(c => c.id === filterCat)?.emoji} {filterCat}
                <button onClick={() => setFilterCat('all')} className="hover:text-white"><X size={10} /></button>
              </span>
            )}
            {filterLoc !== 'anywhere' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/15 text-green-400">
                📍 {filterLoc}
                <button onClick={() => setFilterLoc('anywhere')} className="hover:text-white"><X size={10} /></button>
              </span>
            )}
            {filterDist !== 'any' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400">
                📏 {filterDist}
                <button onClick={() => setFilterDist('any')} className="hover:text-white"><X size={10} /></button>
              </span>
            )}
          </div>
        )}

        {/* ─── Loading ─── */}
        {loading && <LoadingSkeleton />}

        {/* ─── Empty State ─── */}
        {!loading && posts.length === 0 && (
          <div className="card p-8 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
              <MessageCircle size={28} className="text-[var(--primary)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">No posts yet</h3>
            <p className="text-sm text-[var(--muted)]">Be the first to post! Tag your activity and find people nearby.</p>
          </div>
        )}

        {/* ─── SOS Posts (always top) ─── */}
        {grouped.sos.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-400 px-1">🆘 SOS</h3>
            {grouped.sos.map(post => <PostCard key={post.id} post={post} userLat={userLat} userLng={userLng} userId={user?.id || ''} onReact={handleReact} menuPostId={menuPostId} setMenuPostId={setMenuPostId} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={handleDelete} isSos />)}
          </div>
        )}

        {/* ─── Fresh Posts ─── */}
        {grouped.fresh.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-green-400 px-1">| FRESH</h3>
            {grouped.fresh.map(post => <PostCard key={post.id} post={post} userLat={userLat} userLng={userLng} userId={user?.id || ''} onReact={handleReact} menuPostId={menuPostId} setMenuPostId={setMenuPostId} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={handleDelete} />)}
          </div>
        )}

        {/* ─── Active Posts ─── */}
        {grouped.active.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] px-1">| ACTIVE</h3>
            {grouped.active.map(post => <PostCard key={post.id} post={post} userLat={userLat} userLng={userLng} userId={user?.id || ''} onReact={handleReact} menuPostId={menuPostId} setMenuPostId={setMenuPostId} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={handleDelete} />)}
          </div>
        )}

        {/* ─── Older Posts ─── */}
        {grouped.older.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] opacity-60 px-1">| OLDER</h3>
            {grouped.older.map(post => <PostCard key={post.id} post={post} userLat={userLat} userLng={userLng} userId={user?.id || ''} onReact={handleReact} menuPostId={menuPostId} setMenuPostId={setMenuPostId} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={handleDelete} isOlder />)}
          </div>
        )}
      </div>

      {/* ═══ Tag Post Sheet (purple theme) ═══ */}
      {showTagSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowTagSheet(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8 space-y-5 slide-up"
            style={{ background: 'var(--surface-solid)', borderTop: '2px solid rgba(168,85,247,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">Tag your post</h3>
              <p className="text-xs text-[var(--muted)]">Select category — helps others find your post</p>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-4 gap-2.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setComposeCat(cat.id); setComposeSub(''); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${composeCat === cat.id ? 'bg-purple-500/15 border-purple-500/40 shadow-lg shadow-purple-500/10' : 'bg-[var(--surface)] border-[var(--border)] hover:border-purple-500/20'}`}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-[10px] font-semibold text-[var(--foreground)]">{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Subcategory chips */}
            {composeCat && composeCat !== 'sos' && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">| WHAT SPECIFICALLY? ({CATEGORIES.find(c => c.id === composeCat)?.label.toUpperCase()})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.find(c => c.id === composeCat)?.sub.map(s => (
                    <button
                      key={s}
                      onClick={() => setComposeSub(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${composeSub === s ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:border-purple-500/30'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={() => { setComposeCat(''); setComposeSub(''); }}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] font-medium"
              >
                Reset
              </button>
              {composeCat === 'sos' ? (
                <button
                  onClick={() => setShowTagSheet(false)}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/30"
                >
                  🆘 Post as SOS — urgent!
                </button>
              ) : (
                <button
                  onClick={() => setShowTagSheet(false)}
                  disabled={!composeCat}
                  className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-bold disabled:opacity-40 shadow-lg shadow-purple-500/30"
                >
                  Done — tag as {catInfo?.label || ''}{composeSub ? ` · ${composeSub}` : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Filter Sheet (green theme) ═══ */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowFilterSheet(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8 space-y-5 slide-up"
            style={{ background: 'var(--surface-solid)', borderTop: '2px solid rgba(34,197,94,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">Filter Feed</h3>
              <p className="text-xs text-[var(--muted)]">Choose what you want to see</p>
            </div>

            {/* Category */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">| CATEGORY</h4>
              <div className="flex flex-wrap gap-1.5">
                {[{ id: 'all', label: 'All' }, ...CATEGORIES].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setTempFilterCat(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${tempFilterCat === cat.id ? (cat.id === 'sos' ? 'bg-red-500 text-white' : 'bg-green-500 text-white shadow-lg shadow-green-500/20') : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">| LOCATION</h4>
              <div className="flex flex-wrap gap-1.5">
                {LOCATIONS.map(loc => (
                  <button
                    key={loc}
                    onClick={() => setTempFilterLoc(loc.toLowerCase())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${tempFilterLoc === loc.toLowerCase() ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]'}`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">| DISTANCE</h4>
              <div className="flex flex-wrap gap-1.5">
                {DISTANCES.map(d => (
                  <button
                    key={d}
                    onClick={() => setTempFilterDist(d.toLowerCase())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${tempFilterDist === d.toLowerCase() ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5">
              <button onClick={resetFilters} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] font-medium">Reset</button>
              <button onClick={applyFilters} className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold shadow-lg shadow-green-500/30">Apply filters</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Delete Confirm ═══ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative card p-5 space-y-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[var(--foreground)]">Delete post?</h3>
            <p className="text-sm text-[var(--muted)]">This can&apos;t be undone.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)]">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Post Card Component ═══ */
function PostCard({
  post, userLat, userLng, userId, onReact, menuPostId, setMenuPostId, deleteConfirm, setDeleteConfirm, onDelete, isSos, isOlder
}: {
  post: FeedPost;
  userLat: number | null;
  userLng: number | null;
  userId: string;
  onReact: (postId: string, type: string) => void;
  menuPostId: string | null;
  setMenuPostId: (id: string | null) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  onDelete: (id: string) => void;
  isSos?: boolean;
  isOlder?: boolean;
}) {
  const freshness = getFreshness(post.createdAt);
  const isOwn = post.userId === userId;
  const distance = (userLat && userLng && post.lat && post.lng) ? haversineDistance(userLat, userLng, post.lat, post.lng) : null;
  const catInfo = CATEGORIES.find(c => c.id === post.category);
  const initial = post.userName ? post.userName.charAt(0).toUpperCase() : '?';

  return (
    <div
      className={`card p-3.5 space-y-2.5 transition-all ${isSos ? 'border-red-500/40 shadow-lg shadow-red-500/10' : freshness === 'fresh' ? 'border-green-500/20' : ''} ${isOlder ? 'opacity-65' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        {post.isAnonymous ? (
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Sparkles size={14} className="text-purple-400" />
          </div>
        ) : post.userPhotoUrl ? (
          <Image src={post.userPhotoUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">{initial}</div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-[var(--foreground)]">{post.userName || 'Anonymous'}</span>
          <div className="flex items-center gap-1.5 text-[9px] text-[var(--muted)]">
            {distance !== null && <span className="text-amber-400 font-medium">{formatDistance(distance)}</span>}
            <span>{timeAgo(post.createdAt)}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${isSos ? 'bg-red-500/20 text-red-400' : freshness === 'fresh' ? 'bg-green-500/20 text-green-400' : freshness === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--surface)] text-[var(--muted)]'}`}>
              {isSos ? 'SOS' : freshness}
            </span>
          </div>
        </div>
        <button
          onClick={() => setMenuPostId(menuPostId === post.id ? null : post.id)}
          className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--muted)] transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Menu dropdown */}
      {menuPostId === post.id && (
        <div className="flex gap-2 px-2">
          {isOwn && (
            <button onClick={() => { setDeleteConfirm(post.id); setMenuPostId(null); }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-medium">
              <Trash2 size={10} /> Delete
            </button>
          )}
          {!isOwn && (
            <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-medium">
              <Flag size={10} /> Report
            </button>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {catInfo && (
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${isSos ? 'bg-red-500/20 text-red-400' : 'bg-[var(--primary)]/10 text-[var(--primary-light)]'}`}>
            {catInfo.emoji} {catInfo.label}
          </span>
        )}
        {post.subcategory && (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]">
            {post.subcategory}
          </span>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-[var(--foreground)] leading-relaxed">{post.content}</p>

      {/* Engagement count */}
      {post.reactions && (post.reactions.imin > 0 || post.reactions.connect > 0) && (
        <p className="text-[9px] text-[var(--muted)]">
          {post.reactions.imin > 0 && `${post.reactions.imin} joined`}
          {post.reactions.imin > 0 && post.reactions.connect > 0 && ' · '}
          {post.reactions.connect > 0 && `${post.reactions.connect} connected`}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {(['imin', 'reply', 'connect'] as const).map(type => {
          const active = post.myReactions?.includes(type);
          const label = type === 'imin' ? "I'm in!" : type === 'reply' ? 'Reply' : 'Connect';
          return (
            <button
              key={type}
              onClick={() => onReact(post.id, type)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-semibold transition-all ${active
                ? type === 'imin' ? 'bg-green-500 text-white shadow-md shadow-green-500/20'
                  : type === 'reply' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--primary)]/30'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
