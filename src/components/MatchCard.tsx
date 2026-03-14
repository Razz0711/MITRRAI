'use client';

import { StatusDot } from '@/components/StatusIndicator';
import { MatchResult, UserStatus } from '@/lib/types';

interface MatchCardProps {
  match: MatchResult;
  rank: number;
  userStatus?: UserStatus;
  isBirthday?: boolean;
  onViewProfile?: () => void;
  onConnect?: () => void;
  onAddFriend?: (studentId: string, studentName: string) => void;
  isFriend?: boolean;
  friendRequestPending?: boolean;
}

export default function MatchCard({
  match,
  rank,
  userStatus,
  isBirthday,
  onViewProfile,
  onConnect,
  onAddFriend,
  isFriend,
  friendRequestPending,
}: MatchCardProps) {
  const { student, score, whyItWorks, potentialChallenges, complementaryFactors } = match;
  const rankLabel: Record<number, string> = { 1: '#1', 2: '#2', 3: '#3' };

  return (
    <div className="card-hover p-4" style={{ animationDelay: `${rank * 100}ms` }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-sm font-bold text-[var(--primary-light)]">
              {rankLabel[rank] || `#${rank}`}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5">
              <StatusDot status={userStatus?.status || 'offline'} size="sm" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{student.name}</h3>
              {isBirthday && <span className="text-[10px] text-[var(--warning)]">Birthday soon</span>}
            </div>
            <p className="text-[10px] text-[var(--muted)]">
              {student.department || 'Branch not set'}
              {student.yearLevel ? ` - ${student.yearLevel}` : ''}
              {student.admissionNumber ? ` - ${student.admissionNumber}` : ''}
            </p>
            {userStatus?.status === 'in-session' && userStatus.currentSubject && (
              <p className="text-[10px] text-amber-400">Studying: {userStatus.currentSubject}</p>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold gradient-text">{score.overall}%</div>
          <p className="text-[10px] text-[var(--muted)]">Match</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <ScoreBar label="Branch Fit" score={score.subject} max={60} />
        <ScoreBar label="Year Fit" score={score.schedule} max={40} />
      </div>

      <div className="space-y-2 mb-4">
        <div className="rounded-xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--success)]">Why this works</p>
          <p className="mt-1 text-xs text-[var(--foreground)]">{whyItWorks}</p>
        </div>

        {complementaryFactors.length > 0 && (
          <div className="rounded-xl border border-[var(--secondary)]/20 bg-[var(--secondary)]/10 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--secondary)]">Match basis</p>
            <ul className="mt-1 space-y-1 text-xs text-[var(--foreground)]">
              {complementaryFactors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--warning)]">Keep in mind</p>
          <p className="mt-1 text-xs text-[var(--foreground)]">{potentialChallenges}</p>
        </div>
      </div>

      <div className="rounded-xl bg-white/5 p-3 mb-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[var(--muted)]">Branch:</span> {student.department || 'Not shared'}
          </div>
          <div>
            <span className="text-[var(--muted)]">Year:</span> {student.yearLevel || 'Not shared'}
          </div>
          <div>
            <span className="text-[var(--muted)]">Admission:</span> {student.admissionNumber || 'Not shared'}
          </div>
          <div>
            <span className="text-[var(--muted)]">Campus:</span> SVNIT
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={onConnect} className="btn-primary flex-1 text-xs">
          Start Chat
        </button>
        <button onClick={onViewProfile} className="btn-secondary flex-1 text-xs">
          View Profile
        </button>
        {onAddFriend && (
          <button
            onClick={() => onAddFriend(student.id, student.name)}
            disabled={isFriend || friendRequestPending}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isFriend
                ? 'bg-green-500/15 text-green-400 border border-green-500/25 cursor-default'
                : friendRequestPending
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 cursor-default'
                : 'bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/25'
            }`}
          >
            {isFriend ? 'Friends' : friendRequestPending ? 'Request sent' : 'Add Friend'}
          </button>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const percentage = Math.round((score / max) * 100);

  return (
    <div className="rounded-xl bg-white/5 p-3 text-center">
      <div className="score-bar mb-2">
        <div className="score-fill" style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-[10px] text-[var(--muted)]">{label}</p>
      <p className="text-xs font-semibold">{score}/{max}</p>
    </div>
  );
}
