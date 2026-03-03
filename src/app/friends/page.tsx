// ============================================
// MitrAI - Friends & Ratings Page
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Friendship, FriendRequest, BuddyRating, UserStatus } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useNotificationSound } from '@/hooks/useNotificationSound';

export default function FriendsPage() {
  const { user } = useAuth();
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

  // Direct call: generate room code, send realtime invite + push + chat, navigate
  const startCallWithFriend = (fId: string, fName: string, mode: 'voice' | 'video') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

    if (user) {
      const userName = user.name || user.email?.split('@')[0] || 'Study Buddy';
      const callPayload = { callerId: user.id, callerName: userName, mode, roomCode: code };

      // Fire ALL notifications in parallel — don't block navigation

      // 1) Broadcast Realtime call-invite (triggers IncomingCallBanner)
      //    Send multiple times over 6s to handle timing issues with receiver's channel
      try {
        const channel = supabaseBrowser.channel(`call-invite:${fId}`);
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            const sendBroadcast = () => channel.send({ type: 'broadcast', event: 'incoming-call', payload: callPayload }).catch(() => {});
            // Send immediately + retry 3 times over 6 seconds for reliability
            sendBroadcast();
            setTimeout(sendBroadcast, 2000);
            setTimeout(sendBroadcast, 4000);
            setTimeout(() => {
              sendBroadcast();
              setTimeout(() => supabaseBrowser.removeChannel(channel), 2000);
            }, 6000);
          }
        });
      } catch (e) { console.error('Realtime call-invite broadcast error:', e); }

      // 2) Push notification + chat message in parallel (fire-and-forget)
      fetch('/api/call-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: fId, callerName: userName, mode, roomCode: code }),
      }).catch(() => {});

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          senderName: userName,
          receiverId: fId,
          receiverName: fName,
          text: `📞 I'm calling you! Join my ${mode} call with code: ${code}\n\nJoin here: ${window.location.origin}/call?mode=${mode}&room=${code}`,
        }),
      }).catch(() => {});
    }

    // Navigate immediately — don't wait for network calls
    window.location.href = `/call?mode=${mode}&room=${code}&buddy=${encodeURIComponent(fName)}&friendId=${encodeURIComponent(fId)}`;
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setFriends(data.data.friends || []);
        const newPending: FriendRequest[] = data.data.pendingRequests || [];
        // 🔊 Play sound if there are new pending friend requests
        setPendingRequests(prev => {
          if (newPending.length > prev.length && prev.length > 0) {
            playSound('important');
          }
          return newPending;
        });
        setRatingsReceived(data.data.ratingsReceived || []);
        setRatingsGiven(data.data.ratingsGiven || []);
        setAvgRating(data.data.averageRating || 0);
        
        // Load online statuses for all friends
        const friendsList: Friendship[] = data.data.friends || [];
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
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">
            <span className="gradient-text">Friends & Ratings</span>
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Your study buddies network
          </p>
        </div>
        {avgRating > 0 && (
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-[var(--primary-light)]">{avgRating}</p>
            <p className="text-[10px] text-[var(--muted)]">Avg Rating / 10</p>
            <div className="flex gap-0.5 mt-1 justify-center">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-3 rounded-sm ${
                    i < Math.round(avgRating) ? 'bg-[var(--primary)]' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

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
          {/* Search */}
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
              <Link href="/matches" className="btn-primary text-xs">
                Find Matches
              </Link>
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
          {/* Received Ratings */}
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

          {/* Given Ratings */}
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
              <div
                key={i}
                className={`w-1 h-2 rounded-sm ${
                  i < rating.rating ? 'bg-[var(--primary)]' : 'bg-white/10'
                }`}
              />
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
