// ============================================
// MitrAI - Anonymous Chat Room Page
// Real-time messaging, reveal, report, block
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';
import { ROOM_TYPES } from '@/lib/anon-aliases';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface AnonMsg {
  id: string;
  roomId: string;
  senderId: string;
  alias: string;
  text: string;
  createdAt: string;
}

interface RoomData {
  room: { id: string; roomType: string; status: string; createdAt: string };
  myAlias: string;
  myRevealConsent: boolean;
  partnerAlias: string;
  partnerRevealConsent: boolean;
  partnerRealInfo: { name?: string; department?: string } | null;
  messages: AnonMsg[];
  messageCount: number;
}

export default function AnonChatRoomPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const { play: playSound } = useNotificationSound();

  const [data, setData] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<AnonMsg[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showReveal, setShowReveal] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState('');
  const [closed, setClosed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollMsgRef = useRef<NodeJS.Timeout | null>(null);

  // Load room data
  const loadRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/anon/${roomId}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Room not found');
        return;
      }
      setData(json.data);
      setMessages(json.data.messages);
      if (json.data.room.status === 'closed') setClosed(true);
    } catch {
      setError('Failed to load room');
    }
  }, [roomId]);

  useEffect(() => {
    if (!user) return;
    loadRoom();

    // Poll for new messages every 3 seconds as fallback for realtime
    pollMsgRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/anon/${roomId}`);
        const json = await res.json();
        if (json.success && json.data.messages) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = json.data.messages.filter((m: AnonMsg) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
          if (json.data.room.status === 'closed') setClosed(true);
        }
      } catch { /* ignore polling errors */ }
    }, 3000);

    return () => {
      if (pollMsgRef.current) clearInterval(pollMsgRef.current);
    };
  }, [user, loadRoom, roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;

    const channel = supabaseBrowser
      .channel(`anon-room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'anon_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new;
          const msg: AnonMsg = {
            id: row.id,
            roomId: row.room_id,
            senderId: row.sender_id,
            alias: row.alias,
            text: row.text,
            createdAt: row.created_at,
          };
          // 🔊 Play sound for incoming messages from partner
          if (msg.senderId !== user?.id) {
            playSound('message');
          }
          setMessages(prev => {
            // Skip if we already have this message (by real id or if it matches an optimistic one)
            if (prev.some(m => m.id === msg.id)) return prev;
            // Replace optimistic message if this is the same text from same sender
            const optimisticIndex = prev.findIndex(
              m => m.id.startsWith('optimistic_') && m.senderId === msg.senderId && m.text === msg.text
            );
            if (optimisticIndex >= 0) {
              const updated = [...prev];
              updated[optimisticIndex] = msg;
              return updated;
            }
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => { supabaseBrowser.removeChannel(channel); };
  }, [roomId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || sending || !data) return;
    const text = newMsg.trim();
    setSending(true);
    setNewMsg('');
    inputRef.current?.focus();

    // Optimistically add message to UI immediately
    const optimisticMsg: AnonMsg = {
      id: `optimistic_${Date.now()}`,
      roomId,
      senderId: user!.id,
      alias: data.myAlias,
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/anon/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', text }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        // Replace optimistic message with the real one from server
        setMessages(prev =>
          prev.map(m => m.id === optimisticMsg.id
            ? { ...json.data, roomId: json.data.roomId || roomId }
            : m
          )
        );
      }
    } catch { /* optimistic message stays visible */ }
    setSending(false);
  };

  const handleReveal = async () => {
    const res = await fetch(`/api/anon/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reveal' }),
    });
    const json = await res.json();
    if (json.success) {
      setShowReveal(false);
      loadRoom(); // Refresh to get updated state
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    await fetch(`/api/anon/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'report', reason: reportReason.trim() }),
    });
    setShowReport(false);
    setReportReason('');
  };

  const handleBlock = async () => {
    await fetch(`/api/anon/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'block' }),
    });
    setShowBlockConfirm(false);
    setClosed(true);
  };

  const handleClose = async () => {
    if (!confirm('Leave this anonymous chat? Messages will be lost.')) return;
    await fetch(`/api/anon/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' }),
    });
    setClosed(true);
  };

  // Close menu when tapping outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-[var(--muted)]">Please log in</p></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-[var(--error)]">{error}</p>
        <button onClick={() => router.push('/anon')} className="btn-primary text-sm px-4 py-2">Back to Lobby</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roomType = ROOM_TYPES.find(r => r.id === data.room.roomType);
  const isRevealed = data.room.status === 'revealed';
  const canReveal = messages.length >= 10 && !isRevealed;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/anon')} className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm">
              ← Back
            </button>
            <span className="text-xs font-semibold" style={{ color: roomType?.color || 'var(--primary)' }}>{roomType?.label?.charAt(0) || 'R'}</span>
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">{roomType?.label}</div>
              <div className="text-[10px] text-[var(--muted)]">
                You: <span className="text-[var(--primary)]">{data.myAlias}</span>
                {' · '}
                Partner: <span className="text-purple-400">
                  {isRevealed && data.partnerRealInfo ? `${data.partnerRealInfo.name} (${data.partnerRealInfo.department})` : data.partnerAlias}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canReveal && (
              <button
                onClick={() => setShowReveal(true)}
                className="text-[10px] px-2 py-1 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
              >
                {data.myRevealConsent ? '✓ Reveal sent' : 'Reveal'}
              </button>
            )}
            {isRevealed && (
              <span className="text-[10px] px-2 py-1 rounded-md bg-green-500/20 text-green-400">
                ✓ Revealed
              </span>
            )}
            {/* ⋯ Menu (replaces exposed report/block buttons) */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-lg px-2 py-1 rounded-md text-[var(--muted)] hover:bg-[var(--surface-light)] transition-colors"
                title="More options"
              >
                ⋯
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => { setShowMenu(false); setShowReport(true); }}
                    className="w-full px-4 py-3 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-light)] transition-colors flex items-center gap-2"
                  >
                    Report User
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); setShowBlockConfirm(true); }}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-[var(--border)]"
                  >
                    Block & Leave
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); handleClose(); }}
                    className="w-full px-4 py-3 text-left text-sm text-[var(--muted)] hover:bg-[var(--surface-light)] transition-colors flex items-center gap-2 border-t border-[var(--border)]"
                  >
                    Leave Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 pt-28 pb-24 px-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* System message */}
          <div className="text-center py-4">
            <p className="text-xs text-[var(--muted)] bg-[var(--surface)] inline-block px-3 py-1 rounded-full">
              {roomType?.label} — Chat started. Be kind & respectful.
            </p>
          </div>

          {messages.map(msg => {
            const isMe = msg.senderId === user.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                  <div className={`text-[10px] mb-0.5 ${isMe ? 'text-right text-[var(--primary)]' : 'text-left text-purple-400'}`}>
                    {msg.alias}
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-[var(--primary)] text-white rounded-tr-sm'
                      : 'bg-[var(--surface-light)] text-[var(--foreground)] rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <div className={`text-[9px] text-[var(--muted)] mt-0.5 ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}

          {closed && (
            <div className="text-center py-4">
              <p className="text-xs text-[var(--error)] bg-[var(--surface)] inline-block px-3 py-1 rounded-full">
                This chat has ended
              </p>
              <button
                onClick={() => router.push('/anon')}
                className="block mx-auto mt-3 btn-primary text-xs px-4 py-2"
              >
                Back to Lobby
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      {!closed && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--background)] border-t border-[var(--border)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              maxLength={1000}
              enterKeyHint="send"
              autoComplete="off"
              className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted)]"
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() || sending}
              className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Block Confirmation Modal */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Block User</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Are you sure you want to block this user? This will close the chat and they won&apos;t be matched with you again.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-[var(--muted)] text-sm">
                Cancel
              </button>
              <button
                onClick={handleBlock}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reveal Modal */}
      {showReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Reveal Identity</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Both of you must consent. Once both agree, your real names will be shown.
              You need at least 10 messages in this chat.
            </p>
            <div className="flex items-center gap-3 mb-4 text-sm">
              <div className={`px-3 py-1 rounded-full text-xs ${data.myRevealConsent ? 'bg-green-500/20 text-green-400' : 'bg-[var(--surface)] text-[var(--muted)]'}`}>
                You: {data.myRevealConsent ? '✓ Ready' : 'Not yet'}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs ${data.partnerRevealConsent ? 'bg-green-500/20 text-green-400' : 'bg-[var(--surface)] text-[var(--muted)]'}`}>
                Partner: {data.partnerRevealConsent ? '✓ Ready' : 'Not yet'}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReveal(false)} className="flex-1 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] text-sm">Cancel</button>
              <button
                onClick={handleReveal}
                className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
              >
                {data.myRevealConsent ? 'Withdraw Consent' : 'I Agree to Reveal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Report User</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Help keep the community safe. False reports may result in your own ban.
            </p>
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm mb-4"
            >
              <option value="">Select a reason...</option>
              <option value="harassment">Harassment or bullying</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="spam">Spam or ads</option>
              <option value="threats">Threats or violence</option>
              <option value="doxxing">Trying to identify me</option>
              <option value="other">Other</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => { setShowReport(false); setReportReason(''); }} className="flex-1 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] text-sm">Cancel</button>
              <button
                onClick={handleReport}
                disabled={!reportReason}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-red-700 transition-colors"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
