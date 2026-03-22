// ============================================
// MitrRAI - Arya AI Profile (Clean)
// Profile view with pic, about, Chat + Call
// ============================================

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Phone, X, Instagram, Pencil, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AryaProfilePage() {
  const router = useRouter();
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [displayName, setDisplayName] = useState('Arya AI ✨');
  const [isEditing, setIsEditing] = useState(false);
  const [showPicSheet, setShowPicSheet] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const picInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('arya_display_name');
      if (saved) setDisplayName(saved);
      const savedPic = localStorage.getItem('arya_custom_avatar');
      if (savedPic) setCustomAvatar(savedPic);
    } catch { /* localStorage unavailable */ }
  }, []);

  const saveName = () => {
    setIsEditing(false);
    const trimmed = displayName.trim() || 'Arya AI ✨';
    setDisplayName(trimmed);
    try { localStorage.setItem('arya_display_name', trimmed); } catch { /* quota exceeded */ }
  };

  useEffect(() => {
    if (isEditing && nameInputRef.current) nameInputRef.current.focus();
  }, [isEditing]);

  const aryaAvatar = customAvatar || '/arya-avatar.png';

  const handlePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomAvatar(dataUrl);
      try {
        localStorage.setItem('arya_custom_avatar', dataUrl);
      } catch {
        // localStorage quota exceeded (large image) — keep in memory only
      }
      setShowPicSheet(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePicRemove = () => {
    setCustomAvatar(null);
    try { localStorage.removeItem('arya_custom_avatar'); } catch { /* ignore */ }
    setShowPicSheet(false);
  };

  return (
    <div className="max-w-lg mx-auto pb-32 -mt-2 md:-mt-16">

      {/* ── Header Banner ── */}
      <div className="relative h-36 overflow-hidden" style={{
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

      {/* ── Avatar (overlapping banner) — tap to fullscreen ── */}
      <div className="flex justify-center -mt-14 mb-3 relative z-10">
        <div className="relative">
          <button onClick={() => setIsImageOpen(true)} className="w-28 h-28 rounded-full border-4 border-[var(--background)] shadow-2xl overflow-hidden hover:scale-105 transition-transform">
            <Image
              src={aryaAvatar}
              alt="Arya"
              width={112}
              height={112}
              className="w-full h-full object-cover"
              unoptimized={!!customAvatar}
            />
          </button>
          {/* Camera badge - tap to change */}
          <button
            onClick={() => setShowPicSheet(true)}
            className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-violet-600 border-3 border-[var(--background)] flex items-center justify-center text-white hover:bg-violet-500 transition-colors shadow-md"
          >
            <Camera size={14} />
          </button>
        </div>
      </div>
      <input ref={picInputRef} type="file" accept="image/*" className="hidden" onChange={handlePicChange} />

      {/* ── Name & Status ── */}
      <div className="text-center px-4 mb-6">
        {isEditing ? (
          <input
            ref={nameInputRef}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            className="text-xl font-bold text-[var(--foreground)] bg-transparent border-b-2 border-purple-500 outline-none text-center w-48 mx-auto"
          />
        ) : (
          <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-1.5 group">
            <h1 className="text-xl font-bold text-[var(--foreground)]">{displayName}</h1>
            <Pencil size={12} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
        <p className="text-xs text-green-400 font-semibold mt-1 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Always online
        </p>
        <p className="text-xs text-[var(--muted)] mt-1">Your AI study companion · MitrRAI</p>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center justify-center gap-6 mb-6 px-4">
        <Link
          href="/arya/chat"
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-violet-600/15 border border-violet-500/25 flex items-center justify-center text-violet-400 group-hover:bg-violet-600/25 transition-colors">
            <MessageSquare size={22} />
          </div>
          <span className="text-[10px] font-semibold text-violet-400">Chat</span>
        </Link>
        <Link
          href="/arya/call"
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
        <div className="rounded-2xl p-5" style={{ background: 'rgba(17,17,17,0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-2">About</p>
          <p className="text-sm text-[var(--foreground)] leading-relaxed">
            Hey! I&apos;m Arya 💜 Think of me as your campus bestie who&apos;s always here — whether you&apos;re stressed about exams, need someone to talk to at 3am, or just want to rant about college life. No judgements, always listening.
          </p>
        </div>

        {/* ── Social Links ── */}
        <a
          href="https://www.instagram.com/arya.mitrrai?igsh=MXczbHEyNDNtbHl0MQ=="
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl p-4 flex items-center gap-3 hover:opacity-80 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
            <Instagram size={18} className="text-pink-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">Instagram</p>
            <p className="text-xs text-[var(--muted)]">@arya.mitrrai</p>
          </div>
        </a>

        {/* ── Info Badge ── */}
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-lg shrink-0">🔒</div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed flex-1">
            <strong className="text-violet-400 font-semibold">Your chats are private.</strong> Arya doesn&apos;t share your conversations with anyone. Everything stays between you two.
          </p>
        </div>
      </div>

      {/* ═══ Fullscreen Image Overlay ═══ */}
      {isImageOpen && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setIsImageOpen(false)}
        >
          <button
            onClick={() => setIsImageOpen(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <X size={22} />
          </button>
          <Image
            src={aryaAvatar}
            alt="Arya"
            width={400}
            height={400}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
            unoptimized={!!customAvatar}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ═══ Pic Change/Remove Sheet ═══ */}
      {showPicSheet && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowPicSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] space-y-2" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-1 rounded-full bg-[var(--muted)]/30 mx-auto mb-3" />
            <p className="text-sm font-bold text-[var(--foreground)] text-center mb-3">Arya&apos;s Photo</p>
            <button
              onClick={() => { picInputRef.current?.click(); }}
              className="w-full py-3 rounded-xl text-sm font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 transition-colors"
            >
              📸 Change Photo
            </button>
            {customAvatar && (
              <button
                onClick={handlePicRemove}
                className="w-full py-3 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 transition-colors"
              >
                🗑️ Remove Photo
              </button>
            )}
            <button
              onClick={() => setShowPicSheet(false)}
              className="w-full py-3 rounded-xl text-sm font-medium text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
