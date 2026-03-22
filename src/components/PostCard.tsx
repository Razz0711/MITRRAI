'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, MoreHorizontal, Trash2, Flag, Users, MessageCircle, Zap, Send, X, ChevronDown, ChevronUp } from 'lucide-react';
import Avatar from './Avatar';
import { useAuth } from '@/lib/auth';

interface PostCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: any;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
}

interface InterestedUser {
  id: string;
  name: string;
  department?: string;
  year_level?: string;
}

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

function getCategoryAccent(categoryId: string, isSos?: boolean): string {
  if (isSos) return '#ef4444';
  const map: Record<string, string> = {
    study: '#3b82f6', sports: '#22c55e', hangout: '#f59e0b', food: '#f97316',
    creative: '#a855f7', fitness: '#06b6d4', talk: '#ec4899', sos: '#ef4444',
  };
  return map[categoryId] || '#7c3aed';
}

const AVATAR_COLORS = [
  'from-violet-600 to-purple-700','from-emerald-600 to-teal-700','from-blue-600 to-indigo-700','from-pink-600 to-rose-700',
  'from-amber-600 to-orange-700','from-cyan-600 to-sky-700',
];
function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function PostCard({
  post, userLat, userLng, userId, onReact, menuPostId, setMenuPostId,
  deleteConfirm: _deleteConfirm, setDeleteConfirm, onDelete: _onDelete, isSos, isOlder, categories
}: PostCardProps) {
  const router = useRouter();
  const { user } = useAuth();

  const freshness = getFreshness(post.createdAt);
  const isOwn = post.userId === userId;
  const distance = (userLat && userLng && post.lat && post.lng) ? haversineDistance(userLat, userLng, post.lat, post.lng) : null;
  const catInfo = categories.find(c => c.id === post.category);
  const accentColor = getCategoryAccent(post.category, isSos);

  const iminCount = post.reactions?.imin ?? 0;
  const connectCount = post.reactions?.connect ?? 0;
  const iminActive = post.myReactions?.includes('imin');
  const connectActive = post.myReactions?.includes('connect');

  // "I'm in" interested viewers (post author only)
  const [showInterested, setShowInterested] = useState(false);
  const [interestedUsers, setInterestedUsers] = useState<InterestedUser[]>([]);
  const [interestedLoading, setInterestedLoading] = useState(false);

  // Comments (Reply)
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentsSeen, setCommentsSeen] = useState(false);

  const handleIminClick = useCallback(async () => {
    if (isOwn && iminCount > 0) {
      // Post author → show who's interested
      setShowInterested(prev => !prev);
      if (!showInterested && interestedUsers.length === 0) {
        setInterestedLoading(true);
        try {
          const res = await fetch(`/api/feed/${post.id}?action=imin_users`);
          const data = await res.json();
          if (data.success) setInterestedUsers(data.data);
        } catch { /* ignore */ } finally { setInterestedLoading(false); }
      }
    } else {
      // Other user → toggle interest
      onReact(post.id, 'imin');
    }
  }, [isOwn, iminCount, showInterested, interestedUsers.length, post.id, onReact]);

  const handleConnectClick = useCallback(() => {
    // Always record the reaction
    onReact(post.id, 'connect');
    // Navigate to chat if non-anonymous and has a userId
    if (!post.isAnonymous && post.userId) {
      router.push(`/chat?friendId=${encodeURIComponent(post.userId)}&friendName=${encodeURIComponent(post.userName || 'Student')}`);
    }
  }, [post.id, post.isAnonymous, post.userId, post.userName, onReact, router]);

  const handleReplyClick = useCallback(async () => {
    setShowComments(prev => !prev);
    if (!commentsSeen) {
      setCommentsSeen(true);
      setCommentsLoading(true);
      try {
        const res = await fetch(`/api/feed/${post.id}?action=comments`);
        const data = await res.json();
        if (data.success) setComments(data.data);
      } catch { /* ignore */ } finally { setCommentsLoading(false); }
    }
  }, [commentsSeen, post.id]);

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return;
    const text = commentText.trim();
    setCommentText('');
    try {
      const res = await fetch(`/api/feed/${post.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', content: text }),
      });
      const data = await res.json();
      if (data.success) setComments(prev => [...prev, data.data]);
    } catch { /* ignore */ }
  };

  return (
    <div
      className={`animate-appear relative overflow-hidden rounded-2xl transition-all ${isOlder ? 'opacity-70' : ''}`}
      style={{
        background: 'var(--surface-card)',
        borderLeft: `3px solid ${accentColor}`,
        boxShadow: isSos
          ? `0 2px 12px rgba(239,68,68,0.15), 0 0 0 1px rgba(239,68,68,0.2)`
          : `var(--shadow-card)`,
      }}
    >
      {/* Fresh pulse line */}
      {freshness === 'fresh' && !isSos && (
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #22c55e, transparent)' }} />
      )}

      <div className="p-3.5 space-y-2.5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          {post.isAnonymous ? (
            <div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Sparkles size={15} className="text-purple-400" />
            </div>
          ) : (
            <Avatar src={post.userPhotoUrl} name={post.userName || 'U'} size={36} />
          )}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-[var(--foreground)] truncate block">
              {post.isAnonymous ? 'Anonymous' : (post.userName || 'Someone')}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {distance !== null && (
                <span className="text-[11px] text-amber-400 font-medium">{formatDistance(distance)}</span>
              )}
              <span className="text-[11px] text-[var(--muted-strong)]">{timeAgo(post.createdAt)}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isSos ? 'bg-red-500/20 text-red-400' :
                freshness === 'fresh' ? 'bg-green-500/20 text-green-400' :
                freshness === 'active' ? 'bg-blue-500/15 text-blue-400' :
                'bg-white/6 text-[var(--muted-strong)]'
              }`}>
                {isSos ? '🆘 SOS' : freshness === 'fresh' ? '🔥 live' : freshness}
              </span>
            </div>
          </div>
          <button
            onClick={() => setMenuPostId(menuPostId === post.id ? null : post.id)}
            className="p-1.5 shrink-0 rounded-lg hover:bg-white/8 text-[var(--muted)] transition-colors"
          >
            <MoreHorizontal size={15} />
          </button>
        </div>

        {/* Menu */}
        {menuPostId === post.id && (
          <div className="flex gap-2 px-1">
            {isOwn ? (
              <button
                onClick={() => { setDeleteConfirm(post.id); setMenuPostId(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-[11px] font-medium border border-red-500/15"
              >
                <Trash2 size={11} /> Delete post
              </button>
            ) : (
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-[var(--muted-strong)] text-[11px] font-medium border border-white/8">
                <Flag size={11} /> Report
              </button>
            )}
          </div>
        )}

        {/* Category tags */}
        <div className="flex flex-wrap gap-1.5">
          {catInfo && (
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold"
              style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}>
              {catInfo.emoji} {catInfo.label}
            </span>
          )}
          {post.subcategory && (
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-white/6 text-[var(--foreground)] border border-white/8">
              {post.subcategory}
            </span>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-[var(--foreground)] leading-relaxed">{post.content}</p>

        {/* Action row */}
        <div className="flex items-center gap-1 pt-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

          {/* I'm in */}
          <button
            onClick={handleIminClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ${
              isOwn && iminCount > 0
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : iminActive
                ? 'bg-[var(--primary)] text-white shadow-sm shadow-[var(--primary)]/30'
                : 'text-[var(--muted-strong)] hover:bg-white/6 hover:text-[var(--foreground)]'
            }`}
          >
            <Users size={12} />
            {isOwn && iminCount > 0
              ? `${iminCount} interested ${showInterested ? '▲' : '▼'}`
              : iminCount > 0 ? iminCount : "I'm in"}
          </button>

          {/* Reply */}
          <button
            onClick={handleReplyClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ${
              showComments
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-[var(--muted-strong)] hover:bg-white/6 hover:text-[var(--foreground)]'
            }`}
          >
            <MessageCircle size={12} />
            {comments.length > 0 ? comments.length : 'Reply'}
            {showComments ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {/* Connect */}
          <button
            onClick={handleConnectClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ml-auto ${
              connectActive
                ? 'bg-green-500/20 text-green-400'
                : 'text-[var(--muted-strong)] hover:bg-white/6 hover:text-[var(--foreground)]'
            }`}
          >
            <Zap size={12} />
            {post.isAnonymous ? 'Anonymous' : connectCount > 0 ? `${connectCount} connect` : 'Connect'}
          </button>
        </div>

        {/* ─── Interested Users Panel (post author only) ─── */}
        {isOwn && showInterested && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Interested People</p>
              <button onClick={() => setShowInterested(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                <X size={13} />
              </button>
            </div>
            {interestedLoading && <p className="text-xs text-[var(--muted)] text-center py-2">Loading…</p>}
            {!interestedLoading && interestedUsers.length === 0 && (
              <p className="text-xs text-[var(--muted)] text-center py-2">No one yet</p>
            )}
            {interestedUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(u.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--foreground)] truncate">{u.name}</p>
                  <p className="text-[10px] text-[var(--muted)] truncate">{[u.department, u.year_level].filter(Boolean).join(' · ')}</p>
                </div>
                <button
                  onClick={() => router.push(`/chat?friendId=${encodeURIComponent(u.id)}&friendName=${encodeURIComponent(u.name)}`)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-all shrink-0"
                >
                  💬 Chat
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ─── Comments Section ─── */}
        {showComments && (
          <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-2.5">
            <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Replies</p>

            {commentsLoading && <p className="text-xs text-[var(--muted)] text-center py-2">Loading…</p>}

            {!commentsLoading && comments.length === 0 && (
              <p className="text-xs text-[var(--muted)] text-center py-1">Be the first to reply!</p>
            )}

            {comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarGradient(c.user_name)} flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5`}>
                  {c.user_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-semibold text-[var(--foreground)]">{c.user_name}</span>
                    <span className="text-[9px] text-[var(--muted)]">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-[var(--foreground)] leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}

            {/* Comment input */}
            <div className="flex gap-2 items-center pt-1 border-t border-white/6">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                placeholder="Write a reply…"
                maxLength={200}
                className="flex-1 bg-transparent text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="p-1.5 rounded-lg bg-[var(--primary)]/20 text-[var(--primary-light)] hover:bg-[var(--primary)]/30 disabled:opacity-40 transition-all"
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
