'use client';

import { CallStatus } from '@/hooks/useWebRTC';

interface CallWaitingProps {
  status: CallStatus;
  partnerName: string;
  audioOnly: boolean;
  roomName: string;
  codeCopied: boolean;
  onCopy: () => void;
}

export default function CallWaiting({
  status, partnerName, audioOnly, roomName, codeCopied, onCopy,
}: CallWaitingProps) {
  if (status === 'connected' || status === 'failed') return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="text-center px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-4xl animate-pulse shadow-lg shadow-purple-500/20">
          {audioOnly ? '🎙️' : '📹'}
        </div>
        <p className="text-xl font-semibold text-white mb-2">
          {status === 'getting-media' && 'Setting up...'}
          {status === 'waiting' && 'Waiting for partner...'}
          {status === 'connecting' && `Connecting with ${partnerName}...`}
        </p>
        <p className="text-sm text-gray-400 max-w-xs mx-auto">
          {status === 'getting-media' && 'Requesting camera & microphone access'}
          {status === 'waiting' && 'Share the room code below with your study buddy'}
          {status === 'connecting' && 'Establishing peer-to-peer connection...'}
        </p>
        {status === 'waiting' && (
          <div className="mt-8">
            <button
              onClick={onCopy}
              className="px-8 py-4 rounded-xl bg-white/10 border border-white/20 font-mono text-3xl tracking-[0.3em] text-white hover:bg-white/20 transition-all active:scale-95"
            >
              {codeCopied ? '✅ Copied!' : roomName}
            </button>
            <p className="text-xs text-gray-500 mt-3">Tap to copy room code</p>
          </div>
        )}
      </div>
    </div>
  );
}
