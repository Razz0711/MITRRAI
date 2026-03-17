// ============================================
// MitrAI - Arya Chat Page (Persistent)
// Messages stored in Supabase arya_messages
// Soft-delete via is_deleted_by_user flag
// ============================================
//
// is_deleted_by_user only affects UI rendering.
// Arya context loader always reads full message history
// regardless of this flag to maintain conversation continuity
// and learn user communication patterns.
//
// Messages are retained in DB to understand user tone,
// preferences, and communication style so Arya can
// personalize future responses. This data is never shown
// to other users and is only used internally for Arya's
// context window on next session load.

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MoreVertical, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useChatStability } from '@/hooks/useChatStability';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function AryaChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useChatStability();

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Initialize conversation + load messages
  const initConversation = useCallback(async () => {
    if (!user) return;
    try {
      // Get or create conversation
      const convRes = await fetch('/api/arya/conversations');
      const convData = await convRes.json();
      if (!convData.success || !convData.data) {
        setLoading(false);
        return;
      }
      const convId = convData.data.id;
      setConversationId(convId);
      localStorage.setItem('arya_conversation_id', convId);

      // Fetch messages (filtered: is_deleted_by_user = false)
      const msgRes = await fetch(`/api/arya/messages?conversation_id=${convId}`);
      const msgData = await msgRes.json();
      if (msgData.success && msgData.data) {
        setMessages(msgData.data.map((m: Record<string, string>) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
        })));
      }
    } catch (err) {
      console.error('Init conversation error:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    initConversation();
  }, [initConversation]);

  // Persist message to DB
  const persistMessage = async (role: 'user' | 'assistant', content: string): Promise<Message | null> => {
    if (!conversationId) return null;
    try {
      const res = await fetch('/api/arya/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, role, content }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        return {
          id: data.data.id,
          role: data.data.role,
          content: data.data.content,
          created_at: data.data.created_at,
        };
      }
    } catch (err) {
      console.error('Persist message error:', err);
    }
    return null;
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || sending || !conversationId) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Persist user message
    const userMsg = await persistMessage('user', text);
    if (userMsg) {
      setMessages(prev => [...prev, userMsg]);
    }

    try {
      // Call Gemini API with conversation history + system prompt
      const res = await fetch('/api/arya/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, message: text }),
      });
      const data = await res.json();

      if (data.success && data.data?.response) {
        // Persist Arya's response
        const aryaMsg = await persistMessage('assistant', data.data.response);
        if (aryaMsg) {
          setMessages(prev => [...prev, aryaMsg]);
        }
      } else {
        // Fallback if API fails — show error for debugging
        const errText = data.error || 'unknown error';
        const fallback = await persistMessage('assistant', `[DEBUG] API error: ${errText}`);
        if (fallback) setMessages(prev => [...prev, fallback]);
      }
    } catch (err) {
      console.error('Arya chat error:', err);
      const fallback = await persistMessage('assistant', `[DEBUG] Fetch error: ${err instanceof Error ? err.message : String(err)}`);
      if (fallback) setMessages(prev => [...prev, fallback]);
    }

    setSending(false);
  };

  // Soft-delete single message (UI only — DB retains content)
  const handleDeleteMessage = async (msgId: string) => {
    setMenuMsgId(null);
    try {
      await fetch('/api/arya/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_message', message_id: msgId }),
      });
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error('Delete message error:', err);
    }
  };

  // Clear entire chat (UI only — DB retains all content)
  const handleClearChat = async () => {
    setClearConfirm(false);
    setShowHeaderMenu(false);
    if (!conversationId) return;
    try {
      await fetch('/api/arya/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_chat', conversation_id: conversationId }),
      });
      setMessages([]);
    } catch (err) {
      console.error('Clear chat error:', err);
    }
  };

  // Long-press handler for messages
  const handleTouchStart = (msgId: string) => {
    longPressTimer.current = setTimeout(() => setMenuMsgId(msgId), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return null;

  return (
    <div className="chat-container" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <button onClick={() => router.push('/arya')} className="p-1.5 rounded-lg hover:bg-[var(--surface-light)] text-[var(--muted)] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <Image src="/arya-avatar.png" alt="Arya" width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">Arya</p>
          <p className="text-[10px] text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
          </p>
        </div>
        {/* Header menu */}
        <div className="relative">
          <button 
            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-light)] text-[var(--muted)] transition-colors"
          >
            <MoreVertical size={18} />
          </button>
          {showHeaderMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
              <div className="absolute right-0 top-10 z-50 w-44 rounded-xl py-1 shadow-xl" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => { setShowHeaderMenu(false); setClearConfirm(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} /> Clear chat
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages px-4 py-4 space-y-3">
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <p className="text-xs text-[var(--muted)] mt-3">Loading messages...</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <Image src="/arya-avatar.png" alt="Arya" width={56} height={56} className="w-14 h-14 rounded-full object-cover mx-auto" />
            <p className="text-sm font-semibold text-[var(--foreground)]">Start chatting with Arya</p>
            <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">Your campus bestie is always here — exams, stress, doubts, or just vibes 💜</p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative`}
            onTouchStart={() => handleTouchStart(msg.id)}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => { e.preventDefault(); setMenuMsgId(msg.id); }}
          >
            <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <Image src="/arya-avatar.png" alt="Arya" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0 mb-1" />
              )}
              <div className="relative">
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-1.5 mt-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  <p className="text-[9px] text-[var(--muted)]">{formatTime(msg.created_at)}</p>
                  <button
                    onClick={() => setMenuMsgId(menuMsgId === msg.id ? null : msg.id)}
                    className="text-[var(--muted)] opacity-0 hover:opacity-100 transition-opacity p-0.5"
                  >
                    <MoreVertical size={10} />
                  </button>
                </div>

                {/* Per-message menu */}
                {menuMsgId === msg.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuMsgId(null)} />
                    <div
                      className={`absolute z-50 w-40 rounded-xl py-1 shadow-xl ${msg.role === 'user' ? 'right-0' : 'left-0'} bottom-full mb-1`}
                      style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}
                    >
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={13} /> Delete message
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <Image src="/arya-avatar.png" alt="Arya" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0 mb-1" />
              <div className="chat-bubble-ai">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--glass-border)',
      }}>
        <div className="flex gap-2 items-center">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Message Arya..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] outline-none transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#6d28d9] text-white flex items-center justify-center disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-purple-500/30 active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Clear Chat Confirmation */}
      {clearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setClearConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-72 rounded-2xl p-5 space-y-4 scale-in"
            style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-3">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Clear chat?</h3>
              <p className="text-xs text-[var(--muted)] mt-1">Messages will be cleared from your view. You can start fresh!</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setClearConfirm(false)} className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]">
                Cancel
              </button>
              <button onClick={handleClearChat} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-500 text-white">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
