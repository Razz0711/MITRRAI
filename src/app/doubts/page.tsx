// ============================================
// MitrAI - Anonymous Doubts Page
// Post & answer anonymous academic doubts
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Doubt {
  id: string;
  userId: string;
  department: string;
  subject: string;
  question: string;
  isAnonymous: boolean;
  upvotes: number;
  status: string;
  createdAt: string;
}

interface DoubtReply {
  id: string;
  doubtId: string;
  userId: string;
  userName: string;
  reply: string;
  isAnonymous: boolean;
  isAccepted: boolean;
  upvotes: number;
  createdAt: string;
}

const DEPARTMENTS = [
  'All', 'Computer Science', 'Electronics', 'Electrical', 'Mechanical',
  'Civil', 'Chemical', 'Mathematics', 'Physics', 'Chemistry',
];

export default function DoubtsPage() {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAsk, setShowAsk] = useState(false);
  const [filter, setFilter] = useState('All');
  const [expandedDoubt, setExpandedDoubt] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, DoubtReply[]>>({});
  const [replyText, setReplyText] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);

  // Ask form
  const [askQuestion, setAskQuestion] = useState('');
  const [askDept, setAskDept] = useState('');
  const [askSubject, setAskSubject] = useState('');
  const [askAnon, setAskAnon] = useState(true);
  const [asking, setAsking] = useState(false);

  const loadDoubts = useCallback(async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams();
      if (filter !== 'All') params.set('department', filter);
      const res = await fetch(`/api/doubts?${params.toString()}`);
      const data = await res.json();
      if (data.success) setDoubts(data.data.doubts || []);
    } catch (err) {
      console.error('loadDoubts:', err);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => {
    loadDoubts();
  }, [loadDoubts]);

  const handleAsk = async () => {
    if (!user || !askQuestion.trim()) return;
    setAsking(true);
    try {
      const res = await fetch('/api/doubts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          department: askDept,
          subject: askSubject,
          question: askQuestion,
          isAnonymous: askAnon,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAsk(false);
        setAskQuestion('');
        setAskDept('');
        setAskSubject('');
        await loadDoubts();
      }
    } catch (err) {
      console.error('askDoubt:', err);
    } finally {
      setAsking(false);
    }
  };

  const handleUpvote = async (doubtId: string) => {
    try {
      await fetch('/api/doubts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upvote', doubtId }),
      });
      await loadDoubts();
    } catch (err) {
      console.error('upvote:', err);
    }
  };

  const loadReplies = async (doubtId: string) => {
    if (expandedDoubt === doubtId) {
      setExpandedDoubt(null);
      return;
    }
    try {
      const res = await fetch(`/api/doubts/${doubtId}/replies`);
      const data = await res.json();
      if (data.success) {
        setReplies((prev) => ({ ...prev, [doubtId]: data.data.replies || [] }));
      }
    } catch (err) {
      console.error('loadReplies:', err);
    }
    setExpandedDoubt(doubtId);
  };

  const handleReply = async (doubtId: string) => {
    if (!user || !replyText.trim()) return;
    try {
      await fetch(`/api/doubts/${doubtId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.email?.split('@')[0] || 'Student',
          reply: replyText,
          isAnonymous: replyAnon,
        }),
      });
      setReplyText('');
      setReplyAnon(false);
      await loadReplies(doubtId);
      // Re-expand after loading
      setExpandedDoubt(doubtId);
    } catch (err) {
      console.error('addReply:', err);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Anonymous Doubts</h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Ask questions anonymously. Get help from peers.
          </p>
        </div>
        <button
          onClick={() => setShowAsk(true)}
          className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded-lg hover:bg-[#6d28d9]"
        >
          Ask a Doubt
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap border ${
              filter === d
                ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                : 'border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-light)]'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Ask Modal */}
      {showAsk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-xl p-6 w-full max-w-md space-y-4 border border-[var(--border)]">
            <h2 className="text-xl font-bold">Ask a Doubt</h2>
            <textarea
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              placeholder="Type your question..."
              rows={3}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-light)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={askDept}
                onChange={(e) => setAskDept(e.target.value)}
                className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-light)] text-[var(--foreground)] text-sm"
              >
                <option value="">Department (optional)</option>
                {DEPARTMENTS.filter((d) => d !== 'All').map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input
                value={askSubject}
                onChange={(e) => setAskSubject(e.target.value)}
                placeholder="Subject (optional)"
                className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-light)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted)]"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={askAnon}
                onChange={(e) => setAskAnon(e.target.checked)}
                className="rounded accent-[var(--primary)]"
              />
              Post anonymously
            </label>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAsk}
                disabled={asking || !askQuestion.trim()}
                className="flex-1 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[#6d28d9] disabled:opacity-50 font-medium"
              >
                {asking ? 'Posting...' : 'Post Doubt'}
              </button>
              <button
                onClick={() => setShowAsk(false)}
                className="flex-1 py-2 border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--surface-light)] font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doubts List */}
      {doubts.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted)]">
          <p className="text-4xl mb-3">🤔</p>
          <p>No doubts yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {doubts.map((doubt) => (
            <div
              key={doubt.id}
              className="rounded-xl border border-[var(--border)] p-5 bg-[var(--surface)]"
            >
              {/* Doubt Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-[var(--foreground)] text-base">{doubt.question}</p>
                  <div className="flex gap-2 mt-2 text-xs text-[var(--muted)]">
                    {doubt.department && (
                      <span className="px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary-light)] rounded-full">
                        {doubt.department}
                      </span>
                    )}
                    {doubt.subject && (
                      <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full">
                        {doubt.subject}
                      </span>
                    )}
                    <span>
                      {doubt.isAnonymous ? '🕵️ Anonymous' : '👤 Named'} •{' '}
                      {new Date(doubt.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    doubt.status === 'open'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-[var(--success)]/15 text-[var(--success)]'
                  }`}
                >
                  {doubt.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={() => handleUpvote(doubt.id)}
                  className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--primary-light)]"
                >
                  ▲ {doubt.upvotes}
                </button>
                <button
                  onClick={() => loadReplies(doubt.id)}
                  className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--primary-light)]"
                >
                  💬 {expandedDoubt === doubt.id ? 'Hide' : 'Replies'}
                </button>
              </div>

              {/* Replies Section */}
              {expandedDoubt === doubt.id && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                  {(replies[doubt.id] || []).length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No replies yet.</p>
                  ) : (
                    (replies[doubt.id] || []).map((r) => (
                      <div
                        key={r.id}
                        className={`p-3 rounded-lg text-sm ${
                          r.isAccepted
                            ? 'bg-[var(--success)]/10 border border-[var(--success)]/20'
                            : 'bg-[var(--surface-light)]'
                        }`}
                      >
                        <p className="text-[var(--foreground)]">{r.reply}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--muted)]">
                          <span>
                            {r.isAnonymous ? '🕵️ Anonymous' : `👤 ${r.userName}`}
                          </span>
                          <span>•</span>
                          <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                          {r.isAccepted && (
                            <span className="text-[var(--success)] font-medium">✓ Accepted</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Reply Input */}
                  <div className="flex gap-2 pt-2">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply(doubt.id)}
                      placeholder="Write a reply..."
                      className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface-light)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
                    />
                    <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={replyAnon}
                        onChange={(e) => setReplyAnon(e.target.checked)}
                        className="rounded"
                      />
                      Anon
                    </label>
                    <button
                      onClick={() => handleReply(doubt.id)}
                      disabled={!replyText.trim()}
                      className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded-lg hover:bg-[#6d28d9] disabled:opacity-50"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
