// ============================================
// MitrRAI - Anonymous Chat Room Page
// WhatsApp-style rewrite: 100dvh, flex layout,
// React.memo bubbles, textarea, smart scroll
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';
import { ROOM_TYPES } from '@/lib/anon-aliases';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useChatStability } from '@/hooks/useChatStability';
import { useChatScroll } from '@/hooks/useChatScroll';
import { ArrowLeft, Send, MoreVertical } from 'lucide-react';

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

/* ─── Memoized Message Bubble ─── */
const AnonBubble = memo(function AnonBubble({
  msg, isMe,
}: {
  msg: AnonMsg;
  isMe: boolean;
}) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        style={{ maxWidth: '75%', wordBreak: 'break-word', overflowWrap: 'break-word' }}
      >
        {/* Alias label */}
        <div className={`text-[10px] mb-0.5 ${isMe ? 'text-right text-[#7c71ff]' : 'text-left text-purple-400'}`}>
          {msg.alias}
        </div>
        {/* Bubble */}
        <div
          className="px-3 py-2 whitespace-pre-wrap"
          style={{
            background: isMe ? '#7c71ff' : '#1e1e1e',
            color: '#fff',
            fontSize: '14px',
            lineHeight: '1.45',
            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          }}
        >
          {msg.text}
          <div className={`flex items-center mt-1 ${isMe ? 'justify-end' : ''}`}>
            <span style={{ fontSize: '10px', color: isMe ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }}>
              {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function AnonChatRoomPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const { play: playSound } = useNotificationSound();
  useChatStability();

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollMsgRef = useRef<NodeJS.Timeout | null>(null);

  const { containerRef, bottomRef, forceScrollToBottom, handleScroll, userAtBottom } = useChatScroll([messages, sending]);

  // Load room data
  const loadRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/anon/${roomId}`);
      const json = await res.json();
      if (!json.success) { setError(json.error || 'Room not found'); return; }
      setData(json.data);
      setMessages(json.data.messages);
      if (json.data.room.status === 'closed') setClosed(true);
    } catch { setError('Failed to load room'); }
  }, [roomId]);

  useEffect(() => {
    if (!user) return;
    loadRoom();
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
      } catch { /* ignore */ }
    }, 3000);
    return () => { if (pollMsgRef.current) clearInterval(pollMsgRef.current); };
  }, [user, loadRoom, roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;
    const channel = supabaseBrowser
      .channel(`anon-room-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'anon_messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        const row = payload.new;
        const msg: AnonMsg = { id: row.id, roomId: row.room_id, senderId: row.sender_id, alias: row.alias, text: row.text, createdAt: row.created_at };
        if (msg.senderId !== user?.id) playSound('message');
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          const oi = prev.findIndex(m => m.id.startsWith('optimistic_') && m.senderId === msg.senderId && m.text === msg.text);
          if (oi >= 0) { const u = [...prev]; u[oi] = msg; return u; }
          return [...prev, msg];
        });
      })
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [playSound, roomId, user?.id]);

  // Initial scroll
  useEffect(() => { setTimeout(() => forceScrollToBottom('instant'), 150); }, [forceScrollToBottom]);

  const sendMessage = async () => {
    if (!newMsg.trim() || sending || !data) return;
    const text = newMsg.trim();
    setSending(true);
    setNewMsg('');
    if (textareaRef.current) textareaRef.current.style.height = '40px';
    userAtBottom.current = true;

    const optimisticMsg: AnonMsg = { id: `optimistic_${Date.now()}`, roomId, senderId: user!.id, alias: data.myAlias, text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/anon/${roomId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'message', text }) });
      const json = await res.json();
      if (json.success && json.data) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...json.data, roomId: json.data.roomId || roomId } : m));
      }
    } catch { /* optimistic stays */ }
    setSending(false);
  };

  const handleReveal = async () => {
    const res = await fetch(`/api/anon/${roomId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reveal' }) });
    const json = await res.json();
    if (json.success) { setShowReveal(false); loadRoom(); }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    await fetch(`/api/anon/${roomId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'report', reason: reportReason.trim() }) });
    setShowReport(false); setReportReason('');
  };

  const handleBlock = async () => {
    await fetch(`/api/anon/${roomId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'block' }) });
    setShowBlockConfirm(false); setClosed(true);
  };

  const handleClose = async () => {
    if (!confirm('Leave this anonymous chat? Messages will be lost.')) return;
    await fetch(`/api/anon/${roomId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close' }) });
    setClosed(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  /* ─── Textarea auto-resize ─── */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMsg(e.target.value);
    const ta = e.target;
    ta.style.height = '40px';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-white/40">Please log in</p></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center flex-col gap-4"><p className="text-red-400">{error}</p><button onClick={() => router.push('/anon')} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm">Back to Lobby</button></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  const roomType = ROOM_TYPES.find(r => r.id === data.room.roomType);
  const isRevealed = data.room.status === 'revealed';
  const canReveal = messages.length >= 10 && !isRevealed;

  return (
    <div className="flex flex-col" style={{ height: 'calc(var(--vh, 1vh) * 100)', maxHeight: '100dvh', background: '#090909', overflow: 'hidden' }}>
      {/* ─── Header ─── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5" style={{ background: '#111111', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => router.push('/anon')} className="p-1 -ml-1 text-white hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg`} style={{ background: roomType?.color || '#7c71ff' }}>
            {roomType?.label?.charAt(0) || 'R'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-semibold text-white truncate leading-tight flex items-center gap-2">
            {roomType?.label}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${closed ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className="text-[11px] text-green-400">
              {closed ? 'Chat closed' : 'Online'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canReveal && (
            <button onClick={() => setShowReveal(true)} className="text-[10px] px-2 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
              {data.myRevealConsent ? '✓ Reveal sent' : 'Reveal'}
            </button>
          )}
          {isRevealed && <span className="text-[10px] px-2 py-1 rounded-lg bg-green-500/20 text-green-400">✓ Revealed</span>}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-xl text-white/40 hover:text-white transition-colors">
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-2xl z-50 overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => { setShowMenu(false); setShowReport(true); }} className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/[0.04] transition-colors">Report User</button>
                <button onClick={() => { setShowMenu(false); setShowBlockConfirm(true); }} className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/[0.06]">Block & Leave</button>
                <button onClick={() => { setShowMenu(false); handleClose(); }} className="w-full px-4 py-3 text-left text-sm text-white/50 hover:bg-white/[0.04] transition-colors border-t border-white/[0.06]">Leave Chat</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-3" style={{ overscrollBehavior: 'contain' }}>
        {/* System message */}
        <div className="text-center py-3 mb-2">
          <p className="text-[10px] text-white/30 inline-block px-3 py-1 rounded-full" style={{ background: '#141414' }}>
            {roomType?.label} — Chat started. Be kind & respectful.
          </p>
        </div>

        {messages.map((msg, index) => {
          const isMe = msg.senderId === user.id;
          const isLast = index === messages.length - 1 || messages[index + 1].senderId !== msg.senderId;
          return <AnonBubble key={msg.id} msg={msg} isMe={isMe} />;
        })}

        {closed && (
          <div className="text-center py-4">
            <p className="text-xs text-red-400 inline-block px-3 py-1 rounded-full" style={{ background: '#141414' }}>This chat has ended</p>
            <button onClick={() => router.push('/anon')} className="block mx-auto mt-3 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs">Back to Lobby</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ─── Input Bar ─── */}
      {!closed && (
        <div className="shrink-0 flex items-end gap-2 px-3 py-2" style={{ background: '#111111', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
          <textarea
            ref={textareaRef}
            value={newMsg}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={1000}
            rows={1}
            disabled={sending}
            className="flex-1 resize-none bg-[#1e1e1e] text-white text-[15px] placeholder:text-white/40 rounded-[20px] px-4 py-2.5 outline-none tracking-tight transition-colors disabled:opacity-50"
            style={{ minHeight: '40px', maxHeight: '160px', lineHeight: '1.4' }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMsg.trim() || sending}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:scale-100"
            style={{ background: '#7c71ff' }}
          >
            <Send size={18} className="text-white ml-0.5" />
          </button>
        </div>
      )}

      {/* ─── Block Confirmation ─── */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-lg font-bold text-white mb-2">Block User</h3>
            <p className="text-sm text-white/40 mb-4">Are you sure? This will close the chat and they won&apos;t be matched with you again.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/8">Cancel</button>
              <button onClick={handleBlock} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white">Block</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reveal Modal ─── */}
      {showReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-lg font-bold text-white mb-2">Reveal Identity</h3>
            <p className="text-sm text-white/40 mb-4">Both must consent. Once both agree, real names are shown. 10+ messages required.</p>
            <div className="flex items-center gap-3 mb-4 text-sm">
              <div className={`px-3 py-1 rounded-full text-xs ${data.myRevealConsent ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40'}`}>
                You: {data.myRevealConsent ? '✓ Ready' : 'Not yet'}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs ${data.partnerRevealConsent ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40'}`}>
                Partner: {data.partnerRevealConsent ? '✓ Ready' : 'Not yet'}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReveal(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/8">Cancel</button>
              <button onClick={handleReveal} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white">
                {data.myRevealConsent ? 'Withdraw Consent' : 'I Agree to Reveal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Report Modal ─── */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-lg font-bold text-white mb-2">Report User</h3>
            <p className="text-sm text-white/40 mb-4">Help keep the community safe. False reports may result in your own ban.</p>
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/8 bg-[#1e1e1e] text-white text-sm mb-4"
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
              <button onClick={() => { setShowReport(false); setReportReason(''); }} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/8">Cancel</button>
              <button onClick={handleReport} disabled={!reportReason} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white disabled:opacity-40">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
