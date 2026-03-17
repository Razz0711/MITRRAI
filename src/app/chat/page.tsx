// ============================================
// MitrAI - Chat Page (redesigned v3)
// Fixed: tabs in sidebar, no double nav on mobile,
// clickable profile popup, Arya avatar
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { DirectMessage, ChatThread, UserStatus, StudentProfile, MatchResult } from '@/lib/types';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useChatStability } from '@/hooks/useChatStability';

import {
  Search,
  Paperclip,
  Smile,
  Send,
  MoreVertical,
  Phone,
  X,
  MessageSquare,
  Plus,
} from 'lucide-react';

/* ─── Profile Popup ─── */
function ProfilePopup({
  name, department, yearLevel, matchScore, isOnline, lastSeen, isFriend, onClose, onMessage,
}: {
  name: string; department?: string; yearLevel?: string; matchScore?: number;
  isOnline: boolean; lastSeen?: string; isFriend: boolean;
  onClose: () => void; onMessage: () => void;
}) {
  const avatarColors = ['bg-violet-600','bg-emerald-600','bg-blue-600','bg-pink-600','bg-amber-600','bg-cyan-600','bg-indigo-600','bg-rose-600'];
  const getColor = (n: string) => { let h=0; for(let i=0;i<n.length;i++) h=n.charCodeAt(i)+((h<<5)-h); return avatarColors[Math.abs(h)%avatarColors.length]; };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative w-80 rounded-3xl p-8 text-center profile-popup-enter" onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"><X size={18}/></button>
        {/* Large zoomed avatar */}
        <div className={`w-24 h-24 rounded-3xl ${getColor(name)} flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4 shadow-xl avatar-zoom`}>
          {name.charAt(0).toUpperCase()}
        </div>
        <h3 className="text-lg font-bold text-[var(--foreground)]">{name}</h3>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="text-xs text-[var(--muted)]">
            {isOnline ? 'Online' : (lastSeen || 'Offline')}
          </span>
        </div>
        <div className="flex items-center justify-center flex-wrap gap-2 mt-4">
          {department && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">
              {department} · {yearLevel || '?'}
            </span>
          )}
          {matchScore && matchScore > 0 && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">
              {matchScore}% match
            </span>
          )}
          {isFriend && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
              Friend
            </span>
          )}
        </div>
        <button onClick={onMessage} className="mt-5 w-full py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--primary), #6d28d9)' }}>
          <MessageSquare size={15} className="inline mr-2 -mt-0.5" />Message
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const { play: playSound } = useNotificationSound();
  useChatStability();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [pendingFriend, setPendingFriend] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'friends'>('all');
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [profilePopup, setProfilePopup] = useState<string | null>(null);
  const [showDiscoverSheet, setShowDiscoverSheet] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const COMMON_EMOJIS = ['😊','😂','❤️','🔥','👍','😭','🥺','😍','🙏','💕','✨','😅','🤔','💜','👀','🎉','😎','🥰','💪','😢','🤣','😘','🙈','👏','💯','😳','🤗','✌️','💀','🫶','😌','🤝','🫣','👋','😤','🥵','❤️‍🔥','🤭','😏','💔'];

  const insertEmoji = (emoji: string) => {
    setNewMsg(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Send file name as a message (attachment placeholder)
    sendMessage(`📎 ${file.name}`);
    e.target.value = '';
  };

  const studentId = typeof window !== 'undefined'
    ? localStorage.getItem('mitrai_student_id') || user?.id
    : user?.id;

  const currentStudent = allStudents.find(s => s.id === studentId) || null;

  /* ─── helpers ─── */
  const avatarColors = ['bg-violet-600','bg-emerald-600','bg-blue-600','bg-pink-600','bg-amber-600','bg-cyan-600','bg-indigo-600','bg-rose-600'];
  const getAvatarColor = (name: string) => { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return avatarColors[Math.abs(h)%avatarColors.length]; };
  const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';
  const getOtherUserName = (thread: ChatThread) => thread.user1Id === studentId ? (thread.user2Name || 'Unknown') : (thread.user1Name || 'Unknown');
  const getOtherUserId = (thread: ChatThread) => thread.user1Id === studentId ? thread.user2Id : thread.user1Id;
  const getUnreadCount = (thread: ChatThread) => thread.user1Id === studentId ? thread.unreadCount1 : thread.unreadCount2;

  const formatTime = (iso: string) => {
    const d = new Date(iso); const now = new Date(); const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  const formatMessageTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  const getDateLabel = (iso: string) => {
    const d = new Date(iso); const now = new Date();
    if (d.toDateString() === now.toDateString()) return `Today · ${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
    const y = new Date(now); y.setDate(y.getDate()-1);
    if (d.toDateString() === y.toDateString()) return `Yesterday · ${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
    return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const getStudentInfo = (userId: string) => allStudents.find(s => s.id === userId);
  const getLastSeenText = (userId: string) => {
    const s = statuses[userId]; if (!s) return '';
    if (s.status === 'online' || s.status === 'in-session') return 'Online';
    if (s.lastSeen) {
      const diff = Date.now() - new Date(s.lastSeen).getTime();
      if (diff < 3600000) return `last seen ${Math.floor(diff/60000)}m ago`;
      if (diff < 86400000) return `last seen ${Math.floor(diff/3600000)}h ago`;
      return `last seen ${new Date(s.lastSeen).toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
    }
    return 'Offline';
  };

  /* ─── data loading ─── */
  const loadThreads = useCallback(async () => {
    if (!studentId) return;
    try {
      const [tRes, sRes] = await Promise.all([fetch(`/api/chat?userId=${studentId}`), fetch('/api/status')]);
      const tD = await tRes.json(); setThreads(tD.threads || []);
      const sD = await sRes.json();
      if (sD.success) { const m: Record<string, UserStatus> = {}; (sD.data||[]).forEach((s: UserStatus)=>{m[s.userId]=s;}); setStatuses(m); }
    } catch(e){console.error('loadThreads:',e);}
    setLoading(false);
  }, [studentId]);

  const loadMessages = useCallback(async () => {
    if (!selectedChatId || !studentId) return;
    try {
      const res = await fetch(`/api/chat?chatId=${selectedChatId}&userId=${studentId}`);
      const data = await res.json(); const serverMsgs: DirectMessage[] = data.messages || [];
      setMessages(prev => {
        const optimistic = prev.filter(m => m.id.startsWith('optimistic_') && !serverMsgs.some(s => s.text === m.text && s.senderId === m.senderId));
        return [...serverMsgs, ...optimistic];
      });
    } catch(e){console.error('loadMessages:',e);}
  }, [selectedChatId, studentId]);

  const markRead = useCallback(async () => {
    if (!selectedChatId || !studentId) return;
    try { await fetch('/api/chat', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({chatId:selectedChatId,userId:studentId}) }); } catch(e){console.error('markRead:',e);}
  }, [selectedChatId, studentId]);

  const loadStudents = useCallback(async () => { try { const r = await fetch('/api/students'); const d = await r.json(); if(d.success) setAllStudents(d.data||[]); } catch{/**/} }, []);
  const loadFriends = useCallback(async () => {
    if (!studentId) return;
    try { const r = await fetch(`/api/friends?userId=${studentId}`); const d = await r.json();
      if(d.success){ const ids = new Set<string>((d.data.friends||[]).map((f:{user1Id:string;user2Id:string})=>f.user1Id===studentId?f.user2Id:f.user1Id)); setFriendIds(ids); }
    } catch{/**/}
  }, [studentId]);
  const loadMatchScores = useCallback(async () => {
    if (!studentId) return;
    try { const r = await fetch('/api/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId})}); const d = await r.json();
      if(d.success&&d.data.matches){ const sc:Record<string,number>={}; d.data.matches.forEach((m:MatchResult)=>{sc[m.student.id]=m.score.overall;}); setMatchScores(sc); }
    } catch{/**/}
  }, [studentId]);

  useEffect(()=>{ loadThreads(); loadStudents(); loadFriends(); loadMatchScores(); }, [loadThreads, loadStudents, loadFriends, loadMatchScores]);
  useEffect(()=>{ if(selectedChatId){ loadMessages(); markRead(); } }, [selectedChatId, loadMessages, markRead]);
  useEffect(()=>{ messagesEndRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  // Realtime
  useEffect(() => {
    if (!studentId) return;
    const msgCh = supabaseBrowser.channel('chat-messages').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},(payload)=>{
      const row = payload.new as Record<string,string>|undefined; if(!row) return;
      if(row.sender_id!==studentId&&row.receiver_id!==studentId) return;
      if(row.sender_id!==studentId) playSound('message');
      loadThreads();
      if(selectedChatId&&row.chat_id===selectedChatId){
        const nm:DirectMessage={id:row.id,chatId:row.chat_id,senderId:row.sender_id,senderName:row.sender_name||'',receiverId:row.receiver_id||'',text:row.text,read:row.read==='true',createdAt:row.created_at};
        setMessages(prev=>{if(prev.some(m=>m.id===nm.id))return prev;const oi=prev.findIndex(m=>m.id.startsWith('optimistic_')&&m.senderId===nm.senderId&&m.text===nm.text);if(oi>=0){const u=[...prev];u[oi]=nm;return u;}return[...prev,nm];});
        if(row.sender_id!==studentId) markRead();
      }
    }).on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},(payload)=>{
      const row=payload.new as Record<string,string>|undefined; if(!row) return;
      if(selectedChatId&&row.chat_id===selectedChatId) setMessages(prev=>prev.map(m=>m.id===row.id?{...m,read:row.read==='true'||(row.read as unknown)===true}:m));
    }).subscribe();
    const thCh = supabaseBrowser.channel('chat-threads').on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_threads'},()=>{loadThreads();}).subscribe();
    const poll = setInterval(()=>{if(selectedChatId) loadMessages();},5000);
    return()=>{supabaseBrowser.removeChannel(msgCh);supabaseBrowser.removeChannel(thCh);clearInterval(poll);};
  }, [studentId, selectedChatId, loadThreads, loadMessages, markRead, playSound]);

  // Send message
  const sendMessage = async (text?: string) => {
    const msgText = (text||newMsg).trim(); if(!msgText||!selectedChatId||!studentId||sending) return;
    let receiverId:string; let receiverName:string;
    const st = threads.find(t=>t.chatId===selectedChatId);
    if(st){receiverId=st.user1Id===studentId?st.user2Id:st.user1Id;receiverName=st.user1Id===studentId?st.user2Name:st.user1Name;}
    else if(pendingFriend){receiverId=pendingFriend.id;receiverName=pendingFriend.name;} else return;
    setSending(true);setNewMsg('');inputRef.current?.focus();
    const oid=`optimistic_${Date.now()}`;
    const om:DirectMessage={id:oid,chatId:selectedChatId,senderId:studentId,senderName:user?.name||'Unknown',receiverId,text:msgText,read:false,createdAt:new Date().toISOString()};
    setMessages(prev=>[...prev,om]);
    setThreads(prev=>prev.map(t=>t.chatId===selectedChatId?{...t,lastMessage:msgText,lastMessageAt:new Date().toISOString()}:t));
    try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senderId:studentId,senderName:user?.name||'Unknown',receiverId,receiverName,text:msgText})});const d=await r.json();if(d.message)setMessages(prev=>prev.map(m=>m.id===oid?{...d.message}:m));setPendingFriend(null);loadThreads();}catch(e){console.error('sendMessage:',e);}
    setSending(false);
  };

  const handleDeleteMessage = async (messageId:string) => {
    if(!studentId||!confirm('Delete this message?')) return;
    setMessages(prev=>prev.filter(m=>m.id!==messageId));
    try{const r=await fetch('/api/chat',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({messageId,userId:studentId})});const d=await r.json();if(d.success)loadThreads();else loadMessages();}catch{loadMessages();}
  };

  // URL params
  useEffect(()=>{
    if(typeof window==='undefined') return;
    const p=new URLSearchParams(window.location.search); const fId=p.get('friendId'); const fName=p.get('friendName');
    if(fId&&studentId){const cid=[studentId,fId].sort().join('__');setSelectedChatId(cid);setShowSidebar(false);if(fName)setPendingFriend({id:fId,name:fName});window.history.replaceState({},'','/chat');}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[studentId]);

  /* ─── computed ─── */
  const filteredThreads = threads.filter(t => {
    const name = getOtherUserName(t);
    if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === 'unread' && getUnreadCount(t) === 0) return false;
    if (filter === 'friends' && !friendIds.has(getOtherUserId(t))) return false;
    return true;
  });
  const quickReplies = ['Study together?', 'Free tonight?', 'Need help?'];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center">
          <p className="text-[var(--muted)]">Please sign in to access chat</p>
          <Link href="/login" className="btn-primary mt-4 inline-block">Sign In</Link>
        </div>
      </div>
    );
  }

  /* ─── selected chat info ─── */
  const selectedThread = threads.find(t=>t.chatId===selectedChatId);
  const chatOtherName = selectedThread ? getOtherUserName(selectedThread) : (pendingFriend?.name||'?');
  const chatOtherId = selectedThread ? getOtherUserId(selectedThread) : (pendingFriend?.id||'');
  const chatOtherStudent = getStudentInfo(chatOtherId);
  const chatIsOnline = (statuses[chatOtherId]?.status==='online'||statuses[chatOtherId]?.status==='in-session');
  const chatMatchScore = matchScores[chatOtherId]||0;

  const getMatchContext = () => {
    if(!currentStudent||!chatOtherStudent) return null;
    const parts:string[]=[];
    if(currentStudent.department?.toLowerCase()===chatOtherStudent.department?.toLowerCase()&&currentStudent.department) parts.push(chatOtherStudent.department);
    if(currentStudent.yearLevel?.toLowerCase()===chatOtherStudent.yearLevel?.toLowerCase()&&currentStudent.yearLevel) parts.push(chatOtherStudent.yearLevel);
    if(parts.length===0&&chatMatchScore===0) return null;
    const ctx = parts.length>0?`You and ${chatOtherName.split(' ')[0]} are both in ${parts.join(' ')}`:`You and ${chatOtherName.split(' ')[0]} are matched`;
    return `${ctx}${chatMatchScore>0?` · ${chatMatchScore}% match`:''}`;
  };

  const messagesByDate:{date:string;msgs:DirectMessage[]}[]=[];
  messages.forEach(msg=>{const dk=new Date(msg.createdAt).toDateString();const g=messagesByDate.find(x=>x.date===dk);if(g)g.msgs.push(msg);else messagesByDate.push({date:dk,msgs:[msg]});});

  // Profile popup data
  const popupStudent = profilePopup ? getStudentInfo(profilePopup) : null;
  const popupThread = profilePopup ? threads.find(t => getOtherUserId(t) === profilePopup) : null;

  return (
    <div className="min-h-screen chat-polish relative overflow-x-hidden max-w-[100vw]">
      <div className="chat-aura chat-aura-1" />
      <div className="chat-aura chat-aura-2" />

      <div className="h-[calc(100vh-4.5rem)] md:h-[calc(100vh-3.5rem)] flex">



        {/* ═══════ SIDEBAR ═══════ */}
        <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col flex-1 md:flex-none md:w-72 lg:w-80 md:border-r md:border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)] overflow-hidden`}>

          {/* Header */}
          <div className="p-4 pb-2 flex items-center justify-between">
            <h1 className="text-lg font-bold text-[var(--foreground)]">Chats</h1>
            <button onClick={() => document.getElementById('chat-search')?.focus()} className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              <Search size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input id="chat-search" type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search chats..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border border-[var(--glass-border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30" />
            </div>
          </div>


          <div className="px-3 pt-3 pb-2">
            <div className="flex gap-1.5">
              {(['all','unread','friends'] as const).map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter===f?'bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/30':'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]'}`}>
                  {f==='all'?'All':f==='unread'?'Unread':'Friends'}
                </button>
              ))}
            </div>
          </div>

          {/* PEOPLE label */}
          <div className="px-4 pt-2 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">People</p>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] text-[var(--muted)]">Loading conversations...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-[var(--muted)]">{searchQuery?'No matches found.':filter==='unread'?'No unread messages.':'No chats yet.'}</p>
                {!searchQuery && filter==='all' && (
                  <Link href="/friends" className="text-xs text-[var(--primary-light)] hover:underline mt-2 inline-block">Find friends to start chatting</Link>
                )}
              </div>
            ) : (
              filteredThreads.map(thread => {
                const otherName = getOtherUserName(thread);
                const otherId = getOtherUserId(thread);
                const otherStudent = getStudentInfo(otherId);
                const otherStatus = statuses[otherId];
                const isOnline = otherStatus?.status==='online'||otherStatus?.status==='in-session';
                const unread = getUnreadCount(thread);
                const isActive = selectedChatId === thread.chatId;
                const score = matchScores[otherId]||0;

                return (
                  <div key={thread.chatId} className={`flex items-center gap-2.5 transition-colors border-l-3 ${
                    isActive ? 'bg-[var(--surface)] border-l-[var(--primary)]' : 'border-l-transparent hover:bg-[var(--surface)]/50'}`}
                    style={{ borderLeftWidth: isActive ? '3px' : '3px' }}
                  >  {/* Clickable Avatar */}
                    <button
                      onClick={() => setProfilePopup(otherId)}
                      className="shrink-0 ml-3 my-2.5"
                      title={`View ${otherName}'s profile`}
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-xl ${getAvatarColor(otherName)} flex items-center justify-center text-white font-semibold text-sm`}>
                          {getInitial(otherName)}
                        </div>
                        {isOnline && <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--background)]" />}
                      </div>
                    </button>
                    {/* Rest — opens chat */}
                    <button
                      onClick={() => { setSelectedChatId(thread.chatId); setShowSidebar(false); markRead(); }}
                      className="flex-1 min-w-0 text-left py-2.5 pr-3"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-semibold text-[var(--foreground)] truncate">{otherName}</span>
                        <span className="text-[10px] text-[var(--muted)] shrink-0 ml-2">{thread.lastMessageAt?formatTime(thread.lastMessageAt):''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {otherStudent?.department && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">
                            {otherStudent.department.length > 6 ? otherStudent.department.slice(0,6) : otherStudent.department} · {otherStudent.yearLevel||'?'}
                          </span>
                        )}
                        {score>0 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">{score}%</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[var(--muted)] truncate">{thread.lastMessage||'No messages yet'}</span>
                        {unread>0 && <span className="ml-2 w-5 h-5 rounded-full bg-green-500 text-[10px] font-bold text-white flex items-center justify-center shrink-0">{unread}</span>}
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* FAB — WhatsApp-style + button */}
        {showSidebar && (
          <button
            onClick={() => setShowDiscoverSheet(true)}
            className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-[var(--primary)] to-[#6d28d9] flex items-center justify-center text-white shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-90 transition-all md:bottom-8 md:right-8"
            title="Find SVNIT students"
          >
            <Plus size={24} />
          </button>
        )}
        {/* ═══════ CHAT AREA ═══════ */}
        <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-[var(--surface)]/30`}>
          {selectedChatId ? (
            <>
              {/* Chat Header — avatar is clickable */}
              <div className="px-4 py-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_95%,transparent)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={()=>setShowSidebar(true)} className="md:hidden text-[var(--muted)] hover:text-[var(--foreground)] text-sm">←</button>
                  {/* Clickable avatar */}
                  <button onClick={() => setProfilePopup(chatOtherId)} title={`View ${chatOtherName}'s profile`}>
                    <div className="relative">
                      <div className={`w-9 h-9 rounded-xl ${getAvatarColor(chatOtherName)} flex items-center justify-center text-white font-semibold text-sm`}>
                        {getInitial(chatOtherName)}
                      </div>
                      {chatIsOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--background)]" />}
                    </div>
                  </button>
                  <div>
                    <button onClick={() => setProfilePopup(chatOtherId)} className="text-sm font-semibold text-[var(--foreground)] hover:underline">{chatOtherName}</button>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {chatOtherStudent?.department && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">
                          {chatOtherStudent.department.length > 6 ? chatOtherStudent.department.slice(0,6) : chatOtherStudent.department} · {chatOtherStudent.yearLevel||'?'}
                        </span>
                      )}
                      {chatMatchScore>0 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">{chatMatchScore}% match</span>}
                      <span className="text-[10px] text-[var(--muted)]">· {getLastSeenText(chatOtherId)}</span>
                    </div>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 chat-message-pane">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[var(--muted)] mb-2">No messages yet</p>
                      <p className="text-xs text-[var(--muted)]">Say hi to {chatOtherName.split(' ')[0]}!</p>
                    </div>
                  </div>
                ) : (
                  messagesByDate.map(group => (
                    <div key={group.date}>
                      <div className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-medium text-[var(--muted)]" style={{background:'var(--surface)',border:'1px solid var(--glass-border)'}}>
                          {getDateLabel(group.msgs[0].createdAt)}
                        </span>
                      </div>
                      {group.date===messagesByDate[0]?.date && getMatchContext() && (
                        <div className="mx-auto max-w-md mb-4 px-4 py-3 rounded-xl" style={{background:'var(--surface)',border:'1px solid var(--glass-border)'}}>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-violet-400 mb-1">Match Context</p>
                          <p className="text-xs text-[var(--foreground)]">{getMatchContext()}</p>
                        </div>
                      )}
                      <div className="space-y-2">
                        {group.msgs.map(msg => {
                          const isMine = msg.senderId === studentId;
                          return (
                            <div key={msg.id} className={`flex ${isMine?'justify-end':'justify-start'} group`}>
                              {isMine && (
                                <button onClick={()=>handleDeleteMessage(msg.id)} className="opacity-40 md:opacity-0 md:group-hover:opacity-100 transition-opacity self-center mr-1 text-red-400 hover:text-red-500 text-xs px-1.5 py-0.5 rounded hover:bg-red-500/10" title="Delete">✕</button>
                              )}
                              <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${isMine?'bg-[var(--primary)] text-white rounded-br-md':'bg-[var(--surface-light)] text-[var(--foreground)] rounded-bl-md border border-[var(--glass-border)]'}`}>
                                <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                                <div className={`flex items-center gap-1 mt-1 ${isMine?'justify-end':'justify-start'}`}>
                                  <span className={`text-[10px] ${isMine?'text-white/60':'text-[var(--muted)]'}`}>{formatMessageTime(msg.createdAt)}</span>
                                  {isMine && <span className="text-[10px] text-white/60">{msg.read?'✓✓':'✓'}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies */}
              {messages.length <= 2 && (
                <div className="px-4 py-2 border-t border-[var(--border)] flex gap-2 overflow-x-auto no-scrollbar">
                  {quickReplies.map(r=>(
                    <button key={r} onClick={()=>sendMessage(r)} className="shrink-0 px-4 py-2 rounded-full text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-light)]" style={{border:'1px solid var(--glass-border)'}}>{r}</button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)]">
                {/* Emoji Picker */}
                {emojiOpen && (
                  <div className="mb-2 p-2 rounded-xl border border-[var(--glass-border)] bg-[var(--surface)]">
                    <div className="grid grid-cols-10 gap-1">
                      {COMMON_EMOJIS.map(emoji => (
                        <button key={emoji} onClick={() => insertEmoji(emoji)} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-[var(--surface-light)] transition-colors active:scale-90">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                <form onSubmit={e=>{e.preventDefault();sendMessage();}} className="flex items-center gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1" title="Attach file"><Paperclip size={18}/></button>
                  <button type="button" onClick={() => setEmojiOpen(!emojiOpen)} className={`transition-colors p-1 ${emojiOpen ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`} title="Emoji"><Smile size={18}/></button>
                  <input ref={inputRef} type="text" value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder="Type a message..." className="flex-1 input-field text-sm py-2.5" disabled={sending} autoFocus />
                  <button type="submit" disabled={!newMsg.trim()||sending} className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40" style={{background:'linear-gradient(135deg, var(--primary), #6d28d9)'}}>
                    {sending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Send size={16}/>}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">MitrAI Chat</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Select a conversation or start a new one</p>
                <Link href="/friends" className="btn-primary mt-4 inline-block text-sm py-2 px-4">Find Friends</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Popup */}
      {profilePopup && popupStudent && (
        <ProfilePopup
          name={popupStudent.name}
          department={popupStudent.department}
          yearLevel={popupStudent.yearLevel}
          matchScore={matchScores[profilePopup]}
          isOnline={statuses[profilePopup]?.status === 'online' || statuses[profilePopup]?.status === 'in-session'}
          lastSeen={getLastSeenText(profilePopup)}
          isFriend={friendIds.has(profilePopup)}
          onClose={() => setProfilePopup(null)}
          onMessage={() => {
            if (studentId && profilePopup) {
              const chatId = [studentId, profilePopup].sort().join('__');
              setSelectedChatId(chatId);
              setShowSidebar(false);
              setProfilePopup(null);
            }
          }}
        />
      )}

      {/* ═══ Discover Sheet (+ icon) ═══ */}
      {showDiscoverSheet && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm" onClick={() => { setShowDiscoverSheet(false); setDiscoverSearch(''); }} />
          <div className="fixed inset-x-0 bottom-0 z-[56] rounded-t-3xl max-h-[85vh] flex flex-col" style={{ background: 'var(--background)', border: '1px solid var(--glass-border)' }}>
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-[var(--muted)]/30 mx-auto mt-3 mb-2" />
            
            {/* Header */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--foreground)]">Find SVNIT Students</h2>
              <button onClick={() => { setShowDiscoverSheet(false); setDiscoverSearch(''); }} className="w-8 h-8 rounded-full bg-[var(--surface)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  value={discoverSearch}
                  onChange={e => setDiscoverSearch(e.target.value)}
                  placeholder="Search by name or branch..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border border-[var(--glass-border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
                  autoFocus
                />
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto px-2 pb-[env(safe-area-inset-bottom)]">
              {(() => {
                const filtered = allStudents
                  .filter(s => s.id !== studentId)
                  .filter(s => {
                    if (!discoverSearch.trim()) return true;
                    const q = discoverSearch.toLowerCase();
                    return (
                      s.name.toLowerCase().includes(q) ||
                      (s.department || '').toLowerCase().includes(q) ||
                      (s.yearLevel || '').toLowerCase().includes(q)
                    );
                  });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <p className="text-xs text-[var(--muted)]">{discoverSearch ? 'No students match your search.' : 'No students found.'}</p>
                    </div>
                  );
                }

                return filtered.map(student => {
                  const isOnline = statuses[student.id]?.status === 'online' || statuses[student.id]?.status === 'in-session';
                  const score = matchScores[student.id] || 0;
                  // Check if already connected (has a thread)
                  const hasThread = threads.some(t => {
                    const otherId = t.chatId.split('__').find((id: string) => id !== studentId);
                    return otherId === student.id;
                  });

                  return (
                    <div key={student.id} className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl hover:bg-[var(--surface)]/50 transition-colors">
                      <button onClick={() => { setProfilePopup(student.id); }} className="shrink-0">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-xl ${getAvatarColor(student.name)} flex items-center justify-center text-white font-semibold text-sm`}>
                            {getInitial(student.name)}
                          </div>
                          {isOnline && <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--background)]" />}
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{student.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {student.department && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">
                              {student.department} · {student.yearLevel||'?'}
                            </span>
                          )}
                          {score > 0 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">{score}%</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (studentId) {
                            const chatId = [studentId, student.id].sort().join('__');
                            setSelectedChatId(chatId);
                            setShowSidebar(false);
                            setShowDiscoverSheet(false);
                            setDiscoverSearch('');
                          }
                        }}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95 ${
                          hasThread
                            ? 'text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/15'
                            : 'text-white bg-gradient-to-r from-[var(--primary)] to-[#6d28d9] hover:shadow-md hover:shadow-purple-500/20'
                        }`}
                      >
                        {hasThread ? 'Message' : 'Connect'}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </>
      )}


      <style jsx>{`
        .chat-polish { z-index: 1; }
        @keyframes bounce-in {
          0% { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
          50% { transform: translate(-50%, -5px) scale(1.02); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .animate-bounce-in { animation: bounce-in 0.35s ease-out; }
        @keyframes popup-enter {
          0% { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        .profile-popup-enter { animation: popup-enter 0.25s ease-out; }
        @keyframes avatar-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .avatar-zoom { animation: avatar-pop 0.4s ease-out; }
        .chat-aura { position: absolute; pointer-events: none; border-radius: 999px; filter: blur(52px); opacity: 0.12; z-index: 0; }
        .chat-aura-1 { width: 260px; height: 180px; top: 70px; left: -90px; background: rgba(99, 102, 241, 0.35); }
        .chat-aura-2 { width: 240px; height: 170px; top: 260px; right: -70px; background: rgba(236, 72, 153, 0.2); }
        .chat-message-pane { background-image: radial-gradient(circle at 20% 0%, rgba(124, 58, 237, 0.07), transparent 45%); }
        @media (max-width: 768px) { .chat-aura { opacity: 0.08; } }
        @media (prefers-reduced-motion: reduce) { .chat-aura { display: none; } }
      `}</style>
    </div>
  );
}
