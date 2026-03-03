// ============================================
// MitrAI - Matches Page (with Status & Birthday indicators)
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import MatchCard from '@/components/MatchCard';
import { MatchResult, StudentProfile, UserStatus, BirthdayInfo, Friendship, FriendRequest } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { TYPE_MAP, DEPT_MAP } from '@/lib/email-parser';
import SubTabBar from '@/components/SubTabBar';

export default function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Status & birthday data
  const [statusMap, setStatusMap] = useState<Record<string, UserStatus>>({});
  const [birthdayUserIds, setBirthdayUserIds] = useState<Set<string>>(new Set());

  // Friend data
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingSentIds, setPendingSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadStudents();
    loadStatuses();
    loadBirthdays();
    loadFriends();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatuses = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const map: Record<string, UserStatus> = {};
        data.data.forEach((s: UserStatus) => { map[s.userId] = s; });
        setStatusMap(map);
      }
    } catch (err) { console.error('loadStatuses:', err); }
  };

  const loadBirthdays = useCallback(async () => {
    try {
      const usersRaw = localStorage.getItem('mitrai_users') || '[]';
      const users = JSON.parse(usersRaw).map((u: { id: string; name: string; department: string; dob: string; showBirthday?: boolean }) => ({
        id: u.id, name: u.name, department: u.department || '', dob: u.dob || '', showBirthday: u.showBirthday !== false,
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
        const fIds = new Set<string>(
          (data.data.friends || []).map((f: Friendship) =>
            f.user1Id === user.id ? f.user2Id : f.user1Id
          )
        );
        setFriendIds(fIds);
        const sentIds = new Set<string>(
          (data.data.allRequests || [])
            .filter((r: FriendRequest) => r.fromUserId === user.id && r.status === 'pending')
            .map((r: FriendRequest) => r.toUserId)
        );
        setPendingSentIds(sentIds);
      }
    } catch (err) { console.error('loadFriends:', err); }
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
      setPendingSentIds(prev => {
        const next = new Set(Array.from(prev));
        next.add(studentId);
        return next;
      });
    } catch (err) { console.error('addFriend:', err); }
  };

  const loadStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setAllStudents(data.data);
        const savedId = localStorage.getItem('mitrai_student_id');
        if (savedId) {
          setSelectedStudentId(savedId);
        } else if (data.data.length > 0) {
          setSelectedStudentId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const findMatches = async () => {
    if (!selectedStudentId) return;

    setLoading(true);
    setError('');
    setMatches([]);

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });

      const data = await res.json();

      if (data.success) {
        setStudent(data.data.student);
        setMatches(data.data.matches);
      } else {
        setError(data.error || 'Failed to find matches');
      }
    } catch (err) {
      console.error('Match error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <SubTabBar group="discover" />
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold mb-1">
          Find Your <span className="gradient-text">Study Buddy</span>
        </h1>
        <p className="text-xs text-[var(--muted)]">AI-powered matching across 5 dimensions</p>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label className="label">Student Profile</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="input-field text-xs"
            >
              <option value="">Choose a student...</option>
              {allStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.targetExam} ({s.city})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={findMatches}
            disabled={!selectedStudentId || loading}
            className="btn-primary whitespace-nowrap mt-4 sm:mt-0 text-xs"
          >
            {loading ? 'Finding...' : 'Find Matches'}
          </button>
        </div>

        {student && (
          <div className="mt-3 p-3 rounded-lg bg-white/5 flex flex-wrap gap-3 text-xs">
            <span><strong>Student:</strong> {student.name}</span>
            <span><strong>Target:</strong> {student.targetExam}</span>
            <span><strong>Strong:</strong> {student.strongSubjects.join(', ')}</span>
            <span><strong>Weak:</strong> {student.weakSubjects.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-xs mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center animate-pulse">
            <span className="w-3 h-3 rounded-full bg-[var(--primary)]" />
          </div>
          <p className="text-xs text-[var(--muted)]">Analyzing compatibility...</p>
          <p className="text-[10px] text-[var(--muted)] mt-1">Scoring across subject, schedule, style, goals & personality</p>
        </div>
      )}

      {/* Results */}
      {matches.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">Top Matches</h2>
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
                  localStorage.setItem('mitrai_buddy_id', match.student.id);
                  localStorage.setItem('mitrai_buddy_name', match.student.name);
                  alert(`Connection request sent to ${match.student.name}. Check the Study Plan page to create a plan together.`);
                }}
                onViewProfile={() => {
                  alert(`${match.student.name}\n\nStudying: ${match.student.currentStudy}\nTarget: ${match.student.targetExam}\nStrong: ${match.student.strongSubjects.join(', ')}\nWeak: ${match.student.weakSubjects.join(', ')}\nSchedule: ${match.student.availableDays.join(', ')} ${match.student.availableTimes}`);
                }}
              />
            ))}
          </div>

          {/* Best Match Recommendation */}
          {matches[0] && (
            <div className="mt-6 card p-4 text-center">
              <h3 className="text-sm font-bold mb-1">Our Recommendation</h3>
              <p className="text-xs text-[var(--muted)] mb-3">
                <strong className="text-[var(--foreground)]">{matches[0].student.name}</strong> is your best match with a{' '}
                <strong className="gradient-text">{matches[0].score.overall}%</strong> compatibility score.
                {matches[0].complementaryFactors.length > 0 && (
                  <> Their strengths complement your weaknesses.</>
                )}
              </p>
              <div className="flex gap-2 justify-center">
                <Link href="/chat" className="btn-primary text-xs">
                  Start Chatting
                </Link>
                <Link href="/doubts" className="btn-secondary text-xs">
                  Ask a Doubt
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* Browse All Students — visible even without running matching */}
      {!loading && (
        <div className="mt-6">
          {/* Batch info banner */}
          {user?.matchKey && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">🎓</span>
                <span className="text-xs font-semibold text-[var(--primary-light)]">
                  {TYPE_MAP[user.matchKey[0]] || 'Student'} · {DEPT_MAP[user.matchKey.slice(3)] || user.deptCode?.toUpperCase() || ''} · Batch &#39;{user.batchYear || user.matchKey.slice(1, 3)}
                </span>
              </div>
              <p className="text-[10px] text-[var(--muted)]">
                Matching is limited to your batch ({user.matchKey.toUpperCase()}) for the most relevant study partners.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">
              {user?.matchKey ? 'Your Batchmates on MitrAI' : 'Browse All Students'}
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {allStudents.filter(s => {
                if (s.id === selectedStudentId) return false;
                if (s.id === user?.id) return false;
                if (user?.matchKey) return s.matchKey === user.matchKey;
                return true;
              }).length} {user?.matchKey ? 'batchmates' : 'students'}
            </span>
          </div>
          {allStudents.filter(s => {
            if (s.id === selectedStudentId) return false;
            if (s.id === user?.id) return false;
            if (user?.matchKey) return s.matchKey === user.matchKey;
            return true;
          }).length === 0 ? (
            <div className="text-center py-8 card">
              <span className="text-3xl mb-2 block">👥</span>
              <p className="text-xs text-[var(--muted)]">
                {user?.matchKey
                  ? 'No batchmates registered yet. Invite your SVNIT batchmates to join MitrAI!'
                  : 'No other students registered yet. Invite your SVNIT friends to join!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allStudents
                .filter(s => {
                  if (s.id === selectedStudentId) return false;
                  if (s.id === user?.id) return false;
                  if (user?.matchKey) return s.matchKey === user.matchKey;
                  return true;
                })
                .map(s => (
                  <div key={s.id} className="card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/25 flex items-center justify-center text-sm font-bold text-[var(--primary-light)]">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Online status dot */}
                        {statusMap[s.id] && (
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--card-bg)] ${
                            statusMap[s.id].status === 'online' || statusMap[s.id].status === 'in-session' ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">{s.name}</p>
                          {birthdayUserIds.has(s.id) && <span title="Birthday coming up!">🎂</span>}
                        </div>
                        <p className="text-[10px] text-[var(--muted)] truncate">
                          {s.department || s.currentStudy || 'SVNIT Student'}
                          {s.yearLevel ? ` · ${s.yearLevel}` : ''}
                        </p>
                        {statusMap[s.id]?.status === 'online' && (
                          <p className="text-[10px] text-green-400">🟢 Online now</p>
                        )}
                        {statusMap[s.id]?.status === 'in-session' && (
                          <p className="text-[10px] text-amber-400">📖 {statusMap[s.id].currentSubject ? `Studying ${statusMap[s.id].currentSubject}` : 'In study session'}</p>
                        )}
                      </div>
                    </div>
                    {s.targetExam && (
                      <p className="text-[10px] text-[var(--muted)] mb-2">
                        🎯 {s.targetExam}
                      </p>
                    )}
                    {s.strongSubjects && s.strongSubjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {s.strongSubjects.slice(0, 3).map(sub => (
                          <span key={sub} className="badge-success text-[10px]">{sub}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAddFriend(s.id, s.name)}
                        disabled={friendIds.has(s.id) || pendingSentIds.has(s.id)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          friendIds.has(s.id)
                            ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                            : pendingSentIds.has(s.id)
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                            : 'bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/25'
                        }`}
                      >
                        {friendIds.has(s.id) ? '✓ Friends' : pendingSentIds.has(s.id) ? '⏳ Sent' : '👋 Add Friend'}
                      </button>
                      <Link
                        href={`/call?buddy=${encodeURIComponent(s.name)}`}
                        className="px-2 py-1.5 rounded-lg text-[10px] font-medium bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all"
                      >
                        📞
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && matches.length === 0 && !error && allStudents.length <= 1 && (
        <div className="text-center py-12 card">
          <h2 className="text-sm font-bold mb-1">Ready to Find Matches?</h2>
          <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
            Select a student profile above and click &quot;Find Matches&quot; to discover compatible study buddies.
          </p>
        </div>
      )}
    </div>
  );
}
