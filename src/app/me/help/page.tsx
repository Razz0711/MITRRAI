'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'What is MitrrAi?',
    a: 'MitrrAi is a smart campus companion for SVNIT students. It helps you find study buddies, connect with peers, join circles, and chat with Arya AI — all in one app.',
  },
  {
    q: 'How does matching work?',
    a: 'We match you with other students based on your department, year, interests, and study patterns. The higher the match score, the more you have in common!',
  },
  {
    q: 'Who is Arya?',
    a: 'Arya is your AI friend inside MitrrAi. She chats like a real Mumbai college student — friendly, supportive, and always up for a conversation.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes! Your chats are private. We never share personal data with third parties. Your SVNIT credentials are verified but kept secure.',
  },
  {
    q: 'How do I change my profile photo?',
    a: 'Go to Me → tap the edit icon (✏️) → tap your avatar → choose a new photo from your device.',
  },
  {
    q: 'Can I post anonymously?',
    a: 'Yes! When composing a post on the Home feed, toggle the "Anon" switch. Your identity will be hidden from other students.',
  },
  {
    q: 'What are Circles?',
    a: 'Circles are study groups formed automatically based on shared interests and courses. Join circles to find teammates for projects, hackathons, or study sessions.',
  },
  {
    q: 'How do I report a user?',
    a: 'In any chat, tap the ⋮ menu and select "Report". Our team reviews all reports within 24 hours.',
  },
];

export default function HelpPage() {
  const router = useRouter();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-bold text-[var(--foreground)]">Help & FAQ</h1>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
        {FAQS.map((faq, i) => (
          <div key={i}>
            {i > 0 && <div className="h-px bg-[var(--border)]" />}
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">{faq.q}</p>
              </div>
              <ChevronDown size={16} className={`text-[var(--muted)] transition-transform ${openIdx === i ? 'rotate-180' : ''}`} />
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4 -mt-1">
                <p className="text-xs text-[var(--muted)] leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
        <p className="text-xs text-[var(--muted)] mb-2">Still need help?</p>
        <a href="mailto:mitrrai.support@svnit.ac.in" className="text-sm font-bold text-violet-400 hover:underline">
          mitrrai.support@svnit.ac.in
        </a>
      </div>
    </div>
  );
}
