// ============================================
// MitrAI - Arya Chat Page
// Direct chat interface with Arya AI
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'arya';
  text: string;
  time: string;
}

export default function AryaChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'arya',
      text: "Hey! 💜 I'm Arya, your campus bestie. What's on your mind? Whether it's exam stress, study doubts, or just need someone to talk to — I'm here!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    // Simulate Arya's response (since no API exists yet)
    setTimeout(() => {
      const responses = [
        "That's a great question! Let me think about it... 🤔",
        "I totally understand how you feel. College can be intense sometimes 💜",
        "Hmm, have you tried breaking it down into smaller steps? That usually helps!",
        "You've got this! I believe in you 💪",
        "That sounds really interesting! Tell me more about it 😊",
        "I'm here for you, always. No judgements, just support 💜",
        "Let's work through this together. First things first...",
        "Ooh that's a tough one! But nothing we can't figure out 🧠",
      ];
      const aryaMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'arya',
        text: responses[Math.floor(Math.random() * responses.length)],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aryaMsg]);
      setSending(false);
    }, 1000 + Math.random() * 1500);
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--background)' }}>
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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'arya' && (
                <Image src="/arya-avatar.png" alt="Arya" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0 mb-1" />
              )}
              <div>
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                <p className={`text-[9px] text-[var(--muted)] mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>{msg.time}</p>
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
      <div className="shrink-0 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]" style={{
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
    </div>
  );
}
