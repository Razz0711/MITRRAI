'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const router = useRouter();
  const [showOnline, setShowOnline] = useState(true);
  const [showProfile, setShowProfile] = useState(true);
  const [showInterests, setShowInterests] = useState(true);
  const [showBio, setShowBio] = useState(true);

  const Toggle = ({ on, toggle }: { on: boolean; toggle: () => void }) => (
    <button onClick={toggle} className={`relative w-12 h-7 rounded-full transition-colors ${on ? 'bg-violet-600' : 'bg-gray-600'}`}>
      <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-bold text-[var(--foreground)]">Privacy Settings</h1>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Show Online Status</p>
            <p className="text-[10px] text-[var(--muted)]">Others can see when you're active</p>
          </div>
          <Toggle on={showOnline} toggle={() => setShowOnline(!showOnline)} />
        </div>
        <div className="h-px bg-[var(--border)]" />
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Show Profile Photo</p>
            <p className="text-[10px] text-[var(--muted)]">Display your photo to matched users</p>
          </div>
          <Toggle on={showProfile} toggle={() => setShowProfile(!showProfile)} />
        </div>
        <div className="h-px bg-[var(--border)]" />
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Show Interests</p>
            <p className="text-[10px] text-[var(--muted)]">Let others see your selected interests</p>
          </div>
          <Toggle on={showInterests} toggle={() => setShowInterests(!showInterests)} />
        </div>
        <div className="h-px bg-[var(--border)]" />
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Show Bio</p>
            <p className="text-[10px] text-[var(--muted)]">Display your bio on your profile</p>
          </div>
          <Toggle on={showBio} toggle={() => setShowBio(!showBio)} />
        </div>
      </div>

      <div className="mt-5 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
        <p className="text-xs text-[var(--foreground)] font-semibold mb-1">🔒 Your data is safe</p>
        <p className="text-[10px] text-[var(--muted)] leading-relaxed">
          MitrrAi never shares your personal information with third parties. Your chats are private and encrypted. Only matched users can see your profile details.
        </p>
      </div>
    </div>
  );
}
