// ============================================
// MitrAI - Arya Call Page
// Voice call interface with Arya AI
// ============================================

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';

export default function AryaCallPage() {
  const router = useRouter();
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [muted, setMuted] = useState(false);
  const [callTime, setCallTime] = useState(0);

  // Simulate connection
  useState(() => {
    const timer = setTimeout(() => setCallState('connected'), 2000);
    return () => clearTimeout(timer);
  });

  // Call timer
  useState(() => {
    if (callState !== 'connected') return;
    const interval = setInterval(() => setCallTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  });

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    setCallState('ended');
    setTimeout(() => router.push('/arya'), 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{
      background: 'linear-gradient(180deg, #1a0533 0%, #0d0015 50%, #09090b 100%)',
    }}>
      {/* Ambient rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full border border-purple-500/10 animate-pulse" />
        <div className="absolute w-80 h-80 rounded-full border border-purple-500/5 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute w-96 h-96 rounded-full border border-purple-500/[0.03] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Avatar */}
      <div className="relative z-10 mb-6">
        <div className={`w-28 h-28 rounded-full overflow-hidden shadow-2xl ${callState === 'connected' ? 'shadow-purple-500/30' : ''} transition-shadow duration-1000`}>
          <Image src="/arya-avatar.png" alt="Arya" width={112} height={112} className="w-full h-full object-cover" />
        </div>
        {callState === 'connected' && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-4 border-[#0d0015] flex items-center justify-center">
            <Volume2 size={10} className="text-white" />
          </div>
        )}
      </div>

      {/* Name + Status */}
      <h2 className="text-xl font-bold text-white mb-1 relative z-10">Arya</h2>
      <p className="text-sm text-purple-300/70 mb-8 relative z-10">
        {callState === 'connecting' && 'Connecting...'}
        {callState === 'connected' && formatTime(callTime)}
        {callState === 'ended' && 'Call ended'}
      </p>

      {/* Feature note */}
      {callState === 'connected' && (
        <div className="relative z-10 mb-8 px-5 py-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 max-w-xs text-center">
          <p className="text-xs text-purple-300/80">
            🎤 Voice calls with Arya coming soon! For now, use the chat feature.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-6 relative z-10">
        <button
          onClick={() => setMuted(!muted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-white/10 text-white' : 'bg-white/5 text-white/60'}`}
        >
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-95 transition-all"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
}
