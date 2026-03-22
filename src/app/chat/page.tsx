// ============================================
// MitrRAI - Chat Page (WhatsApp-style rewrite)
// Full screen 100dvh, React.memo bubbles,
// visualViewport keyboard handling, smart scroll
// ============================================

'use client';

import { useState, useRef, useEffect, useCallback, memo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DirectMessage, ChatThread, UserStatus, MatchResult } from '@/lib/types';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useChatStability } from '@/hooks/useChatStability';
import { useChatScroll } from '@/hooks/useChatScroll';
import { ArrowLeft, Send } from 'lucide-react';

/* ─── Memoized Message Bubble ─── */
const MessageBubble = memo(function MessageBubble({
  msg,
  isMe,
}: {
  msg: DirectMessage;
  isMe: boolean;
}) {
  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 animate-appear`}>
      <div className="px-3 py-2" style={{
        maxWidth: '75%',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        background: isMe ? 'var(--primary)' : '#1e1e1e',
        color: '#fff',
        fontSize: '14px',
        lineHeight: '1.45',
        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      }}>
        <p className="whitespace-pre-wrap">{msg.text}</p>
        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <span style={{ fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.65)' }}>
            {formatTime(msg.createdAt)}
          </span>
          {isMe && (
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>
              {msg.read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

function ChatContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { play: playSound } = useNotificationSound();
  useChatStability();


  /* ─── visualViewport keyboard handler ─── */
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const messagesEnd = document.getElementById('chat-messages-end');
    const handleResize = () => {
      const root = document.getElementById('chat-root');
      if (!root) return;
      root.style.height = viewport.height + 'px';
      root.style.top = viewport.offsetTop + 'px';
      messagesEnd?.scrollIntoView({ behavior: 'instant', block: 'end' });
    };
    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);
    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  const friendId = searchParams.get('friendId');
  const friendName = searchParams.get('friendName');

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { containerRef: chatScrollRef, bottomRef: messagesEndRef, forceScrollToBottom, handleScroll, userAtBottom } = useChatScroll([messages, sending]);

  const studentId = typeof window !== 'undefined' ? localStorage.getItem('mitrrai_student_id') || user?.id : user?.id;

  // For the exact WhatsApp layout, we need to know the active chat ID.
  // If no chat is selected, we should redirect to /friends (or render a thread list).
  // The user asked to rewrite /chat/page.tsx to be a direct full screen chat.
  // So we assume the selected chat is derived from friendId, OR the first thread.
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    if (friendId && studentId) {
      const cid = [studentId, friendId].sort().join('__');
      setSelectedChatId(cid);
    }
  }, [friendId, studentId]);

  /* ─── Fetchers ─── */
  const loadThreads = useCallback(async () => {
    if (!studentId) return;
    try {
      const [tRes, sRes] = await Promise.all([fetch(`/api/chat?userId=${studentId}`), fetch('/api/status')]);
      const tD = await tRes.json(); setThreads(tD.threads || []);
      const sD = await sRes.json();
      if (sD.success) {
        const m: Record<string, UserStatus> = {}; 
        (sD.data || []).forEach((s: UserStatus) => { m[s.userId] = s; }); 
        setStatuses(m);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [studentId]);

  const loadMessages = useCallback(async () => {
    if (!selectedChatId || !studentId) return;
    try {
      const res = await fetch(`/api/chat?chatId=${selectedChatId}&userId=${studentId}`);
      const data = await res.json();
      const serverMsgs: DirectMessage[] = data.messages || [];
      setMessages(prev => {
        const optimistic = prev.filter(m => m.id.startsWith('optimistic_') && !serverMsgs.some(s => s.text === m.text && s.senderId === m.senderId));
        return [...serverMsgs, ...optimistic];
      });
    } catch { /* ignore */ }
  }, [selectedChatId, studentId]);

  const markRead = useCallback(async () => {
    if (!selectedChatId || !studentId) return;
    try { await fetch('/api/chat', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: selectedChatId, userId: studentId }) }); } catch { /* ignore */ }
  }, [selectedChatId, studentId]);

  const loadMatchScores = useCallback(async () => {
    if (!studentId) return;
    try {
      const r = await fetch('/api/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId }) }); const d = await r.json();
      if (d.success && d.data.matches) { const sc: Record<string, number> = {}; d.data.matches.forEach((m: MatchResult) => { sc[m.student.id] = m.score.overall; }); setMatchScores(sc); }
    } catch { /* ignore */ }
  }, [studentId]);

  useEffect(() => { loadThreads(); loadMatchScores(); }, [loadThreads, loadMatchScores]);
  useEffect(() => { if (selectedChatId) { loadMessages(); markRead(); } }, [selectedChatId, loadMessages, markRead]);

  // Initial scroll
  useEffect(() => { setTimeout(() => forceScrollToBottom('instant'), 150); }, [forceScrollToBottom, selectedChatId]);

  // Realtime
  useEffect(() => {
    if (!studentId) return;
    const msgCh = supabaseBrowser.channel('chat-messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const row = payload.new as Record<string, string> | undefined; if (!row) return;
      if (row.sender_id !== studentId && row.receiver_id !== studentId) return;
      if (row.sender_id !== studentId && row.chat_id === selectedChatId) playSound('message');
      
      if (selectedChatId && row.chat_id === selectedChatId) {
        const nm: DirectMessage = { id: row.id, chatId: row.chat_id, senderId: row.sender_id, senderName: row.sender_name || '', receiverId: row.receiver_id || '', text: row.text, read: row.read === 'true', createdAt: row.created_at };
        setMessages(prev => {
          if (prev.some(m => m.id === nm.id)) return prev;
          const oi = prev.findIndex(m => m.id.startsWith('optimistic_') && m.senderId === nm.senderId && m.text === nm.text);
          if (oi >= 0) { const u = [...prev]; u[oi] = nm; return u; }
          return [...prev, nm];
        });
        if (row.sender_id !== studentId) markRead();
      }
      loadThreads();
    }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
      const row = payload.new as Record<string, string> | undefined; if (!row) return;
      if (selectedChatId && row.chat_id === selectedChatId) setMessages(prev => prev.map(m => m.id === row.id ? { ...m, read: row.read === 'true' || (row.read as unknown) === true } : m));
    }).subscribe();

    return () => { supabaseBrowser.removeChannel(msgCh); };
  }, [studentId, selectedChatId, playSound, markRead, loadThreads]);

  /* ─── Send Message ─── */
  const sendMessage = async () => {
    const text = newMsg.trim();
    if (!text || !selectedChatId || !studentId || sending) return;
    
    let receiverId: string, receiverName: string;
    const st = threads.find(t => t.chatId === selectedChatId);
    if (st) {
      receiverId = st.user1Id === studentId ? st.user2Id : st.user1Id;
      receiverName = st.user1Id === studentId ? st.user2Name : st.user1Name;
    } else if (friendId && friendName) {
      receiverId = friendId;
      receiverName = friendName;
    } else {
      return;
    }

    setSending(true);
    setNewMsg('');
    if (textareaRef.current) textareaRef.current.style.height = '40px';
    userAtBottom.current = true;

    const oid = `optimistic_${Date.now()}`;
    const om: DirectMessage = { id: oid, chatId: selectedChatId, senderId: studentId, senderName: user?.name || 'Unknown', receiverId, text, read: false, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, om]);

    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senderId: studentId, senderName: user?.name || 'Unknown', receiverId, receiverName, text }) });
      const d = await r.json();
      if (d.message) setMessages(prev => prev.map(m => m.id === oid ? { ...d.message } : m));
      loadThreads();
    } catch { /* Error logged to console, optimistic stays */ }
    setSending(false);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMsg(e.target.value);
    const ta = e.target;
    ta.style.height = '40px';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-[#090909]"><div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!user || !studentId) return <div className="min-h-screen flex items-center justify-center bg-[#090909]"><p className="text-white/60">Please log in</p></div>;

  // If no chat is selected (and no friendId in URL to start one), render thread list.
  // We rewrite this into a clean list view.
  const formatThreadTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  if (!selectedChatId) {
    return (
      <div id="chat-root" className="flex flex-col" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--background)', overflow: 'hidden' }}>
        <div className="shrink-0 flex items-center gap-3 px-4 py-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)' }}>
          <button onClick={() => router.push('/friends')} className="p-1.5 -ml-1 rounded-xl hover:bg-white/8 text-[var(--muted)] transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[var(--foreground)]">Your Chats</h1>
            {threads.length > 0 && <p className="text-[11px] text-[var(--muted-strong)]">{threads.length} conversation{threads.length !== 1 ? 's' : ''}</p>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 mt-16 text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-[var(--primary)]/10 flex items-center justify-center text-4xl">💬</div>
              <div>
                <p className="text-[var(--foreground)] font-bold text-lg mb-1">No chats yet</p>
                <p className="text-[var(--muted-strong)] text-sm">Find your study buddy or hangout partner</p>
              </div>
              <button onClick={() => router.push('/friends')} className="px-6 py-2.5 bg-[var(--primary)] text-white font-semibold rounded-xl text-sm transition-transform active:scale-95 shadow-lg shadow-[var(--primary)]/20">Find Friends</button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {threads.map(thread => {
                const otherId = thread.user1Id === studentId ? thread.user2Id : thread.user1Id;
                const otherName = thread.user1Id === studentId ? thread.user2Name : thread.user1Name;
                const unread = thread.user1Id === studentId ? thread.unreadCount1 : thread.unreadCount2;
                const isOnline = statuses[otherId]?.status === 'online' || statuses[otherId]?.status === 'in-session';
                const initial = otherName.charAt(0).toUpperCase();

                const avatarColors = ['bg-violet-600','bg-emerald-600','bg-blue-600','bg-pink-600','bg-amber-600','bg-cyan-600','bg-indigo-600','bg-rose-600'];
                let h=0; for(let i=0;i<otherName.length;i++) h=otherName.charCodeAt(i)+((h<<5)-h);
                const color = avatarColors[Math.abs(h)%avatarColors.length];

                return (
                  <button
                    key={thread.chatId}
                    onClick={() => setSelectedChatId(thread.chatId)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                    style={{ background: unread > 0 ? 'rgba(124,58,237,0.04)' : 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = unread > 0 ? 'rgba(124,58,237,0.04)' : 'transparent')}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white font-bold text-lg`}>
                        {initial}
                      </div>
                      {isOnline && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--background)] rounded-full animate-pulse" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className={`text-[15px] truncate ${unread > 0 ? 'font-bold text-white' : 'font-semibold text-white/90'}`}>{otherName}</h3>
                        <span className="text-[11px] text-white/40 ml-2 shrink-0">{thread.lastMessageAt ? formatThreadTime(thread.lastMessageAt) : ''}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[13px] truncate ${unread > 0 ? 'text-white/80' : 'text-white/45'}`}>{thread.lastMessage || 'Say hi!'}</p>
                        {unread > 0 && <span className="w-5 h-5 flex items-center justify-center bg-[var(--primary)] text-white font-bold text-[10px] rounded-full shrink-0">{unread > 9 ? '9+' : unread}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Chat Layout (WhatsApp style)
  const selectedThread = threads.find(t => t.chatId === selectedChatId);
  const otherId = selectedThread ? (selectedThread.user1Id === studentId ? selectedThread.user2Id : selectedThread.user1Id) : friendId;
  const otherName = selectedThread ? (selectedThread.user1Id === studentId ? selectedThread.user2Name : selectedThread.user1Name) : friendName;
  const isOnline = statuses[otherId || '']?.status === 'online' || statuses[otherId || '']?.status === 'in-session';
  const score = matchScores[otherId || ''] || 0;

  let headerColor = 'bg-violet-600';
  if (otherName) {
    const avatarColors = ['bg-violet-600','bg-emerald-600','bg-blue-600','bg-pink-600','bg-amber-600','bg-cyan-600','bg-indigo-600','bg-rose-600'];
    let h=0; for(let i=0;i<otherName.length;i++) h=otherName.charCodeAt(i)+((h<<5)-h); 
    headerColor = avatarColors[Math.abs(h)%avatarColors.length];
  }

  // Group messages by date
  const messagesByDate: { date: string; msgs: DirectMessage[] }[] = [];
  messages.forEach(msg => {
    const dk = new Date(msg.createdAt).toDateString();
    const g = messagesByDate.find(x => x.date === dk);
    if (g) g.msgs.push(msg); else messagesByDate.push({ date: dk, msgs: [msg] });
  });

  const getDateLabel = (iso: string) => {
    const d = new Date(iso); const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div id="chat-root" className="flex flex-col" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#090909', overflow: 'hidden' }}>
      {/* ─── Header ─── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2" style={{ background: '#111111', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => setSelectedChatId(null)} className="text-white p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-full ${headerColor} flex items-center justify-center text-white font-bold text-lg`}>
            {otherName?.charAt(0).toUpperCase() || '?'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-semibold text-white truncate leading-tight flex items-center gap-2">
            {otherName || 'Student'}
            {score > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold border border-green-500/30">{score}% match</span>}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-white/30'}`} />
            <span className={`text-[11px] ${isOnline ? 'text-green-400' : 'text-white/60'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div ref={chatScrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-3" style={{ overscrollBehavior: 'contain' }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 mt-10">
            <div className="w-16 h-16 bg-[#1e1e1e] rounded-2xl flex items-center justify-center mb-4 text-2xl">👋</div>
            <p className="text-white font-medium mb-1">Say hi to {otherName?.split(' ')[0] || 'your match'}!</p>
            <p className="text-white/60 text-xs">Messages are end-to-end encrypted.</p>
          </div>
        ) : (
          messagesByDate.map(group => (
            <div key={group.date}>
              <div className="flex items-center justify-center my-3">
                <span className="px-3 py-1 bg-[#141414] rounded-full text-[11px] font-bold text-white/60 border border-white/[0.04]">
                  {getDateLabel(group.msgs[0].createdAt)}
                </span>
              </div>
              {group.msgs.map(msg => (
                <MessageBubble key={msg.id} msg={msg} isMe={msg.senderId === studentId} />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── Input Bar ─── */}
      <div className="shrink-0 flex items-end gap-2 px-3 py-2" style={{ background: '#111111', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
        <textarea
          ref={textareaRef}
          value={newMsg}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          maxLength={1000}
          rows={1}
          className="flex-1 resize-none bg-[#1e1e1e] text-white text-[15px] placeholder:text-white/40 rounded-[20px] px-4 py-2.5 outline-none tracking-tight transition-colors"
          style={{ minHeight: '40px', maxHeight: '160px', lineHeight: '1.4' }}
        />
        <button
          onClick={sendMessage}
          disabled={!newMsg.trim() || sending}
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:scale-100"
          style={{ background: 'var(--primary)' }}
        >
          <Send size={18} className="text-white ml-0.5" />
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#090909]">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
