'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, MessageCircleMore, Sparkles, X } from 'lucide-react';
import MatchCard from '@/components/MatchCard';
import {
  BirthdayInfo,
  FriendRequest,
  Friendship,
  MatchResult,
  StudentProfile,
  UserStatus,
} from '@/lib/types';
import { useAuth } from '@/lib/auth';

export default function MatchesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [notice, setNotice] = useState('');
  const [hasAutoRun, setHasAutoRun] = useState(false);

  const [statusMap, setStatusMap] = useState<Record<string, UserStatus>>({});
  const [birthdayUserIds, setBirthdayUserIds] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingSentIds, setPendingSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    loadStudents();
    loadStatuses();
    loadBirthdays();
    loadFriends();
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
        data.data.forEach((status: UserStatus) => {
          map[status.userId] = status;
        });
        setStatusMap(map);
      }
    } catch (err) {
      console.error('loadStatuses:', err);
    }
  };

  const loadBirthdays = useCallback(async () => {
    try {
      const usersRaw = localStorage.getItem('mitrai_users') || '[]';
      const users = JSON.parse(usersRaw).map((entry: { id: string; name: string; department: string; dob: string; showBirthday?: boolean }) => ({
        id: entry.id,
        name: entry.name,
        department: entry.department || '',
        dob: entry.dob || '',
        showBirthday: entry.showBirthday !== false,
      }));
      const params = new URLSearchParams({ days: '3', users: encodeURIComponent(JSON.stringify(users)) });
      const res = await fetch(`/api/birthday?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        const ids = new Set<string>((data.data.birthdays || []).map((birthday: BirthdayInfo) => birthday.userId));
        setBirthdayUserIds(ids);
      }
    } catch (err) {
      console.error('loadBirthdays:', err);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        const acceptedFriendIds = new Set<string>(
          (data.data.friends || []).map((friend: Friendship) =>
            friend.user1Id === user.id ? friend.user2Id : friend.user1Id
          )
        );
        setFriendIds(acceptedFriendIds);

        const sentIds = new Set<string>(
          (data.data.allRequests || [])
            .filter((request: FriendRequest) => request.fromUserId === user.id && request.status === 'pending')
            .map((request: FriendRequest) => request.toUserId)
        );
        setPendingSentIds(sentIds);
      }
    } catch (err) {
      console.error('loadFriends:', err);
    }
  }, [user]);

  const handleAddFriend = async (studentId: string, studentName: string) => {
    if (!user) return;
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_request',
          fromUserId: user.id,
          fromUserName: user.name,
          toUserId: studentId,
          toUserName: studentName,
        }),
      });
      setPendingSentIds((previous) => {
        const next = new Set(Array.from(previous));
        next.add(studentId);
        return next;
      });
      setNotice(`Friend request sent to ${studentName}.`);
    } catch (err) {
      console.error('addFriend:', err);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setAllStudents(data.data);
        const savedId = localStorage.getItem('mitrai_student_id');
        const preferredId = savedId || user?.id || '';
        const currentStudent = data.data.find((candidate: StudentProfile) => candidate.id === preferredId);
        if (currentStudent) {
          setSelectedStudentId(currentStudent.id);
        } else if (data.data.length > 0) {
          setSelectedStudentId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const findMatches = async (studentIdOverride?: string) => {
    const studentId = studentIdOverride || selectedStudentId;
    if (!studentId) return;

    setLoading(true);
    setError('');

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
      } else {
        setMatches([]);
        setError(data.error || 'Failed to find matches');
      }
    } catch (err) {
      console.error('Match error:', err);
      setMatches([]);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activeStudent = student || allStudents.find((candidate) => candidate.id === selectedStudentId) || null;
  const activeBranch = activeStudent?.department || user?.department || 'Not set';
  const activeYear = activeStudent?.yearLevel || user?.yearLevel || 'Not set';
  const exactCandidates = allStudents.filter((candidate) =>
    candidate.id !== selectedStudentId &&
    candidate.id !== user?.id &&
    candidate.department === activeBranch &&
    candidate.yearLevel === activeYear
  );
  const browseStudents = allStudents.filter((candidate) => {
    if (candidate.id === selectedStudentId) return false;
    if (candidate.id === user?.id) return false;
    return candidate.department === activeBranch || candidate.yearLevel === activeYear;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          <Sparkles size={12} className="text-[var(--accent)]" />
          Branch + year matching
        </div>
        <h1 className="mt-3 text-2xl font-bold mb-1">
          Find Your <span className="gradient-text">Study Buddy</span>
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Matches are now ranked only by branch and college year.
        </p>
      </div>

      {notice && (
        <div className="mb-4 rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
          {notice}
        </div>
      )}

      <div className="card-glass p-5 sm:p-6 mb-6">
        {activeStudent ? (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-light)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Matching as {activeStudent.name}
                </div>
                <h2 className="mt-3 text-xl font-bold text-[var(--foreground)]">
                  We only use your branch and year now
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  No setup wizard and no study-preference scoring. We compare your registration details and show students from the same branch and year first, then nearby academic matches if needed.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => findMatches()}
                    disabled={!selectedStudentId || loading}
                    className="btn-primary inline-flex items-center gap-2 text-xs"
                  >
                    {loading ? 'Refreshing matches...' : matches.length > 0 ? 'Refresh matches' : 'Find matches'}
                  </button>
                  <Link href="/home" className="btn-secondary text-xs">
                    Back to home
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:w-[380px]">
                <SummaryTile label="Branch" value={activeBranch} />
                <SummaryTile label="Year" value={activeYear} />
                <SummaryTile label="Exact matches" value={`${exactCandidates.length}`} />
              </div>
            </div>

            {allStudents.length > 1 && (
              <div className="mt-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4">
                <button
                  onClick={() => setShowProfileSelector((value) => !value)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Switch profile</p>
                    <p className="text-xs text-[var(--muted)]">Useful for testing the simplified branch and year logic.</p>
                  </div>
                  {showProfileSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showProfileSelector && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <select
                      value={selectedStudentId}
                      onChange={(e) => {
                        setSelectedStudentId(e.target.value);
                        setStudent(null);
                        setMatches([]);
                        setError('');
                        setHasAutoRun(false);
                      }}
                      className="input-field flex-1 text-xs"
                    >
                      <option value="">Choose a student...</option>
                      {allStudents.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name} - {candidate.department || 'Branch not set'} ({candidate.yearLevel || 'Year not set'})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => findMatches()}
                      disabled={!selectedStudentId || loading}
                      className="btn-secondary whitespace-nowrap text-xs"
                    >
                      Update results
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Student record not found</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">We need your saved branch and year to run matching.</p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-xs mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center animate-pulse">
            <span className="w-3 h-3 rounded-full bg-[var(--primary)]" />
          </div>
          <p className="text-xs text-[var(--muted)]">Finding branch and year matches...</p>
          <p className="text-[10px] text-[var(--muted)] mt-1">Ranking same branch and same year first.</p>
        </div>
      )}

      {matches.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Top matches for you</h2>
              <p className="text-xs text-[var(--muted)]">Students from the same branch and year are shown first.</p>
            </div>
            <span className="text-xs text-[var(--muted)]">{matches.length} found</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {matches.map((match, index) => (
              <MatchCard
                key={match.student.id}
                match={match}
                rank={index + 1}
                userStatus={statusMap[match.student.id]}
                isBirthday={birthdayUserIds.has(match.student.id)}
                onAddFriend={handleAddFriend}
                isFriend={friendIds.has(match.student.id)}
                friendRequestPending={pendingSentIds.has(match.student.id)}
                onConnect={() => {
                  router.push(`/chat?friendId=${encodeURIComponent(match.student.id)}&friendName=${encodeURIComponent(match.student.name)}`);
                }}
                onViewProfile={() => setSelectedMatch(match)}
              />
            ))}
          </div>

          {matches[0] && (
            <div className="mt-6 card p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Best next step</p>
                  <h3 className="mt-2 text-lg font-bold">Start with {matches[0].student.name}</h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {matches[0].student.name} is your strongest match at <span className="font-semibold text-[var(--foreground)]">{matches[0].score.overall}%</span>. {matches[0].whyItWorks}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/chat?friendId=${encodeURIComponent(matches[0].student.id)}&friendName=${encodeURIComponent(matches[0].student.name)}`)}
                    className="btn-primary inline-flex items-center gap-2 text-xs"
                  >
                    <MessageCircleMore size={14} />
                    Start chat
                  </button>
                  <button
                    onClick={() => setSelectedMatch(matches[0])}
                    className="btn-secondary text-xs"
                  >
                    View profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Students with related branch or year</h2>
              <p className="text-xs text-[var(--muted)]">Useful if you want to browse manually before starting a chat.</p>
            </div>
            <span className="text-xs text-[var(--muted)]">{browseStudents.length} students</span>
          </div>

          {browseStudents.length === 0 ? (
            <div className="text-center py-8 card">
              <p className="text-xs text-[var(--muted)]">
                No students with the same branch or year are registered yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {browseStudents.map((candidate) => (
                <div key={candidate.id} className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/25 flex items-center justify-center text-sm font-bold text-[var(--primary-light)]">
                        {candidate.name.charAt(0).toUpperCase()}
                      </div>
                      {statusMap[candidate.id] && (
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface-solid)] ${
                          statusMap[candidate.id].status === 'online' || statusMap[candidate.id].status === 'in-session' ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">{candidate.name}</p>
                        {birthdayUserIds.has(candidate.id) && <span className="text-[10px] text-[var(--warning)]">Birthday soon</span>}
                      </div>
                      <p className="text-[10px] text-[var(--muted)] truncate">
                        {candidate.department || 'Branch not set'}
                        {candidate.yearLevel ? ` - ${candidate.yearLevel}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {candidate.department === activeBranch && (
                      <span className="badge badge-primary">Same branch</span>
                    )}
                    {candidate.yearLevel === activeYear && (
                      <span className="badge badge-warning">Same year</span>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAddFriend(candidate.id, candidate.name)}
                      disabled={friendIds.has(candidate.id) || pendingSentIds.has(candidate.id)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                        friendIds.has(candidate.id)
                          ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                          : pendingSentIds.has(candidate.id)
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                          : 'bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/25'
                      }`}
                    >
                      {friendIds.has(candidate.id) ? 'Friends' : pendingSentIds.has(candidate.id) ? 'Request sent' : 'Add friend'}
                    </button>
                    <button
                      onClick={() => router.push(`/chat?friendId=${encodeURIComponent(candidate.id)}&friendName=${encodeURIComponent(candidate.name)}`)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && matches.length === 0 && !error && activeStudent && hasAutoRun && (
        <div className="text-center py-12 card mt-6">
          <h2 className="text-sm font-bold mb-1">No branch or year matches yet</h2>
          <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
            We could not find any students sharing your branch or year right now.
          </p>
        </div>
      )}

      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Match profile</p>
                <h3 className="mt-2 text-xl font-bold">{selectedMatch.student.name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {selectedMatch.student.department || 'Branch not set'}
                  {selectedMatch.student.yearLevel ? ` - ${selectedMatch.student.yearLevel}` : ''}
                  {selectedMatch.student.admissionNumber ? ` - ${selectedMatch.student.admissionNumber}` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="rounded-xl p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-light)] hover:text-[var(--foreground)]"
                aria-label="Close profile"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Match score" value={`${selectedMatch.score.overall}%`} />
              <SummaryTile label="Branch fit" value={`${selectedMatch.score.subject}/60`} />
              <SummaryTile label="Year fit" value={`${selectedMatch.score.schedule}/40`} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--success)]">Why this works</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">{selectedMatch.whyItWorks}</p>
              </div>
              <div className="rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning)]/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--warning)]">Keep in mind</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">{selectedMatch.potentialChallenges}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <DetailPanel
                title="Identity"
                items={[
                  `Branch: ${selectedMatch.student.department || 'Not shared'}`,
                  `Year: ${selectedMatch.student.yearLevel || 'Not shared'}`,
                  `Admission: ${selectedMatch.student.admissionNumber || 'Not shared'}`,
                ]}
              />
              <DetailPanel
                title="Match basis"
                items={selectedMatch.complementaryFactors || ['Closest academic match found']}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => router.push(`/chat?friendId=${encodeURIComponent(selectedMatch.student.id)}&friendName=${encodeURIComponent(selectedMatch.student.name)}`)}
                className="btn-primary inline-flex items-center gap-2 text-xs"
              >
                <MessageCircleMore size={14} />
                Start chat
              </button>
              <button
                onClick={() => handleAddFriend(selectedMatch.student.id, selectedMatch.student.name)}
                disabled={friendIds.has(selectedMatch.student.id) || pendingSentIds.has(selectedMatch.student.id)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  friendIds.has(selectedMatch.student.id)
                    ? 'bg-green-500/15 text-green-400 border border-green-500/25 cursor-default'
                    : pendingSentIds.has(selectedMatch.student.id)
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 cursor-default'
                    : 'bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/25'
                }`}
              >
                {friendIds.has(selectedMatch.student.id)
                  ? 'Already friends'
                  : pendingSentIds.has(selectedMatch.student.id)
                  ? 'Request sent'
                  : 'Add friend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function DetailPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="badge badge-primary">{item}</span>
        ))}
      </div>
    </div>
  );
}
