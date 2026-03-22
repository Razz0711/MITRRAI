// ============================================
// MitrRAI - Friends & Ratings Page
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Friendship, FriendRequest, BuddyRating, UserStatus, StudentProfile } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Search, X, UserPlus } from 'lucide-react';

const AVATAR_COLORS = [
  'from-violet-600 to-purple-700','from-emerald-600 to-teal-700','from-blue-600 to-indigo-700','from-pink-600 to-rose-700',
  'from-amber-600 to-orange-700','from-cyan-600 to-sky-700','from-indigo-600 to-violet-700','from-rose-600 to-pink-700',
];
function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function FriendsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { play: playSound } = useNotificationSound();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [ratingsReceived, setRatingsReceived] = useState<BuddyRating[]>([]);
  const [ratingsGiven, setRatingsGiven] = useState<BuddyRating[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'ratings'>('friends');
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Find People panel
  const [showSearch, setShowSearch] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [allPeople, setAllPeople] = useState<StudentProfile[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [myProfile, setMyProfile] = useState<StudentProfile | null>(null);
  const [pendingSentIds, setPendingSentIds] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setFriends(data.data.friends || []);
        const newPending: FriendRequest[] = data.data.pendingRequests || [];
        setPendingRequests(prev => {
          if (newPending.length > prev.length && prev.length > 0) playSound('important');
          return newPending;
        });
        setRatingsReceived(data.data.ratingsReceived || []);
        setRatingsGiven(data.data.ratingsGiven || []);
        setAvgRating(data.data.averageRating || 0);

        const friendsList: Friendship[] = data.data.friends || [];
        const ids = new Set<string>(friendsList.map(f => f.user1Id === user.id ? f.user2Id : f.user1Id));
        setFriendIds(ids);
        const sentIds = new Set<string>(
          (data.data.allRequests || [])
            .filter((r: FriendRequest) => r.fromUserId === user.id && r.status === 'pending')
            .map((r: FriendRequest) => r.toUserId)
        );
        setPendingSentIds(sentIds);

        if (friendsList.length > 0) {
          try {
            const statusRes = await fetch('/api/status');
            const statusData = await statusRes.json();
            if (statusData.success) {
              const statusMap: Record<string, UserStatus> = {};
              (statusData.data || []).forEach((s: UserStatus) => { statusMap[s.userId] = s; });
              setStatuses(statusMap);
            }
          } catch (err) { console.error('loadFriendStatuses:', err); }
        }
      }
    } catch (err) { console.error('loadFriendsData:', err); }
    setLoading(false);
  }, [playSound, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadAllPeople = useCallback(async () => {
    if (allPeople.length > 0) return; // already loaded
    setPeopleLoading(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        const all: StudentProfile[] = data.data;
        setAllPeople(all.filter(s => s.id !== user?.id));
        const mine = all.find(s => s.id === user?.id);
        if (mine) setMyProfile(mine);
      }
    } catch { /* ignore */ } finally { setPeopleLoading(false); }
  }, [allPeople.length, user?.id]);

  const openSearch = () => {
    setShowSearch(true);
    loadAllPeople();
  };

  const handlePeopleQueryChange = (q: string) => {
    setPeopleQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) return;
    // For name search, filter from allPeople client-side;
    // Also trigger server search for admission number matches
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (data.success) {
          const results: StudentProfile[] = data.data.filter((s: StudentProfile) => s.id !== user?.id);
          // Merge into allPeople (server may return admission-number matches not in local list)
          setAllPeople(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newOnes = results.filter(r => !existingIds.has(r.id));
            return [...prev, ...newOnes];
          });
        }
      } catch { /* ignore */ }
    }, 400);
  };

  // Sort people by closeness to current user
  const getSortedPeople = (): { label: string; items: StudentProfile[] }[] => {
    const q = peopleQuery.trim().toLowerCase();
    let pool = allPeople;

    if (q) {
      pool = allPeople.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.department || '').toLowerCase().includes(q) ||
        (s.yearLevel || '').toLowerCase().includes(q)
      );
    }

    const myDept = myProfile?.department || '';
    const myYear = myProfile?.yearLevel || '';

    const g0: StudentProfile[] = []; // same dept + year
    const g1: StudentProfile[] = []; // same dept
    const g2: StudentProfile[] = []; // same year
    const g3: StudentProfile[] = []; // others

    for (const s of pool) {
      const sameDept = myDept && s.department === myDept;
      const sameYear = myYear && s.yearLevel === myYear;
      if (sameDept && sameYear) g0.push(s);
      else if (sameDept) g1.push(s);
      else if (sameYear) g2.push(s);
      else g3.push(s);
    }

    const groups: { label: string; items: StudentProfile[] }[] = [];
    if (g0.length) groups.push({ label: 'Same branch & year', items: g0 });
    if (g1.length) groups.push({ label: 'Same branch', items: g1 });
    if (g2.length) groups.push({ label: 'Same year', items: g2 });
    if (g3.length) groups.push({ label: 'Other students', items: g3 });
    return groups;
  };

  const handleSendRequest = async (studentId: string, studentName: string) => {
    if (!user) return;
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_request', fromUserId: user.id, fromUserName: user.name,
          toUserId: studentId, toUserName: studentName,
        }),
      });
      setPendingSentIds(prev => { const next = new Set(Array.from(prev)); next.add(studentId); return next; });
    } catch (err) { console.error('sendRequest:', err); }
  };

  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      });
      loadData();
    } catch (err) { console.error('respondFriendReq:', err); }
  };

  const handleRemoveFriend = async (friendUserId: string) => {
    if (!user) return;
    if (!confirm('Remove this friend? This action cannot be undone.')) return;
    try {
      await fetch('/api/friends', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId1: user.id, userId2: friendUserId }),
      });
      loadData();
    } catch (err) { console.error('removeFriend:', err); }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <LoadingSkeleton type="cards" count={4} label="Loading friends..." />
      </div>
    );
  }

  const sortedGroups = showSearch ? getSortedPeople() : [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">
            <span className="gradient-text">Friends & Ratings</span>
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">Your study buddies network</p>
        </div>
        <button
          onClick={openSearch}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/25 transition-all"
        >
          <UserPlus size={13} />
          Find People
        </button>
      </div>

      {/* ─── Find People Panel ─── */}
      {showSearch && (
        <div className="mb-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)]">
            <p className="text-sm font-bold text-[var(--foreground)]">Find People</p>
            <button onClick={() => { setShowSearch(false); setPeopleQuery(''); }} className="text-[var(--muted)] hover:text-[var(--foreground)]">
              <X size={16} />
            </button>
          </div>

          {/* Search input */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-[var(--muted)] pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={peopleQuery}
                onChange={e => handlePeopleQueryChange(e.target.value)}
                placeholder="Search by name, branch, or admission number…"
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/5 border border-[var(--glass-border)] text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)]/40 transition-colors"
              />
              {peopleQuery && (
                <button onClick={() => setPeopleQuery('')} className="absolute right-2.5 text-[var(--muted)] hover:text-[var(--foreground)]">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
            {peopleLoading && (
              <p className="text-xs text-[var(--muted)] text-center py-6">Loading students…</p>
            )}

            {!peopleLoading && sortedGroups.length === 0 && (
              <p className="text-xs text-[var(--muted)] text-center py-6">
                {peopleQuery ? 'No students found' : 'No other students registered yet'}
              </p>
            )}

            {!peopleLoading && sortedGroups.map(group => (
              <div key={group.label} className="mb-4">
                {/* Group label */}
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-2 flex items-center gap-1.5">
                  <span className={`w-1 h-3 rounded-full ${
                    group.label === 'Same branch & year' ? 'bg-violet-500' :
                    group.label === 'Same branch' ? 'bg-emerald-500' :
                    group.label === 'Same year' ? 'bg-amber-500' : 'bg-[var(--muted)]'
                  }`} />
                  {group.label}
                  <span className="ml-auto text-[var(--muted)] font-normal normal-case tracking-normal">{group.items.length}</span>
                </p>

                <div className="space-y-2">
                  {group.items.map(s => {
                    const isFriend = friendIds.has(s.id);
                    const isPending = pendingSentIds.has(s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-[var(--glass-border)] hover:bg-white/5 transition-colors">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(s.name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--foreground)] truncate">{s.name}</p>
                          <p className="text-[10px] text-[var(--muted)] truncate">
                            {[s.department, s.yearLevel].filter(Boolean).join(' · ') || 'SVNIT'}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {isFriend ? (
                            <button
                              onClick={() => router.push(`/chat?friendId=${encodeURIComponent(s.id)}&friendName=${encodeURIComponent(s.name)}`)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-all"
                            >
                              💬 Chat
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(s.id, s.name)}
                              disabled={isPending}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 disabled:opacity-50 transition-all"
                            >
                              {isPending ? '✓ Sent' : '+ Connect'}
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/chat?friendId=${encodeURIComponent(s.id)}&friendName=${encodeURIComponent(s.name)}`)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-all"
                          >
                            Ping
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-[var(--surface)]">
        {[
          { key: 'friends' as const, label: 'Friends', count: friends.length },
          { key: 'requests' as const, label: 'Requests', count: pendingRequests.length },
          { key: 'ratings' as const, label: 'Ratings', count: ratingsReceived.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--primary)]/20 text-[var(--primary-light)]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="space-y-3">
          {friends.length > 0 && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="input-field pl-8 text-xs py-2"
              />
            </div>
          )}
          {friends.length === 0 ? (
            <div className="text-center py-12 card">
              <span className="text-4xl mb-3 block">👥</span>
              <h3 className="text-sm font-semibold mb-1">No friends yet</h3>
              <p className="text-xs text-[var(--muted)] mb-4">Find study buddies and send them friend requests!</p>
              <button onClick={openSearch} className="btn-primary text-xs">
                Find People
              </button>
            </div>
          ) : (
            friends.filter((f) => {
              const friendName = f.user1Id === user?.id ? f.user2Name : f.user1Name;
              return friendName.toLowerCase().includes(searchQuery.toLowerCase());
            }).length === 0 ? (
              <div className="text-center py-8 card">
                <p className="text-xs text-[var(--muted)]">No friends match &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
            friends.filter((f) => {
              const friendName = f.user1Id === user?.id ? f.user2Name : f.user1Name;
              return friendName.toLowerCase().includes(searchQuery.toLowerCase());
            }).map((f) => {
              const friendName = f.user1Id === user?.id ? f.user2Name : f.user1Name;
              const friendId = f.user1Id === user?.id ? f.user2Id : f.user1Id;
              const friendStatus = statuses[friendId];
              const isOnline = friendStatus?.status === 'online' || friendStatus?.status === 'in-session';
              return (
                <div key={f.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/25 flex items-center justify-center text-sm font-bold text-[var(--primary-light)]">
                        {friendName.charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--background)] ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{friendName}</p>
                      <p className="text-[10px] text-[var(--muted)]">
                        {isOnline ? (friendStatus?.status === 'in-session' ? '📖 In study session' : '🟢 Online now') : `Friends since ${new Date(f.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/chat?friendId=${encodeURIComponent(friendId)}&friendName=${encodeURIComponent(friendName)}`}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-all"
                    >
                      💬
                    </Link>
                    <button
                      onClick={() => handleRemoveFriend(friendId)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          ))}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 card">
              <span className="text-4xl mb-3 block">📬</span>
              <h3 className="text-sm font-semibold mb-1">No pending requests</h3>
              <p className="text-xs text-[var(--muted)]">Friend requests from other students will appear here</p>
            </div>
          ) : (
            pendingRequests.map((r) => (
              <div key={r.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-sm font-bold text-amber-400">
                    {r.fromUserName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{r.fromUserName}</p>
                    <p className="text-[10px] text-[var(--muted)]">
                      Sent {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRespondRequest(r.id, 'accepted')}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-all"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => handleRespondRequest(r.id, 'declined')}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Ratings Tab */}
      {activeTab === 'ratings' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wide">
              Ratings Received ({ratingsReceived.length})
            </h3>
            {ratingsReceived.length === 0 ? (
              <div className="text-center py-8 card">
                <span className="text-3xl mb-2 block">⭐</span>
                <p className="text-xs text-[var(--muted)]">No ratings yet. Study with buddies and they can rate you!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ratingsReceived.map((r) => (
                  <RatingCard key={r.id} rating={r} showFrom />
                ))}
              </div>
            )}
          </div>

          {ratingsGiven.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wide">
                Ratings Given ({ratingsGiven.length})
              </h3>
              <div className="space-y-2">
                {ratingsGiven.map((r) => (
                  <RatingCard key={r.id} rating={r} showFrom={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RatingCard({ rating, showFrom }: { rating: BuddyRating; showFrom: boolean }) {
  const ratingColor = rating.rating >= 8 ? 'text-green-400' : rating.rating >= 5 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="card p-3 flex items-start gap-3">
      <div className={`text-xl font-bold ${ratingColor} min-w-[2rem] text-center`}>
        {rating.rating}
        <p className="text-[8px] text-[var(--muted)] font-normal">/10</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold">
            {showFrom ? `From ${rating.fromUserName}` : `To ${rating.toUserName}`}
          </p>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`w-1 h-2 rounded-sm ${i < rating.rating ? 'bg-[var(--primary)]' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>
        {rating.review && (
          <p className="text-[11px] text-[var(--muted)] mt-1 italic">&quot;{rating.review}&quot;</p>
        )}
        <p className="text-[9px] text-[var(--muted)] mt-1">
          {new Date(rating.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
