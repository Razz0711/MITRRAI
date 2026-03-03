// ============================================
// MitrAI - Match Card Component (with Status & Birthday)
// ============================================

'use client';

import { MatchResult, UserStatus } from '@/lib/types';
import { StatusDot } from '@/components/StatusIndicator';

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

export default function MatchCard({ match, rank, userStatus, isBirthday, onViewProfile, onConnect, onAddFriend, isFriend, friendRequestPending }: MatchCardProps) {
  const { student, score, whyItWorks, potentialChallenges, recommendedFirstTopic, bestFormat, complementaryFactors } = match;

  const rankLabel: Record<number, string> = { 1: '#1', 2: '#2', 3: '#3' };

  return (
    <div className="card-hover p-4" style={{ animationDelay: `${rank * 100}ms` }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/25 flex items-center justify-center text-xs font-bold text-[var(--primary-light)]">
              {rankLabel[rank] || `#${rank}`}
            </div>
            {/* Status dot */}
            <div className="absolute -bottom-0.5 -right-0.5">
              <StatusDot status={userStatus?.status || 'offline'} size="sm" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{student.name}</h3>
              {isBirthday && <span title="Birthday coming up!" className="text-sm">🎂</span>}
            </div>
            <p className="text-[10px] text-[var(--muted)]">
              {student.department || student.currentStudy}
              {student.yearLevel ? ` · ${student.yearLevel}` : ''}
              {student.admissionNumber ? ` · ${student.admissionNumber}` : ''}
              {student.targetExam ? ` · ${student.targetExam}` : ''}
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

      {/* Score Breakdown */}
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        <ScoreBar label="Subject" score={score.subject} max={30} />
        <ScoreBar label="Schedule" score={score.schedule} max={25} />
        <ScoreBar label="Style" score={score.style} max={20} />
        <ScoreBar label="Goals" score={score.goal} max={15} />
        <ScoreBar label="Personality" score={score.personality} max={10} />
      </div>

      {/* Info Sections */}
      <div className="space-y-2 mb-3">
        <div className="p-2.5 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20">
          <p className="text-[10px] font-semibold text-[var(--success)] mb-0.5">Why This Works</p>
          <p className="text-xs text-[var(--foreground)]">{whyItWorks}</p>
        </div>

        {complementaryFactors.length > 0 && (
          <div className="p-2.5 rounded-lg bg-[var(--secondary)]/10 border border-[var(--secondary)]/20">
            <p className="text-[10px] font-semibold text-[var(--secondary)] mb-0.5">Complementary Strengths</p>
            <ul className="text-xs text-[var(--foreground)] space-y-0.5">
              {complementaryFactors.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-white/5">
            <p className="text-[10px] text-[var(--muted)] mb-0.5">First Topic</p>
            <p className="text-xs font-medium">{recommendedFirstTopic}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5">
            <p className="text-[10px] text-[var(--muted)] mb-0.5">Best Format</p>
            <p className="text-xs font-medium">{bestFormat}</p>
          </div>
        </div>

        {potentialChallenges && (
          <div className="p-2.5 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20">
            <p className="text-[10px] font-semibold text-[var(--warning)] mb-0.5">Potential Challenges</p>
            <p className="text-xs text-[var(--foreground)]">{potentialChallenges}</p>
          </div>
        )}
      </div>

      {/* Student Details */}
      <div className="p-2.5 rounded-lg bg-white/5 mb-3">
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div><span className="text-[var(--muted)]">Strong:</span> <span className="text-[var(--success)]">{student.strongSubjects.join(', ')}</span></div>
          <div><span className="text-[var(--muted)]">Weak:</span> <span className="text-[var(--accent)]">{student.weakSubjects.join(', ')}</span></div>
          <div><span className="text-[var(--muted)]">Available:</span> {student.availableDays.slice(0, 3).join(', ')}</div>
          <div><span className="text-[var(--muted)]">Time:</span> {student.availableTimes}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={onConnect} className="btn-primary flex-1 text-xs">
          Connect
        </button>
        <button onClick={onViewProfile} className="btn-secondary flex-1 text-xs">
          Profile
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
            {isFriend ? '✓ Friends' : friendRequestPending ? '⏳ Sent' : '👋 Add Friend'}
          </button>
        )}
      </div>

    </div>
  );
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const percentage = Math.round((score / max) * 100);

  return (
    <div className="text-center">
      <div className="score-bar mb-1">
        <div className="score-fill" style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-[10px] text-[var(--muted)]">{label}</p>
      <p className="text-xs font-semibold">{score}/{max}</p>
    </div>
  );
}
