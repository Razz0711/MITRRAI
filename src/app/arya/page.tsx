// ============================================
// MitrAI - Arya AI Profile (WhatsApp-style)
// Profile view with pic, about, Chat + Call
// ============================================

'use client';

import Link from 'next/link';
import { ArrowLeft, MessageSquare, Phone, Sparkles, Shield, Clock, Brain } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AryaProfilePage() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto pb-28">

      {/* ── Header Banner ── */}
      <div className="relative h-44 overflow-hidden" style={{
        background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 30%, #8b5cf6 60%, #a78bfa 100%)',
      }}>
        {/* Floating sparkles effect */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-6 left-8 w-2 h-2 rounded-full bg-white animate-pulse" />
          <div className="absolute top-12 right-12 w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-8 left-1/3 w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-20 left-1/2 w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute bottom-4 right-1/4 w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '0.8s' }} />
        </div>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30 transition-colors z-10"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* ── Avatar (overlapping banner) ── */}
      <div className="flex justify-center -mt-14 mb-3 relative z-10">
        <div className="w-28 h-28 rounded-full border-4 border-[var(--background)] shadow-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #c084fc)' }}
        >
          <Sparkles size={40} className="text-white" />
        </div>
      </div>

      {/* ── Name & Status ── */}
      <div className="text-center px-4 mb-6">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Arya AI ✨</h1>
        <p className="text-xs text-green-400 font-semibold mt-1 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Always online
        </p>
        <p className="text-xs text-[var(--muted)] mt-1">Your AI study companion · MitrAI</p>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center justify-center gap-6 mb-6 px-4">
        <Link
          href="/chat"
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-violet-600/15 border border-violet-500/25 flex items-center justify-center text-violet-400 group-hover:bg-violet-600/25 transition-colors">
            <MessageSquare size={22} />
          </div>
          <span className="text-[10px] font-semibold text-violet-400">Chat</span>
        </Link>
        <Link
          href="/chat"
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600/25 transition-colors">
            <Phone size={22} />
          </div>
          <span className="text-[10px] font-semibold text-emerald-400">Call</span>
        </Link>
      </div>

      <div className="px-4 space-y-4">
        {/* ── About Section ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-2">About</p>
          <p className="text-sm text-[var(--foreground)] leading-relaxed">
            Hi! I&apos;m Arya, your personal AI study companion at MitrAI. I can help you with doubt clearing, study planning, exam prep, and just being someone to talk to when you need motivation. 💜
          </p>
        </div>

        {/* ── Capabilities ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3">What Arya can do</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                <Brain size={16} className="text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Doubt Clearing</p>
                <p className="text-[10px] text-[var(--muted)]">Ask any academic question, from DSA to Physics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                <Clock size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Study Planning</p>
                <p className="text-[10px] text-[var(--muted)]">Get a personalized study schedule and daily targets</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Shield size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Mental Support</p>
                <p className="text-[10px] text-[var(--muted)]">Feeling stuck or stressed? Arya is always here to listen</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Chat Now CTA ── */}
        <Link
          href="/chat"
          className="block w-full py-4 rounded-2xl text-center text-white font-bold text-sm transition-all hover:shadow-lg active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9, #a855f7)',
            boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
          }}
        >
          💬 Start Chatting with Arya
        </Link>

        {/* ── Info Badge ── */}
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-lg shrink-0">🔒</div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed flex-1">
            <strong className="text-violet-400 font-semibold">Your chats are private.</strong> Arya doesn&apos;t share your conversations with anyone. Everything stays between you two.
          </p>
        </div>
      </div>
    </div>
  );
}
