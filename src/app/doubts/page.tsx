// ============================================
// MitrAI - Campus Feed (Anonymous Doubts + Confessions)
// Open anonymous feed visible to everyone
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const POST_TYPES = [
  { id: 'all', emoji: '🔥', label: 'All' },
  { id: 'doubt', emoji: '❓', label: 'Doubts' },
  { id: 'confession', emoji: '🤫', label: 'Confessions' },
  { id: 'spotted', emoji: '👀', label: 'Spotted' },
  { id: 'hot-take', emoji: '🌶️', label: 'Hot Takes' },
  { id: 'advice', emoji: '💡', label: 'Advice' },
];

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
  postType?: string;
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

export default function DoubtsPage() {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAsk, setShowAsk] = useState(false);
  const [expandedDoubt, setExpandedDoubt] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, DoubtReply[]>>({});
  const [replyText, setReplyText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Ask form
  const [askQuestion, setAskQuestion] = useState('');
  const [askPostType, setAskPostType] = useState('doubt');
  const [asking, setAsking] = useState(false);

  const loadDoubts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/doubts');
      const data = await res.json();
      if (data.success) setDoubts(data.data.doubts || []);
    } catch (err) {
      console.error('loadDoubts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
          question: askQuestion,
          isAnonymous: true,
          postType: askPostType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAsk(false);
        setAskQuestion('');
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
          isAnonymous: true,
        }),
      });
      setReplyText('');
      await loadReplies(doubtId);
      // Re-expand after loading
      setExpandedDoubt(doubtId);
    } catch (err) {
      console.error('addReply:', err);
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
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Ambient */}
      <div className="ambient-glow" />

      {/* Header — Premium */}
      <div className="text-center mb-6 slide-up">
        <h1 className="text-2xl font-extrabold mb-1">
          <span className="gradient-text">Campus Feed</span>
        </h1>
        <p className="text-xs text-[var(--muted)]">
          Doubts, confessions, hot takes — anonymous & open to all
        </p>
      </div>

      {/* Post Type Filter — Glass Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-0 slide-up-stagger-1">
        {POST_TYPES.map(pt => (
          <button
            key={pt.id}
            onClick={() => setActiveFilter(pt.id)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold transition-all duration-300 ${
              activeFilter === pt.id
                ? 'text-white shadow-lg'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
            style={activeFilter === pt.id
              ? { background: 'linear-gradient(135deg, var(--primary), #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,0.3)' }
              : { background: 'var(--surface)', border: '1px solid var(--glass-border)' }
            }
          >
            {pt.emoji} {pt.label}
          </button>
        ))}
      </div>

      {/* Ask CTA — Glass Composer */}
      {!showAsk ? (
        <button
          onClick={() => setShowAsk(true)}
          className="w-full card p-4 mb-6 text-left transition-all duration-300 group glow-hover slide-up-stagger-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary)]/15 to-[var(--accent)]/15 flex items-center justify-center text-lg">
              🕵️
            </div>
            <span className="text-sm text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
              What&apos;s on your mind? Post anonymously...
            </span>
          </div>
        </button>
      ) : (
        <div className="card p-5 mb-6 space-y-4 scale-in" style={{ border: '2px solid rgba(124,58,237,0.3)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🕵️</span>
            <span className="text-sm font-bold">New Post</span>
          </div>
          {/* Post type selector */}
          <div className="flex gap-2 flex-wrap">
            {POST_TYPES.filter(pt => pt.id !== 'all').map(pt => (
              <button
                key={pt.id}
                onClick={() => setAskPostType(pt.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                  askPostType === pt.id
                    ? 'bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30'
                    : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'
                }`}
              >
                {pt.emoji} {pt.label}
              </button>
            ))}
          </div>
          <textarea
            value={askQuestion}
            onChange={(e) => setAskQuestion(e.target.value)}
            placeholder="What's on your mind? (doubts, confessions, hot takes, anything...)"
            rows={3}
            autoFocus
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--surface-light)] text-[var(--foreground)] placeholder:text-[var(--muted)] text-sm resize-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]/50 outline-none transition-all"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--muted)]">🕵‍♂️ All posts are anonymous</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAsk(false); setAskQuestion(''); }}
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-light)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAsk}
                disabled={asking || !askQuestion.trim()}
                className="px-5 py-2 bg-[var(--primary)] text-white text-xs font-medium rounded-lg hover:bg-[#6d28d9] disabled:opacity-40 transition-all"
              >
                {asking ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[var(--muted)]">
          {(activeFilter === 'all' ? doubts : doubts.filter(d => (d.postType || 'doubt') === activeFilter)).length} posts
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          🔓 Open campus feed
        </span>
      </div>

      {/* Empty state */}
      {doubts.length === 0 ? (
        <div className="text-center py-16 scale-in">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-orange-500/15 to-pink-500/15 flex items-center justify-center text-4xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
            📝
          </div>
          <p className="text-sm font-bold text-[var(--foreground)] mb-1">Feed is empty</p>
          <p className="text-xs text-[var(--muted)] mb-5">Be the first to post — doubts, confessions, hot takes</p>
          <button
            onClick={() => setShowAsk(true)}
            className="btn-primary text-xs inline-flex items-center gap-2"
          >
            Start the Feed
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {doubts.filter(d => activeFilter === 'all' || (d.postType || 'doubt') === activeFilter).map((doubt) => (
            <div
              key={doubt.id}
              className="card p-5 transition-all duration-300 glow-hover"
            >
              {/* Post type badge + Question */}
              {doubt.postType && doubt.postType !== 'doubt' && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary-light)] border border-[var(--primary)]/15 mb-2.5 font-semibold">
                  {POST_TYPES.find(pt => pt.id === doubt.postType)?.emoji} {POST_TYPES.find(pt => pt.id === doubt.postType)?.label}
                </span>
              )}
              <p className="text-sm text-[var(--foreground)] leading-relaxed mb-4">{doubt.question}</p>

              {/* Meta + Actions row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    {doubt.isAnonymous ? '🕵️' : '👤'}
                    <span className="text-[11px]">{doubt.isAnonymous ? 'Anonymous' : 'Named'}</span>
                  </span>
                  <span className="w-0.5 h-3 rounded-full bg-[var(--border)]" />
                  <span className="text-[11px]">{timeAgo(doubt.createdAt)}</span>
                  {doubt.status === 'resolved' && (
                    <span className="text-[var(--success)] font-semibold text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] inline-block" /> Resolved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleUpvote(doubt.id)}
                    className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--primary-light)] transition-all duration-200 px-2.5 py-1.5 rounded-xl hover:bg-[var(--primary)]/10"
                  >
                    ▲ {doubt.upvotes}
                  </button>
                  <button
                    onClick={() => loadReplies(doubt.id)}
                    className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--primary-light)] transition-all duration-200 px-2.5 py-1.5 rounded-xl hover:bg-[var(--primary)]/10"
                  >
                    💬 {expandedDoubt === doubt.id ? 'Hide' : 'Reply'}
                  </button>
                </div>
              </div>

              {/* Replies */}
              {expandedDoubt === doubt.id && (
                <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-3">
                  {(replies[doubt.id] || []).length === 0 ? (
                    <p className="text-xs text-[var(--muted)] italic">No replies yet — be the first to help!</p>
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
                        <p className="text-[var(--foreground)] text-xs leading-relaxed">{r.reply}</p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--muted)]">
                          <span>{r.isAnonymous ? '🕵️ Anonymous' : `👤 ${r.userName}`}</span>
                          <span className="opacity-40">•</span>
                          <span>{timeAgo(r.createdAt)}</span>
                          {r.isAccepted && (
                            <span className="text-[var(--success)] font-medium ml-1">✓ Accepted</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Reply Input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply(doubt.id)}
                      placeholder="Write a reply..."
                      className="flex-1 px-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface-light)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
                    />
                    <button
                      onClick={() => handleReply(doubt.id)}
                      disabled={!replyText.trim()}
                      className="px-3 py-2 bg-[var(--primary)] text-white text-xs rounded-lg hover:bg-[#6d28d9] disabled:opacity-40 transition-all"
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
