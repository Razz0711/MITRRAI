// ============================================
// MitrAI - Edit Profile Page (IOC Redesign)
// Photo + Bio + Interests (no study timing)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { StudentProfile } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { ArrowLeft, Edit2, X } from 'lucide-react';

const INTEREST_CHIPS = [
  { id: 'Coding',       emoji: '💻' },
  { id: 'DSA',          emoji: '🏗️' },
  { id: 'Music',        emoji: '🎵' },
  { id: 'Startup',      emoji: '🚀' },
  { id: 'Gaming',       emoji: '🎮' },
  { id: 'Fitness',      emoji: '💪' },
  { id: 'Academic',     emoji: '📚' },
  { id: 'Arts',         emoji: '🎨' },
  { id: 'Sports',       emoji: '🏃' },
  { id: 'Photography',  emoji: '📸' },
  { id: 'Cooking',      emoji: '🍳' },
  { id: 'Writing',      emoji: '✍️' },
];

const MAX_INTERESTS = 5;

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState(false);

  // Form state
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setProfile(data.data as StudentProfile);
        setBio(data.data.bio || '');
        // Load interests from strongSubjects
        setInterests(data.data.strongSubjects || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          bio,
          strongSubjects: interests,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/me');
      } else {
        alert(data.error || 'Failed to save changes');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_INTERESTS) return prev; // cap at 5
      return [...prev, id];
    });
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={3} label="Loading profile..." />
      </div>
    );
  }

  const initial = (profile?.name || user?.name || 'S').charAt(0).toUpperCase();

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--foreground)] hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Edit Profile</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-xl text-sm font-bold text-white shadow-lg disabled:opacity-50 transition-all hover:brightness-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="space-y-5">
        {/* ── Avatar Section ── */}
        <div className="rounded-2xl p-6 flex flex-col items-center text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <div className="relative mb-4 group cursor-pointer" onClick={() => setZoomPhoto(true)}>
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 ring-2 ring-violet-500/30 flex items-center justify-center text-white font-bold text-4xl shadow-xl transition-transform active:scale-95">
              {initial}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-white border-2 border-[var(--background)] shadow-md group-hover:bg-violet-500 transition-colors">
              <Edit2 size={14} />
            </div>
          </div>
          <p className="text-xs text-[var(--muted)] mb-4">
            Tap to change · Shown to your matches
          </p>
          <button className="px-5 py-2 rounded-xl text-xs font-semibold text-violet-300 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 transition-all">
            Upload Photo
          </button>
        </div>

        {/* ── Photo Zoom Modal ── */}
        {zoomPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setZoomPhoto(false)}>
            <button
              className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setZoomPhoto(false); }}
            >
              <X size={24} />
            </button>
            <div
              className="w-64 h-64 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 border-4 border-white/20 flex items-center justify-center text-white font-bold text-6xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {initial}
            </div>
          </div>
        )}

        {/* ── BIO Section ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">Bio</h3>
          <p className="text-[10px] text-[var(--muted)] mb-3">Tell your study buddies about you</p>
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 100))}
              placeholder="e.g. &quot;3rd year CSE, love DSA and late-night coding. Looking for hackathon teammates!&quot;"
              className="w-full bg-white/5 rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none focus:outline-none focus:border-violet-500/40 min-h-[80px] transition-colors"
            />
            <div className="absolute bottom-2 right-3 text-[10px] font-semibold text-[var(--muted)]">
              {bio.length} / 100
            </div>
          </div>
        </div>

        {/* ── INTERESTS Section ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">Your interests</h3>
          <p className="text-[10px] text-[var(--muted)] mb-4">
            Used to suggest circles and improve your matches · Pick up to 5
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {INTEREST_CHIPS.map((chip) => {
              const isSelected = interests.includes(chip.id);
              const isDisabled = !isSelected && interests.length >= MAX_INTERESTS;
              return (
                <button
                  key={chip.id}
                  onClick={() => toggleInterest(chip.id)}
                  disabled={isDisabled}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-violet-500/15 text-violet-300 border-violet-500/40'
                      : isDisabled
                        ? 'bg-white/3 text-[var(--muted)] border-[var(--glass-border)] opacity-40 cursor-not-allowed'
                        : 'bg-white/3 text-[var(--muted)] border-[var(--glass-border)] hover:border-white/20 hover:text-[var(--foreground)]'
                  }`}
                >
                  <span className="text-sm">{chip.emoji}</span>
                  {chip.id}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-[var(--muted)] text-center font-semibold">
            {interests.length} / {MAX_INTERESTS} selected
          </p>
        </div>

        {/* ── Locked Info Section ── */}
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-lg shrink-0">🔒</div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed flex-1">
            <strong className="text-amber-400 font-semibold">Branch, Year & Email</strong> are auto-filled from your SVNIT registration and cannot be changed.
          </p>
        </div>
      </div>
    </div>
  );
}
