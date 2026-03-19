// ============================================
// MitrRAI - Single Room Page (chat + members + call)
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import CallRoom from '@/components/CallRoom';
import { Phone, ArrowLeft, Send } from 'lucide-react';
import { useChatStability } from '@/hooks/useChatStability';

interface RoomMsg {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

interface RoomMember {
  userId: string;
  userName: string;
  role: string;
  joinedAt: string;
}

interface Room {
  id: string;
  name: string;
  topic: string;
  description: string;
  creatorId: string;
  maxMembers: number;
  status: string;
}

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useChatStability();

  const myName = user?.email?.split('@')[0] || 'Student';

  const loadRoom = useCallback(async () => {
    if (!user || !id) return;
    try {
      const res = await fetch(`/api/rooms/${id}`);
      const data = await res.json();
      if (data.success) {
        setRoom(data.data.room);
        setMembers(data.data.members || []);
        setMessages(data.data.messages || []);
        setIsMember(
          (data.data.members || []).some((m: RoomMember) => m.userId === user.id)
        );
      }
    } catch (err) {
      console.error('loadRoom:', err);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (isMember) {
      pollRef.current = setInterval(loadRoom, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isMember, loadRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', userId: user.id, userName: myName }),
      });
      const data = await res.json();
      if (data.success) await loadRoom();
    } catch (err) {
      console.error('joinRoom:', err);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    try {
      await fetch(`/api/rooms/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', userId: user.id }),
      });
      await loadRoom();
    } catch (err) {
      console.error('leaveRoom:', err);
    }
  };

  const handleSend = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/rooms/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          userId: user.id,
          userName: myName,
          text: text.trim(),
        }),
      });
      setText('');
      await loadRoom();
    } catch (err) {
      console.error('sendMessage:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (!room) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-[var(--muted)] text-lg">Room not found.</p>
        <Link href="/rooms" className="text-[var(--primary-light)] hover:underline">← Back to Rooms</Link>
      </div>
    );
  }

  // Full-screen call mode
  if (inCall) {
    return (
      <div style={{ height: 'calc(100dvh - 60px)' }}>
        <CallRoom
          roomName={`room_${id}`}
          displayName={user?.name || myName}
          onLeave={() => setInCall(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_250px] gap-4" style={{ height: 'calc(100dvh - 120px)' }}>
      {/* Main Chat Area */}
      <div className="flex flex-col bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {/* Room Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/rooms" className="text-[var(--muted)] hover:text-[var(--foreground)]">←</Link>
              <h1 className="text-lg font-bold text-[var(--foreground)]">{room.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                room.status === 'active'
                  ? 'bg-[var(--success)]/15 text-[var(--success)]'
                  : 'bg-[var(--surface-light)] text-[var(--muted)]'
              }`}>{room.status}</span>
            </div>
            {room.topic && (
              <p className="text-sm text-[var(--muted)] ml-6">{room.topic}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isMember && (
              <>
                <button
                  onClick={() => setInCall(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/25 text-xs font-medium transition-colors"
                  title="Start voice/video call"
                >
                  <Phone size={14} /> Call
                </button>
                <button
                  onClick={handleLeave}
                  className="text-xs text-[var(--error)] hover:underline"
                >
                  Leave
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        {isMember ? (
          <>
             <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0" style={{ overscrollBehavior: 'contain' }}>
              {messages.length === 0 ? (
                <p className="text-center text-white/30 py-8">No messages yet. Start the conversation! 💬</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                      <div className="px-3 py-2" style={{
                        maxWidth: '75%',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        background: isMe ? '#7c71ff' : '#1e1e1e',
                        color: '#fff',
                        fontSize: '14px',
                        lineHeight: '1.45',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      }}>
                        {!isMe && <p className="text-xs font-semibold text-purple-400 mb-0.5">{msg.senderName}</p>}
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <p className="mt-1" style={{ fontSize: '10px', color: isMe ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.06] flex items-end gap-2" style={{ background: '#111111' }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => {
                  setText(e.target.value);
                  const ta = e.target;
                  ta.style.height = '40px';
                  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none bg-[#1e1e1e] text-white text-sm placeholder:text-white/30 rounded-2xl px-4 py-2.5 outline-none border border-white/8 focus:border-[#7c71ff]/50 transition-colors"
                style={{ minHeight: '40px', maxHeight: '160px', lineHeight: '1.4' }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white transition-all active:scale-90 disabled:opacity-30"
                style={{ background: '#7c71ff' }}
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <p className="text-4xl mb-4">🔒</p>
            <p className="text-[var(--muted)] mb-4">
              Join this room to chat with other students
            </p>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[#6d28d9] disabled:opacity-50"
            >
              {joining ? 'Joining...' : `Join Room (${members.length}/${room.maxMembers})`}
            </button>
          </div>
        )}
      </div>

      {/* Members Sidebar */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 space-y-4 hidden md:block">
        <h2 className="font-bold text-[var(--foreground)]">
          Members ({members.length}/{room.maxMembers})
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center gap-2 text-sm"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary-light)] font-bold text-xs">
                {m.userName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-[var(--foreground)]">
                  {m.userName}
                  {m.userId === user?.id && (
                    <span className="text-xs text-[var(--muted)] ml-1">(you)</span>
                  )}
                </p>
                {m.role === 'creator' && (
                  <span className="text-[10px] text-amber-500">Creator</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {room.description && (
          <>
            <hr className="border-[var(--border)]" />
            <div>
              <h3 className="text-xs uppercase text-[var(--muted)] mb-1">About</h3>
              <p className="text-sm text-[var(--muted)]">{room.description}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
