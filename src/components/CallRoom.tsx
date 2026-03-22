// ============================================
// MitrRAI - CallRoom
// Thin orchestrator — all WebRTC logic lives in useWebRTC.
// UI sub-components: CallWaiting, CallControls, CallChatPanel
// ============================================

'use client';

import { useWebRTC } from '@/hooks/useWebRTC';
import CallWaiting from '@/components/call/CallWaiting';
import CallControls from '@/components/call/CallControls';
import CallChatPanel from '@/components/call/CallChatPanel';

interface CallRoomProps {
  roomName: string;
  displayName: string;
  onLeave?: () => void;
  audioOnly?: boolean;
}

export default function CallRoom({ roomName, displayName, onLeave, audioOnly = false }: CallRoomProps) {
  const {
    status, isMuted, isVideoOff, partnerName, duration, error, codeCopied,
    isScreenSharing, partnerScreenSharing,
    chatMessages, chatInput, setChatInput, showChat, unreadChat,
    myId,
    localVideoRef, remoteVideoRef, remoteAudioRef, chatEndRef,
    toggleMute, toggleVideo, toggleScreenShare,
    sendChatMessage, toggleChat, endCall, copyRoomCode,
    formatDuration,
  } = useWebRTC({ roomName, displayName, audioOnly, onLeave });

  // ── Error screen ──
  if (error) {
    const isPermissionError = error.toLowerCase().includes('denied') || error.toLowerCase().includes('microphone');
    return (
      <div className="h-full flex items-center justify-center bg-[#0f0f1a]">
        <div className="p-8 text-center max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-5xl mb-4">{isPermissionError ? '🎙️' : '📡'}</div>
          <h3 className="text-xl font-bold mb-2 text-[var(--error)]">
            {isPermissionError ? 'Permission Required' : 'Connection Error'}
          </h3>
          <p className="text-[var(--muted)] mb-6 text-sm">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => onLeave?.()}
              className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--muted)] text-sm hover:bg-[var(--surface-light)] transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div className="h-full flex flex-col bg-[#0f0f1a] relative overflow-hidden select-none">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Remote video */}
      {!audioOnly && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
            status === 'connected' ? 'opacity-100' : 'opacity-0'
          } ${partnerScreenSharing ? 'object-contain bg-black' : 'object-cover'}`}
        />
      )}

      {/* Screen share indicators */}
      {partnerScreenSharing && status === 'connected' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-blue-500/90 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-2 shadow-lg">
          📺 {partnerName} is sharing screen
        </div>
      )}
      {isScreenSharing && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-red-500/90 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-2 shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white" />
          You are sharing your screen
        </div>
      )}

      {/* Waiting / connecting overlay */}
      <CallWaiting
        status={status}
        partnerName={partnerName}
        audioOnly={audioOnly}
        roomName={roomName}
        codeCopied={codeCopied}
        onCopy={copyRoomCode}
      />

      {/* Voice-only connected UI */}
      {audioOnly && status === 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-6xl font-bold text-white shadow-2xl shadow-purple-500/30 ring-4 ring-purple-500/20">
              {partnerName.charAt(0).toUpperCase() || '?'}
            </div>
            <p className="text-2xl font-semibold text-white mb-1">{partnerName}</p>
            <p className="text-sm text-green-400 font-medium">{formatDuration(duration)}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400">Connected · P2P</span>
            </div>
          </div>
        </div>
      )}

      {/* Failed */}
      {status === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center max-w-md p-6">
            <div className="text-5xl mb-4">😔</div>
            <h3 className="text-xl font-bold text-red-400 mb-2">Connection Lost</h3>
            <p className="text-gray-400 mb-6 text-sm">
              The call was disconnected. This can happen due to network issues or firewall restrictions.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
                🔄 Reconnect
              </button>
              <button onClick={() => onLeave?.()} className="px-5 py-2.5 rounded-lg border border-white/20 text-white text-sm hover:bg-white/10">
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-20 px-4 py-3 flex items-center justify-between bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            status === 'connected' ? 'bg-green-500 animate-pulse' : status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
          }`} />
          <span className="text-sm font-medium text-white">
            {audioOnly ? '🎙️ Voice Call' : '📹 Video Call'}
            {status === 'connected' && ` · ${formatDuration(duration)}`}
          </span>
        </div>
        {status === 'connected' && partnerName && (
          <span className="text-sm text-gray-300 truncate max-w-[150px]">{partnerName}</span>
        )}
      </div>

      {/* Local video PiP */}
      {!audioOnly && (
        <div className="absolute top-16 right-4 z-20 w-28 h-40 sm:w-36 sm:h-48 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
              <span className="text-3xl">📷</span>
              <p className="text-[10px] text-gray-400 mt-1">Camera Off</p>
            </div>
          )}
        </div>
      )}

      {/* In-call chat panel */}
      {showChat && (
        <CallChatPanel
          messages={chatMessages}
          chatInput={chatInput}
          myId={myId}
          chatEndRef={chatEndRef}
          onInputChange={setChatInput}
          onSend={sendChatMessage}
          onClose={toggleChat}
        />
      )}

      {/* Bottom controls */}
      <CallControls
        status={status}
        audioOnly={audioOnly}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        showChat={showChat}
        unreadChat={unreadChat}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={toggleChat}
        onEndCall={endCall}
      />
    </div>
  );
}
