'use client';

import { RefObject } from 'react';
import { ChatMsg } from '@/hooks/useWebRTC';

interface CallChatPanelProps {
  messages: ChatMsg[];
  chatInput: string;
  myId: string;
  chatEndRef: RefObject<HTMLDivElement>;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onClose: () => void;
}

export default function CallChatPanel({
  messages, chatInput, myId, chatEndRef, onInputChange, onSend, onClose,
}: CallChatPanelProps) {
  return (
    <div
      className="absolute bottom-28 left-3 right-3 sm:left-auto sm:right-4 sm:w-80 z-30 bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col shadow-2xl"
      style={{ maxHeight: '50vh' }}
    >
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-semibold text-white">💬 Chat</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm transition-colors">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: '35vh', minHeight: '120px' }}>
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-500 py-6">No messages yet. Say hi! 👋</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === myId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
              msg.from === myId
                ? 'bg-[var(--primary)]/40 text-white rounded-br-md'
                : 'bg-white/10 text-gray-200 rounded-bl-md'
            }`}>
              {msg.from !== myId && (
                <p className="font-semibold text-[var(--primary-light)] text-[10px] mb-0.5">{msg.name}</p>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-2 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSend(); }}
          placeholder="Type a message..."
          className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-[var(--primary)]/50"
          autoComplete="off"
        />
        <button
          onClick={onSend}
          disabled={!chatInput.trim()}
          className="px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-30 transition-opacity"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
