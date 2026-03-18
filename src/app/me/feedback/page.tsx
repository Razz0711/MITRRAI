'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';

const FEEDBACK_TYPES = [
  { id: 'bug', label: 'Bug Report', emoji: '🐛' },
  { id: 'feature', label: 'Feature Request', emoji: '💡' },
  { id: 'improve', label: 'Improvement', emoji: '✨' },
  { id: 'other', label: 'Other', emoji: '💬' },
];

export default function FeedbackPage() {
  const router = useRouter();
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!type || !message.trim()) return;
    // In production, this would POST to an API
    setSent(true);
  };

  if (sent) {
    return (
      <div className="max-w-lg mx-auto px-4 py-4 pb-28">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Feedback</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">💜</div>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">Thank you!</h2>
          <p className="text-sm text-[var(--muted)] max-w-xs">Your feedback helps us make MitrrAi better for everyone at SVNIT.</p>
          <button onClick={() => router.back()} className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-bold text-[var(--foreground)]">Send Feedback</h1>
      </div>

      {/* Type selection */}
      <p className="text-xs text-[var(--muted)] mb-3 px-1">What type of feedback?</p>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {FEEDBACK_TYPES.map(ft => (
          <button
            key={ft.id}
            onClick={() => setType(ft.id)}
            className={`p-3 rounded-xl text-left border transition-all ${type === ft.id ? 'bg-violet-500/15 border-violet-500/40 text-violet-300' : 'bg-[var(--surface)] border-[var(--glass-border)] text-[var(--muted)] hover:border-white/20'}`}
          >
            <span className="text-lg">{ft.emoji}</span>
            <p className="text-xs font-semibold mt-1">{ft.label}</p>
          </button>
        ))}
      </div>

      {/* Message */}
      <p className="text-xs text-[var(--muted)] mb-2 px-1">Your message</p>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value.slice(0, 500))}
        placeholder="Tell us what's on your mind..."
        className="w-full bg-[var(--surface)] rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none focus:outline-none focus:border-violet-500/40 min-h-[120px] transition-colors mb-2"
      />
      <p className="text-[10px] text-[var(--muted)] text-right mb-5">{message.length}/500</p>

      <button
        onClick={handleSubmit}
        disabled={!type || !message.trim()}
        className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
        style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
      >
        <Send size={14} />
        Submit Feedback
      </button>
    </div>
  );
}
