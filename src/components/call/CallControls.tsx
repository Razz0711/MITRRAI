'use client';

import { CallStatus } from '@/hooks/useWebRTC';

interface CallControlsProps {
  status: CallStatus;
  audioOnly: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  showChat: boolean;
  unreadChat: number;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onEndCall: () => void;
}

export default function CallControls({
  status, audioOnly, isMuted, isVideoOff, isScreenSharing, showChat, unreadChat,
  onToggleMute, onToggleVideo, onToggleScreenShare, onToggleChat, onEndCall,
}: CallControlsProps) {
  return (
    <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-3 sm:gap-4">
      {/* Mute */}
      <button
        onClick={onToggleMute}
        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all shadow-lg ${
          isMuted ? 'bg-red-500 text-white ring-2 ring-red-400/50' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
        }`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🎤'}
      </button>

      {/* Camera toggle */}
      {!audioOnly && (
        <button
          onClick={onToggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all shadow-lg ${
            isVideoOff ? 'bg-red-500 text-white ring-2 ring-red-400/50' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
          }`}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? '📷' : '📹'}
        </button>
      )}

      {/* Screen share */}
      {!audioOnly && status === 'connected' && (
        <button
          onClick={onToggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all shadow-lg ${
            isScreenSharing ? 'bg-blue-500 text-white ring-2 ring-blue-400/50' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
          }`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          🖥️
        </button>
      )}

      {/* Chat toggle */}
      {status === 'connected' && (
        <button
          onClick={onToggleChat}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all shadow-lg relative ${
            showChat ? 'bg-[var(--primary)] text-white ring-2 ring-purple-400/50' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
          }`}
          title="Chat"
        >
          💬
          {unreadChat > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold animate-bounce">
              {unreadChat > 9 ? '9+' : unreadChat}
            </span>
          )}
        </button>
      )}

      {/* End call */}
      <button
        onClick={onEndCall}
        className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center text-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/30 ring-2 ring-red-400/20 active:scale-95"
        title="End Call"
      >
        📞
      </button>
    </div>
  );
}
