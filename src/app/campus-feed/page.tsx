// ============================================
// MitrAI - Campus Feed (Anonymous Public Discussion)
// Real-time anonymous group chat for all SVNIT students
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

interface FeedMessage {
  id: string;
  user_id: string;
  alias: string;
  content: string;
  created_at: string;
}

// Generate a random anonymous alias
const ANON_ADJECTIVES = ['Happy', 'Curious', 'Brave', 'Wise', 'Chill', 'Witty', 'Bold', 'Cool', 'Swift', 'Bright'];
const ANON_ANIMALS = ['Panda', 'Tiger', 'Eagle', 'Owl', 'Fox', 'Wolf', 'Bear', 'Hawk', 'Lion', 'Deer'];

function getAnonymousAlias(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const adj = ANON_ADJECTIVES[Math.abs(hash) % ANON_ADJECTIVES.length];
  const animal = ANON_ANIMALS[Math.abs(hash >> 8) % ANON_ANIMALS.length];
  return `${adj} ${animal}`;
}

function getAliasColor(alias: string): string {
  const colors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < alias.length; i++) hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function CampusFeedPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = supabaseBrowser;

  const myAlias = user ? getAnonymousAlias(user.id) : 'Anonymous';

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('campus_feed')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      if (data) setMessages(data as FeedMessage[]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    loadMessages();

    // Real-time subscription
    const channel = supabase
      .channel('campus-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campus_feed' }, (payload: { new: FeedMessage }) => {
        const newMsg = payload.new as FeedMessage;
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, supabase, loadMessages]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await supabase.from('campus_feed').insert({
        user_id: user.id,
        alias: myAlias,
        content: text,
      });
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">Please log in to access Campus Feed</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)]">
        <Link
          href="/home"
          className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-[var(--foreground)]">Campus Feed 💬</h1>
          <p className="text-[10px] text-[var(--muted)]">Anonymous public discussion · SVNIT only</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--muted)]">You are</p>
          <p className="text-[11px] font-bold" style={{ color: getAliasColor(myAlias) }}>{myAlias}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-4xl mb-4 block">💬</span>
            <p className="text-sm font-bold text-[var(--foreground)]">Be the first to say something!</p>
            <p className="text-[11px] text-[var(--muted)] mt-1">Everyone is anonymous here. Start a discussion about anything.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.user_id === user.id;
            const color = getAliasColor(msg.alias);
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? 'bg-violet-600/20 border border-violet-500/25'
                    : 'bg-[var(--surface)] border border-[var(--glass-border)]'
                }`}>
                  {!isMe && (
                    <p className="text-[10px] font-bold mb-0.5" style={{ color }}>{msg.alias}</p>
                  )}
                  <p className="text-sm text-[var(--foreground)] leading-relaxed">{msg.content}</p>
                  <p className="text-[9px] text-[var(--muted)] mt-1 text-right">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="px-4 py-3 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Say something anonymously..."
            className="flex-1 bg-[var(--surface)] border border-[var(--glass-border)] rounded-2xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-violet-500/40 transition-colors"
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white shrink-0 disabled:opacity-40 hover:bg-violet-500 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[9px] text-[var(--muted)] text-center mt-1.5">
          Your identity is hidden · Be respectful · SVNIT email on file
        </p>
      </div>
    </div>
  );
}
