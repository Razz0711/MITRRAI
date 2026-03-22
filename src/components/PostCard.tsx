'use client';

import { Sparkles, MoreHorizontal, Trash2, Flag, Users, MessageCircle, Zap } from 'lucide-react';
import Avatar from './Avatar';

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

// Category → accent color for the left border
function getCategoryAccent(categoryId: string, isSos?: boolean): string {
  if (isSos) return '#ef4444';
  const map: Record<string, string> = {
    study: '#3b82f6',
    sports: '#22c55e',
    hangout: '#f59e0b',
    food: '#f97316',
    creative: '#a855f7',
    fitness: '#06b6d4',
    talk: '#ec4899',
    sos: '#ef4444',
  };
  return map[categoryId] || '#7c3aed';
}

export default function PostCard({
  post, userLat, userLng, userId, onReact, menuPostId, setMenuPostId, deleteConfirm: _deleteConfirm, setDeleteConfirm, onDelete: _onDelete, isSos, isOlder, categories
}: PostCardProps) {
  const freshness = getFreshness(post.createdAt);
  const isOwn = post.userId === userId;
  const distance = (userLat && userLng && post.lat && post.lng) ? haversineDistance(userLat, userLng, post.lat, post.lng) : null;
  const catInfo = categories.find(c => c.id === post.category);
  const accentColor = getCategoryAccent(post.category, isSos);

  const iminCount = post.reactions?.imin ?? 0;
  const connectCount = post.reactions?.connect ?? 0;
  const iminActive = post.myReactions?.includes('imin');
  const replyActive = post.myReactions?.includes('reply');
  const connectActive = post.myReactions?.includes('connect');

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
      {/* Fresh pulse line at top */}
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
            <span
              className="px-2 py-0.5 rounded-lg text-[11px] font-semibold"
              style={{
                background: `${accentColor}18`,
                color: accentColor,
                border: `1px solid ${accentColor}30`,
              }}
            >
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

        {/* Divider + action row */}
        <div className="flex items-center gap-1 pt-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* I'm in */}
          <button
            onClick={() => onReact(post.id, 'imin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ${
              iminActive
                ? 'bg-[var(--primary)] text-white shadow-sm shadow-[var(--primary)]/30'
                : 'text-[var(--muted-strong)] hover:bg-white/6 hover:text-[var(--foreground)]'
            }`}
          >
            <Users size={12} />
            {iminCount > 0 ? iminCount : "I'm in"}
          </button>

          {/* Reply */}
          <button
            onClick={() => onReact(post.id, 'reply')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ${
              replyActive
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-[var(--muted-strong)] hover:bg-white/6 hover:text-[var(--foreground)]'
            }`}
          >
            <MessageCircle size={12} />
            Reply
          </button>

          {/* Connect */}
          <button
            onClick={() => onReact(post.id, 'connect')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ml-auto ${
              connectActive
                ? 'bg-green-500/20 text-green-400'
                : 'text-[var(--muted-strong)] hover:bg-white/6 hover:text-[var(--foreground)]'
            }`}
          >
            <Zap size={12} />
            {connectCount > 0 ? `${connectCount} connected` : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
