'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  BirthdayInfo,
  FriendRequest,
  Friendship,
  MatchResult,
  StudentProfile,
  UserStatus,
} from '@/lib/types';
import { useAuth } from '@/lib/auth';

/* ─── Circle data (same as circles page) ─── */
const ALL_CIRCLES = [
  { id: 'coding', name: 'Coding', emoji: '💻' },
  { id: 'dsa', name: 'DSA', emoji: '🏗️' },
  { id: 'startup', name: 'Startup', emoji: '🚀' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮' },
  { id: 'music', name: 'Music', emoji: '🎵' },
  { id: 'fitness', name: 'Fitness', emoji: '💪' },
  { id: 'art', name: 'Art', emoji: '🎨' },
  { id: 'movies', name: 'Movies', emoji: '🎬' },
  { id: 'reading', name: 'Reading', emoji: '📚' },
  { id: 'photography', name: 'Photography', emoji: '📷' },
  { id: 'travel', name: 'Travel', emoji: '✈️' },
  { id: 'food', name: 'Food', emoji: '🍕' },
];

/* helper: avatar colour from name */
const AVATAR_COLORS = [
  'bg-violet-600','bg-emerald-600','bg-blue-600','bg-pink-600',
  'bg-amber-600','bg-cyan-600','bg-indigo-600','bg-rose-600',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* helper: generate deterministic "chips" for a match */
function getMatchChips(match: MatchResult, myStudent: StudentProfile | null): string[] {
  const chips: string[] = [];
  if (myStudent && match.student.department === myStudent.department && match.student.yearLevel === myStudent.yearLevel) {
    chips.push('Same branch + year');
  } else if (myStudent && match.student.department === myStudent.department) {
    chips.push('Same branch');
  } else if (myStudent && match.student.yearLevel === myStudent.yearLevel) {
    chips.push('Same year');
  }
  // night owl / early bird based on schedule
  if (match.student.availableTimes?.toLowerCase().includes('pm') || match.student.availableTimes?.toLowerCase().includes('night')) {
    chips.push('Night owl');
  }
  return chips;
}

/* helper: determine online/active status label */
function getStatusLabel(status?: UserStatus): string | null {
  if (!status) return null;
  if (status.status === 'online' || status.status === 'in-session') return 'Active today';
  return null;
}

export default function MatchesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [notice, setNotice] = useState('');
  const [hasAutoRun, setHasAutoRun] = useState(false);

  const [statusMap, setStatusMap] = useState<Record<string, UserStatus>>({});
  const [birthdayUserIds, setBirthdayUserIds] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingSentIds, setPendingSentIds] = useState<Set<string>>(new Set());

  // Circle memberships
  const [myCircleIds, setMyCircleIds] = useState<string[]>([]);
  const [matchCircleIds, setMatchCircleIds] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    loadStudents();
    loadStatuses();
    loadBirthdays();
    loadFriends();
    loadMyCircles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!selectedStudentId || hasAutoRun) return;
    setHasAutoRun(true);
    void findMatches(selectedStudentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, hasAutoRun]);

  const loadStatuses = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const map: Record<string, UserStatus> = {};
        data.data.forEach((status: UserStatus) => { map[status.userId] = status; });
        setStatusMap(map);
      }
    } catch (err) { console.error('loadStatuses:', err); }
  };

  const loadBirthdays = useCallback(async () => {
    try {
      const usersRaw = localStorage.getItem('mitrai_users') || '[]';
      const users = JSON.parse(usersRaw).map((entry: { id: string; name: string; department: string; dob: string; showBirthday?: boolean }) => ({
        id: entry.id, name: entry.name, department: entry.department || '', dob: entry.dob || '', showBirthday: entry.showBirthday !== false,
      }));
      const params = new URLSearchParams({ days: '3', users: encodeURIComponent(JSON.stringify(users)) });
      const res = await fetch(`/api/birthday?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        const ids = new Set<string>((data.data.birthdays || []).map((b: BirthdayInfo) => b.userId));
        setBirthdayUserIds(ids);
      }
    } catch (err) { console.error('loadBirthdays:', err); }
  }, []);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        const acceptedFriendIds = new Set<string>(
          (data.data.friends || []).map((f: Friendship) => f.user1Id === user.id ? f.user2Id : f.user1Id)
        );
        setFriendIds(acceptedFriendIds);
        const sentIds = new Set<string>(
          (data.data.allRequests || [])
            .filter((r: FriendRequest) => r.fromUserId === user.id && r.status === 'pending')
            .map((r: FriendRequest) => r.toUserId)
        );
        setPendingSentIds(sentIds);
      }
    } catch (err) { console.error('loadFriends:', err); }
  }, [user]);

  const loadMyCircles = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/circles?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setMyCircleIds((data.data.memberships || []).map((m: { circleId: string }) => m.circleId));
      }
    } catch (err) { console.error('loadMyCircles:', err); }
  };

  const loadMatchCircles = async (studentId: string) => {
    try {
      const res = await fetch(`/api/circles?userId=${studentId}`);
      const data = await res.json();
      if (data.success) {
        const ids = (data.data.memberships || []).map((m: { circleId: string }) => m.circleId);
        setMatchCircleIds(prev => ({ ...prev, [studentId]: ids }));
      }
    } catch (err) { console.error('loadMatchCircles:', err); }
  };

  const handleAddFriend = async (studentId: string, studentName: string) => {
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
      setNotice(`Friend request sent to ${studentName}.`);
    } catch (err) { console.error('addFriend:', err); }
  };

  const loadStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setAllStudents(data.data);
        const savedId = localStorage.getItem('mitrai_student_id');
        const preferredId = savedId || user?.id || '';
        const currentStudent = data.data.find((c: StudentProfile) => c.id === preferredId);
        if (currentStudent) setSelectedStudentId(currentStudent.id);
        else if (data.data.length > 0) setSelectedStudentId(data.data[0].id);
      }
    } catch (err) { console.error('Failed to load students:', err); }
  };

  const findMatches = async (studentIdOverride?: string) => {
    const studentId = studentIdOverride || selectedStudentId;
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (data.success) {
        setStudent(data.data.student);
        setMatches(data.data.matches);
        // load circles for each match
        for (const m of data.data.matches) {
          loadMatchCircles(m.student.id);
        }
      } else {
        setMatches([]);
      }
    } catch (err) {
      console.error('Match error:', err);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const activeStudent = student || allStudents.find(c => c.id === selectedStudentId) || null;
  const activeBranch = activeStudent?.department || user?.department || '';
  const deptCount = allStudents.filter(s => s.department === activeBranch && s.id !== selectedStudentId).length;
  const activeInDept = allStudents.filter(s => s.department === activeBranch && s.id !== selectedStudentId && statusMap[s.id]?.status === 'online').length;

  const sharedCircleCount = (matchId: string) => {
    const theirs = matchCircleIds[matchId] || [];
    return theirs.filter(c => myCircleIds.includes(c)).length;
  };

  /* ─── PROFILE OVERLAY ─── */
  const openProfile = (match: MatchResult) => {
    setSelectedMatch(match);
    loadMatchCircles(match.student.id);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
          <span className="text-[var(--primary)]">MitrAI</span>
          <span className="text-[var(--muted)]">·</span>
          <span>Matches</span>
        </h1>
        {matches.length > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            {matches.length} found
          </span>
        )}
      </div>

      {notice && (
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {notice}
        </div>
      )}

      {/* ─── Department Stats ─── */}
      {activeBranch && (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4 mb-6">
          <p className="text-xs font-bold text-yellow-400 mb-3 flex items-center gap-1.5">
            <span className="w-1 h-4 rounded-full bg-yellow-400" />
            Your Department — {activeBranch}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">{deptCount}</p>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">In your dept</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{activeInDept}</p>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">Active</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center animate-pulse">
            <span className="w-3 h-3 rounded-full bg-[var(--primary)]" />
          </div>
          <p className="text-xs text-[var(--muted)]">Finding matches…</p>
        </div>
      )}

      {/* ─── TOP MATCHES ─── */}
      {!loading && matches.length > 0 && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] mb-3 flex items-center gap-1.5">
            <span className="w-1 h-4 rounded-full bg-[var(--primary)]" />
            TOP MATCHES
          </p>

          <div className="space-y-3 mb-6">
            {matches.map((match, i) => {
              const chips = getMatchChips(match, activeStudent);
              const sc = sharedCircleCount(match.student.id);
              if (sc > 0) chips.push(`${sc} shared circle${sc > 1 ? 's' : ''}`);
              const statusLabel = getStatusLabel(statusMap[match.student.id]);
              const isFriend = friendIds.has(match.student.id);
              const isPending = pendingSentIds.has(match.student.id);

              return (
                <div key={match.student.id}
                  className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4 transition-all hover:border-[var(--primary)]/30"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Top row: rank, avatar, name, score */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-[var(--muted)] w-5 shrink-0">#{i + 1}</span>
                    <div className={`w-10 h-10 rounded-full ${avatarColor(match.student.name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                      {match.student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--foreground)] truncate">{match.student.name}</p>
                      <p className="text-[10px] text-[var(--muted)] truncate">
                        {match.student.department || 'Branch not set'} · {match.student.yearLevel || ''}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-emerald-400 shrink-0">{match.score.overall}%</span>
                  </div>

                  {/* Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {chips.map(chip => (
                      <span key={chip} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {chip}
                      </span>
                    ))}
                    {statusLabel && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                        {statusLabel}
                      </span>
                    )}
                    {birthdayUserIds.has(match.student.id) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        🎂 Birthday soon
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (isFriend) {
                          router.push(`/chat?friendId=${encodeURIComponent(match.student.id)}&friendName=${encodeURIComponent(match.student.name)}`);
                        } else {
                          handleAddFriend(match.student.id, match.student.name);
                        }
                      }}
                      disabled={isPending}
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                    >
                      {isFriend ? 'Chat' : isPending ? 'Sent' : 'Connect'}
                    </button>
                    <button
                      onClick={() => router.push(`/chat?friendId=${encodeURIComponent(match.student.id)}&friendName=${encodeURIComponent(match.student.name)}`)}
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-all"
                    >
                      👋 Ping
                    </button>
                    <button
                      onClick={() => openProfile(match)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-[var(--muted)] border border-[var(--glass-border)] hover:bg-white/5 transition-all"
                    >
                      Profile →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-[var(--muted)] mb-6">
            Click <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--foreground)] font-semibold">Profile →</span> to see full details
          </p>
        </>
      )}

      {/* ─── No matches ─── */}
      {!loading && matches.length === 0 && hasAutoRun && (
        <div className="text-center py-12 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)]">
          <p className="text-3xl mb-3">🔍</p>
          <h2 className="text-sm font-bold mb-1">No matches yet</h2>
          <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">
            We could not find any students sharing your branch or year right now. More students will appear as they join.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ─── PROFILE OVERLAY ─── */}
      {/* ═══════════════════════════════════════════ */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-6">
            {/* Back button */}
            <button
              onClick={() => setSelectedMatch(null)}
              className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-5"
            >
              <ArrowLeft size={16} />
              <span className="font-semibold">{selectedMatch.student.name}&apos;s Profile</span>
            </button>

            {/* Large avatar */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`w-20 h-20 rounded-full ${avatarColor(selectedMatch.student.name)} flex items-center justify-center text-white text-3xl font-bold mb-3 shadow-xl`}>
                {selectedMatch.student.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">{selectedMatch.student.name}</h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                {selectedMatch.student.department || 'Branch not set'} · {selectedMatch.student.yearLevel || ''} · SVNIT
              </p>

              {/* Status chips */}
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {activeStudent && selectedMatch.student.department === activeStudent.department && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Same branch</span>
                )}
                {(selectedMatch.student.availableTimes?.toLowerCase().includes('pm') || selectedMatch.student.availableTimes?.toLowerCase().includes('night')) && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">Night owl</span>
                )}
                {statusMap[selectedMatch.student.id]?.status === 'online' && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">Active today</span>
                )}
              </div>
            </div>

            {/* Bio */}
            {selectedMatch.student.bio && (
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] mb-2">BIO</p>
                <p className="text-sm italic text-[var(--foreground)] leading-relaxed">
                  &ldquo;{selectedMatch.student.bio}&rdquo;
                </p>
              </div>
            )}

            {/* Why it works */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400 mb-1">Why this works</p>
              <p className="text-xs text-[var(--foreground)]">{selectedMatch.whyItWorks}</p>
            </div>

            {/* Circles grid */}
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] mb-3">
                CIRCLES — SHARED ONES HIGHLIGHTED
              </p>
              <div className="grid grid-cols-3 gap-2">
                {ALL_CIRCLES.map(circle => {
                  const theirCircles = matchCircleIds[selectedMatch.student.id] || [];
                  const theyHave = theirCircles.includes(circle.id);
                  const iHave = myCircleIds.includes(circle.id);
                  const isShared = theyHave && iHave;

                  if (!theyHave && !iHave) return null; // only show relevant circles

                  return (
                    <div
                      key={circle.id}
                      className={`rounded-xl p-3 text-center border transition-all ${
                        isShared
                          ? 'border-violet-500/40 bg-violet-500/10'
                          : 'border-[var(--glass-border)] bg-white/5'
                      }`}
                    >
                      {isShared && <span className="block w-2 h-2 rounded-full bg-violet-500 mx-auto mb-1" />}
                      <span className="text-xl">{circle.emoji}</span>
                      <p className="text-[10px] font-semibold text-[var(--foreground)] mt-1">{circle.name}</p>
                    </div>
                  );
                })}
              </div>
              {sharedCircleCount(selectedMatch.student.id) > 0 && (
                <p className="text-[10px] text-violet-400 mt-2 text-center">
                  Purple = shared with you · {sharedCircleCount(selectedMatch.student.id)} circle{sharedCircleCount(selectedMatch.student.id) > 1 ? 's' : ''} in common
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (friendIds.has(selectedMatch.student.id)) {
                    router.push(`/chat?friendId=${encodeURIComponent(selectedMatch.student.id)}&friendName=${encodeURIComponent(selectedMatch.student.name)}`);
                  } else {
                    handleAddFriend(selectedMatch.student.id, selectedMatch.student.name);
                  }
                }}
                disabled={pendingSentIds.has(selectedMatch.student.id)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all disabled:opacity-50"
              >
                {friendIds.has(selectedMatch.student.id) ? '✓ Friends' : pendingSentIds.has(selectedMatch.student.id) ? '✓ Sent' : '✓ Connect'}
              </button>
              <button
                onClick={() => router.push(`/chat?friendId=${encodeURIComponent(selectedMatch.student.id)}&friendName=${encodeURIComponent(selectedMatch.student.name)}`)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-all"
              >
                👋 Ping {selectedMatch.student.name.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
