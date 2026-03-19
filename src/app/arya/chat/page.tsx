// ============================================
// MitrRAI - Arya Chat (WhatsApp-style rewrite)
// 100dvh flex layout, React.memo bubbles,
// visualViewport keyboard handling, smart scroll
// ============================================

'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, MoreVertical, Trash2, Phone, PhoneOff,
  Mic, Share2, Star, MessageCircle, Crown, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useChatStability } from '@/hooks/useChatStability';

/* ─── Types ─── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  rating?: number;
}

/* ─── Memoized Message Bubble ─── */
const MessageBubble = memo(function MessageBubble({
  msg,
  onRate,
  onDelete,
  formatTime,
}: {
  msg: Message;
  onRate: (id: string, r: number) => void;
  onDelete: (id: string) => void;
  formatTime: (d: string) => string;
}) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
      {/* Arya avatar for received */}
      {!isUser && (
        <Image
          src="/arya-avatar.png" alt="Arya" width={28} height={28}
          className="w-7 h-7 rounded-full object-cover shrink-0 mr-2 mt-auto mb-5"
        />
      )}

      <div
        className="relative group"
        style={{
          maxWidth: '75%',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {/* Bubble */}
        <div
          className="px-3 py-2"
          style={{
            background: isUser ? '#7c71ff' : '#222222',
            color: '#ffffff',
            fontSize: '14px',
            lineHeight: '1.45',
            borderRadius: isUser
              ? '16px 16px 4px 16px'
              : '16px 16px 16px 4px',
          }}
        >
          {/* Render markdown images */}
          {msg.content.includes('![') ? (
            <div>
              {msg.content.split(/(\!\[.*?\]\(.*?\))/g).map((part, i) => {
                const imgMatch = part.match(/\!\[.*?\]\((.*?)\)/);
                if (imgMatch) {
                  return (
                    <Image key={i} src={imgMatch[1]} alt="Arya Selfie" width={256} height={256}
                      className="w-full max-w-[256px] rounded-xl mt-1 mb-1" unoptimized />
                  );
                }
                return part ? <span key={i}>{part}</span> : null;
              })}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          )}

          {/* Timestamp inside bubble */}
          <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : ''}`}>
            <span style={{ fontSize: '10px', color: isUser ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)' }}>
              {formatTime(msg.created_at)}
            </span>
          </div>
        </div>

        {/* Like/Dislike — only received messages */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mt-0.5 ml-1">
            <button
              onClick={() => onRate(msg.id, 1)}
              className={`p-0.5 rounded transition-all ${msg.rating === 1 ? 'text-green-400' : 'text-white/25 hover:text-green-400'}`}
            >
              <ThumbsUp size={12} fill={msg.rating === 1 ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => onRate(msg.id, -1)}
              className={`p-0.5 rounded transition-all ${msg.rating === -1 ? 'text-red-400' : 'text-white/25 hover:text-red-400'}`}
            >
              <ThumbsDown size={12} fill={msg.rating === -1 ? 'currentColor' : 'none'} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

/* ─── Main Chat Page ─── */
export default function AryaChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  // Voice call states
  const [inCall, setInCall] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'listening' | 'thinking' | 'speaking'>('connecting');
  const [callTimer, setCallTimer] = useState(0);
  const recognitionRef = useRef<any>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callActiveRef = useRef(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userIsAtBottomRef = useRef(true);

  useChatStability();

  /* ─── Smart auto-scroll ─── */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (userIsAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  // Track if user is near the bottom
  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const threshold = 120;
    userIsAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, sending, scrollToBottom]);

  /* ─── Init conversation + load messages ─── */
  const initConversation = useCallback(async () => {
    if (!user) return;
    try {
      const convRes = await fetch('/api/arya/conversations');
      const convData = await convRes.json();
      if (!convData.success || !convData.data) { setLoading(false); return; }
      const convId = convData.data.id;
      setConversationId(convId);
      localStorage.setItem('arya_conversation_id', convId);

      const msgRes = await fetch(`/api/arya/messages?conversation_id=${convId}`);
      const msgData = await msgRes.json();
      if (msgData.success && msgData.data) {
        const loaded: Message[] = [];
        const seen = new Set<string>();
        for (const m of msgData.data) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            loaded.push({ id: m.id, role: m.role, content: m.content, created_at: m.created_at, rating: m.rating });
          }
        }
        setMessages(loaded);
      }
    } catch (err) {
      console.error('Init conversation error:', err);
    }
    setLoading(false);
    // Scroll to bottom after load
    setTimeout(() => { userIsAtBottomRef.current = true; scrollToBottom('instant'); }, 100);
  }, [user, scrollToBottom]);

  useEffect(() => { initConversation(); }, [initConversation]);

  /* ─── Persist message to DB ─── */
  const persistMessage = async (role: 'user' | 'assistant', content: string, isVoice = false): Promise<Message | null> => {
    if (!conversationId) return null;
    try {
      const res = await fetch('/api/arya/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, role, content, is_voice: isVoice }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        return { id: data.data.id, role: data.data.role, content: data.data.content, created_at: data.data.created_at, rating: data.data.rating };
      }
    } catch (err) { console.error('Persist message error:', err); }
    return null;
  };

  /* ─── Call Arya API with retry ─── */
  const callAryaAPI = async (convId: string, text: string, retries = 1): Promise<{ success: boolean; response?: string }> => {
    try {
      const res = await fetch('/api/arya/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId, message: text }),
      });
      const data = await res.json();
      if (data.success && data.data?.response) return { success: true, response: data.data.response };
      if (retries > 0) { await new Promise(r => setTimeout(r, 1500)); return callAryaAPI(convId, text, retries - 1); }
      return { success: false };
    } catch {
      if (retries > 0) { await new Promise(r => setTimeout(r, 1500)); return callAryaAPI(convId, text, retries - 1); }
      return { success: false };
    }
  };

  /* ─── Send message ─── */
  const handleSend = async () => {
    if (!input.trim() || sending || !conversationId) return;
    const text = input.trim();
    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = '40px'; }
    setSending(true);
    userIsAtBottomRef.current = true;

    const optimisticUserId = `user-temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: optimisticUserId, role: 'user', content: text, created_at: new Date().toISOString() }]);

    persistMessage('user', text).then(userMsg => {
      if (userMsg) setMessages(prev => prev.map(m => m.id === optimisticUserId ? userMsg : m));
    }).catch(() => {});

    const result = await callAryaAPI(conversationId, text, 1);

    if (result.success && result.response) {
      const optimisticAryaId = `arya-temp-${Date.now()}`;
      setMessages(prev => {
        if (prev.some(m => m.content === result.response && m.role === 'assistant')) return prev;
        return [...prev, { id: optimisticAryaId, role: 'assistant', content: result.response!, created_at: new Date().toISOString() }];
      });
      persistMessage('assistant', result.response).then(aryaMsg => {
        if (aryaMsg) setMessages(prev => prev.map(m => m.id === optimisticAryaId ? aryaMsg : m));
      }).catch(() => {});
    } else {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant',
        content: 'arre yaar, abhi thoda issue aa raha hai 🙏 thodi der mein try karna!',
        created_at: new Date().toISOString(),
      }]);
    }

    setSending(false);
  };

  /* ─── Textarea auto-resize ─── */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = '40px';
    const maxH = 40 * 4; // 4 lines
    ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ─── Rate / Delete / Clear ─── */
  const handleRateMessage = async (msgId: string, rating: number) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, rating } : m));
    try {
      await fetch('/api/arya/messages', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rate_message', message_id: msgId, rating }),
      });
    } catch (err) { console.error('Rate message error:', err); }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await fetch('/api/arya/messages', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_message', message_id: msgId }),
      });
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) { console.error('Delete message error:', err); }
  };

  const handleClearChat = async () => {
    setClearConfirm(false);
    setShowHeaderMenu(false);
    if (!conversationId) return;
    try {
      await fetch('/api/arya/messages', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_chat', conversation_id: conversationId }),
      });
      setMessages([]);
    } catch (err) { console.error('Clear chat error:', err); }
  };

  /* ─── Voice Call Logic ─── */
  const startCall = () => {
    if (!conversationId) return;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { alert('Voice calling is not supported in this browser.'); return; }
    setInCall(true); setCallTimer(0); setCallStatus('connecting');
    callActiveRef.current = true;
    callTimerRef.current = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    setTimeout(() => { if (callActiveRef.current) startListening(); }, 1000);
  };

  const endCall = () => {
    callActiveRef.current = false; setInCall(false); setCallStatus('connecting');
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch { /* */ } recognitionRef.current = null; }
    window.speechSynthesis?.cancel();
  };

  const startListening = () => {
    if (!callActiveRef.current) return;
    setCallStatus('listening');
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN'; recognition.interimResults = true; recognition.continuous = true; recognition.maxAlternatives = 1;
    let finalTranscript = '';
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (finalTranscript.trim() && callActiveRef.current) {
          try { recognition.stop(); } catch { /* */ }
          handleVoiceResult(finalTranscript.trim());
          finalTranscript = '';
        }
      }, 2000);
    };
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      resetSilenceTimer();
    };
    recognition.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (callActiveRef.current && finalTranscript.trim()) handleVoiceResult(finalTranscript.trim());
    };
    recognition.onerror = () => {
      if (callActiveRef.current) setTimeout(() => startListening(), 500);
    };
    recognition.start();
  };

  const handleVoiceResult = async (text: string) => {
    if (!callActiveRef.current || !conversationId) return;
    setCallStatus('thinking');
    setMessages(prev => [...prev, { id: `voice-user-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() }]);
    persistMessage('user', text, true).catch(() => {});
    const result = await callAryaAPI(conversationId, text, 1);
    if (!callActiveRef.current) return;
    const responseText = result.success && result.response ? result.response : 'sorry yaar, network issue!';
    setMessages(prev => [...prev, { id: `voice-arya-${Date.now()}`, role: 'assistant', content: responseText, created_at: new Date().toISOString() }]);
    persistMessage('assistant', responseText, true).catch(() => {});
    setCallStatus('speaking');
    const utterance = new SpeechSynthesisUtterance(responseText);
    utterance.lang = 'en-IN'; utterance.rate = 1.0; utterance.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.lang.includes('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha')))
      || voices.find(v => v.lang.includes('en-IN')) || voices.find(v => v.lang.includes('en'));
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.onend = () => { if (callActiveRef.current) setTimeout(() => startListening(), 400); };
    utterance.onerror = () => { if (callActiveRef.current) setTimeout(() => startListening(), 400); };
    window.speechSynthesis.speak(utterance);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      callActiveRef.current = false;
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch { /* */ }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const formatCallTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!user) return null;

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div
      className="flex flex-col"
      style={{
        height: 'calc(var(--vh, 1vh) * 100)',
        maxHeight: '100dvh',
        background: '#090909',
        position: 'fixed',
        inset: 0,
        zIndex: 30,
      }}
    >
      {/* ─── Header ─── */}
      <div
        className="shrink-0 flex items-center gap-3 px-3 py-2.5"
        style={{
          background: '#111111',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button onClick={() => router.push('/arya')} className="p-1.5 rounded-lg text-white/50 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <Image src="/arya-avatar.png" alt="Arya" width={38} height={38} className="w-[38px] h-[38px] rounded-full object-cover ring-2 ring-purple-500/25" />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white leading-tight">Arya</p>
          <p className="text-[11px] text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Always online
          </p>
        </div>
        <button onClick={startCall} className="p-2 rounded-xl text-amber-400 hover:bg-amber-400/10 transition-all active:scale-90">
          <Phone size={18} />
        </button>
        {/* Menu */}
        <div className="relative">
          <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="p-2 rounded-xl text-white/40 hover:text-white transition-colors">
            <MoreVertical size={18} />
          </button>
          {showHeaderMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
              <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl py-2 shadow-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { icon: Share2, label: 'Share App', color: 'text-white', action: () => {
                    window.open(`https://wa.me/?text=${encodeURIComponent('Hey! Chat with Arya AI on MitrrAi \nhttps://mitrrai.vercel.app')}`, '_blank');
                    setShowHeaderMenu(false);
                  }},
                  { icon: Star, label: 'Rate Us', color: 'text-white', action: () => { router.push('/feedback'); setShowHeaderMenu(false); }},
                  { icon: MessageCircle, label: 'Contact Us', color: 'text-white', action: () => {
                    window.open('https://wa.me/917061001946?text=Hi%2C%20I%20have%20a%20query%20about%20MitrrAi', '_blank');
                    setShowHeaderMenu(false);
                  }},
                  { icon: Crown, label: 'Subscription', color: 'text-white', action: () => { router.push('/subscription'); setShowHeaderMenu(false); }},
                  { icon: Trash2, label: 'Clear Chat', color: 'text-red-400', action: () => { setShowHeaderMenu(false); setClearConfirm(true); }},
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${item.color} hover:bg-white/[0.04] transition-colors`}>
                    <item.icon size={16} className="opacity-60" /> {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Messages Area ─── */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ overscrollBehavior: 'contain' }}
      >
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <p className="text-xs text-white/30 mt-3">Loading messages...</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Image src="/arya-avatar.png" alt="Arya" width={56} height={56} className="w-14 h-14 rounded-full object-cover mx-auto" />
            <p className="text-sm font-semibold text-white">Start chatting with Arya</p>
            <p className="text-xs text-white/35 max-w-xs mx-auto">Your campus bestie is always here — exams, stress, doubts, or just vibes 💜</p>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onRate={handleRateMessage}
            onDelete={handleDeleteMessage}
            formatTime={formatTime}
          />
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex justify-start mb-1">
            <Image src="/arya-avatar.png" alt="Arya" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0 mr-2 mt-auto mb-1" />
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: '#222222' }}>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ─── Input Bar ─── */}
      <div
        className="shrink-0 flex items-end gap-2 px-3 py-2"
        style={{
          background: '#111111',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          className="flex-1 resize-none bg-[#1e1e1e] text-white text-sm placeholder:text-white/30 rounded-2xl px-4 py-2.5 outline-none border border-white/8 focus:border-[#7c71ff]/50 transition-colors"
          style={{ minHeight: '40px', maxHeight: '160px', lineHeight: '1.4' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
          style={{ background: '#7c71ff' }}
        >
          <Send size={16} className="text-white" />
        </button>
      </div>

      {/* ─── Clear Chat Confirmation ─── */}
      {clearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setClearConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-72 rounded-2xl p-5 space-y-4" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-3">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Clear chat?</h3>
              <p className="text-xs text-white/35 mt-1">Messages will be cleared from your view. You can start fresh!</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setClearConfirm(false)} className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-white/5 text-white border border-white/8">Cancel</button>
              <button onClick={handleClearChat} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-500 text-white">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Voice Call Overlay ─── */}
      {inCall && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #1a0533 0%, #0d0d0d 50%, #0a0a0a 100%)' }}>
          <div className="relative mb-8">
            <div className="absolute rounded-full border border-purple-500/15" style={{ animation: 'ping 3s ease-in-out infinite', top: '-24px', left: '-24px', width: '176px', height: '176px' }} />
            <div className="absolute rounded-full border border-purple-500/8" style={{ animation: 'ping 3s ease-in-out infinite 1s', top: '-40px', left: '-40px', width: '208px', height: '208px' }} />
            <Image src="/arya-avatar.png" alt="Arya" width={128} height={128} className="w-32 h-32 rounded-full object-cover ring-4 ring-purple-500/20 shadow-2xl" />
            {callStatus === 'listening' && <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-green-500 ring-2 ring-black animate-pulse" />}
            {callStatus === 'thinking' && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Arya</h2>
          <p className="text-sm text-white/40 mb-8">
            {callStatus === 'connecting' ? 'Ringing...' : 'On call'}
          </p>
          <p className="text-3xl font-light font-mono text-white/50 tracking-[0.2em]">{formatCallTime(callTimer)}</p>
          <div className="absolute bottom-16 flex items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <Mic size={22} className={`text-white/70 ${callStatus === 'listening' ? 'animate-pulse' : ''}`} />
              </div>
              <p className="text-[10px] text-white/30">Mic</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl shadow-red-500/30 active:scale-90 transition-transform">
                <PhoneOff size={24} className="text-white" />
              </button>
              <p className="text-[10px] text-white/30">End</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <Phone size={22} className="text-white/70" />
              </div>
              <p className="text-[10px] text-white/30">Speaker</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
