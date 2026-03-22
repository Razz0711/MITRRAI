// ============================================
// MitrRAI - useWebRTC Hook
// Encapsulates all WebRTC + Supabase signaling logic.
// Consumed by CallRoom.tsx — keeps the component thin.
// ============================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { playNotificationSound } from '@/hooks/useNotificationSound';

// ── Types ──────────────────────────────────────────────────────────────────

export type CallStatus = 'getting-media' | 'waiting' | 'connecting' | 'connected' | 'failed';

export interface ChatMsg {
  id: string;
  from: string;
  name: string;
  text: string;
  ts: number;
}

interface UseWebRTCOptions {
  roomName: string;
  displayName: string;
  audioOnly?: boolean;
  onLeave?: () => void;
}

// ── ICE server helpers (module-level cache) ─────────────────────────────────

const FALLBACK_ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

let _cachedIceServers: RTCIceServer[] | null = null;
let _fetchingIce = false;

async function getIceServers(): Promise<RTCIceServer[]> {
  if (_cachedIceServers) return _cachedIceServers;
  if (_fetchingIce) {
    await new Promise(r => setTimeout(r, 1500));
    return _cachedIceServers || FALLBACK_ICE;
  }
  _fetchingIce = true;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('/api/turn-credentials', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return FALLBACK_ICE;
    const data = await res.json();
    if (Array.isArray(data.servers) && data.servers.length > 0) {
      _cachedIceServers = [...FALLBACK_ICE, ...data.servers];
      return _cachedIceServers;
    }
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) {
      console.error('[ICE] Failed to fetch TURN credentials:', e);
    }
  } finally {
    _fetchingIce = false;
  }
  return FALLBACK_ICE;
}

const isMobile = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// ── Hook ───────────────────────────────────────────────────────────────────

export function useWebRTC({ roomName, displayName, audioOnly = false, onLeave }: UseWebRTCOptions) {
  const [status, setStatus] = useState<CallStatus>('getting-media');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(audioOnly);
  const [partnerName, setPartnerName] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [partnerScreenSharing, setPartnerScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  // Video element refs — returned so CallRoom can attach them to <video> elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Internal refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const announceRef = useRef<NodeJS.Timeout | null>(null);
  const myId = useRef(`${Date.now()}_${Math.random().toString(36).slice(2, 10)}`).current;
  const negotiatingRef = useRef(false);
  const connectedRef = useRef(false);
  const showChatRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (announceRef.current) { clearInterval(announceRef.current); announceRef.current = null; }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (channelRef.current) {
      supabaseBrowser.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    connectedRef.current = false;
    negotiatingRef.current = false;
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // ── 1. Subscribe to signaling channel ──
        try {
          const existingChannels = supabaseBrowser.getChannels();
          for (const ch of existingChannels) {
            if (ch.topic === `realtime:call:${roomName}`) {
              supabaseBrowser.removeChannel(ch);
            }
          }
        } catch { /* ignore */ }

        const channel = supabaseBrowser.channel(`call:${roomName}`, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        const channelReady = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 10000);
          channel.subscribe((subStatus: string) => {
            if (subStatus === 'SUBSCRIBED') { clearTimeout(timeout); resolve(true); }
            if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') { clearTimeout(timeout); resolve(false); }
          });
        });

        if (!channelReady) {
          try { supabaseBrowser.removeChannel(channel); } catch { /* */ }
          channelRef.current = null;
          await new Promise(r => setTimeout(r, 2000));
          if (!mounted) return;

          const channel2 = supabaseBrowser.channel(`call:${roomName}`, {
            config: { broadcast: { self: false } },
          });
          channelRef.current = channel2;

          const retry = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => resolve(false), 10000);
            channel2.subscribe((s: string) => {
              if (s === 'SUBSCRIBED') { clearTimeout(timeout); resolve(true); }
              if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { clearTimeout(timeout); resolve(false); }
            });
          });

          if (!retry) {
            try { supabaseBrowser.removeChannel(channel2); } catch { /* */ }
            if (mounted) setError('Cannot connect to signaling server. Please try again in a few seconds.');
            return;
          }
        }

        if (!mounted) return;

        // ── 2. Get local media ──
        let stream: MediaStream;
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          });
          if (!mounted) { audioStream.getTracks().forEach(t => t.stop()); return; }

          if (audioOnly) {
            stream = audioStream;
          } else {
            try {
              const videoConstraints = isMobile()
                ? { width: { ideal: 480 }, height: { ideal: 640 }, facingMode: 'user', frameRate: { ideal: 24 } }
                : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };
              const videoStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
              if (!mounted) { audioStream.getTracks().forEach(t => t.stop()); videoStream.getTracks().forEach(t => t.stop()); return; }
              stream = new MediaStream([...audioStream.getAudioTracks(), ...videoStream.getVideoTracks()]);
            } catch {
              console.warn('[Call] Camera failed, falling back to audio-only');
              stream = audioStream;
            }
          }

          localStreamRef.current = stream;
          if (localVideoRef.current && stream.getVideoTracks().length > 0) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (mediaErr) {
          console.error('[Call] getUserMedia failed:', mediaErr);
          if (mounted) setError('Microphone access denied. Please allow microphone in your browser settings and reload.');
          return;
        }

        if (mounted) setStatus('waiting');

        // ── 3. Create RTCPeerConnection ──
        let iceServers: RTCIceServer[];
        try {
          iceServers = await getIceServers();
        } catch {
          iceServers = FALLBACK_ICE;
        }
        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        localStreamRef.current!.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));

        pc.ontrack = (event) => {
          if (!mounted) return;
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
        };

        pc.oniceconnectionstatechange = () => {
          if (!mounted) return;
          const s = pc.iceConnectionState;
          if ((s === 'connected' || s === 'completed') && !connectedRef.current) {
            connectedRef.current = true;
            setStatus('connected');
            playNotificationSound('call');
            if (announceRef.current) { clearInterval(announceRef.current); announceRef.current = null; }
            if (!timerRef.current) {
              timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
            }
          }
          if (s === 'failed') {
            pc.restartIce();
            setTimeout(() => {
              if (mounted && pc.iceConnectionState === 'failed') { cleanup(); onLeave?.(); }
            }, 6000);
          }
          if (s === 'disconnected') {
            setTimeout(() => {
              if (mounted && pc.iceConnectionState === 'disconnected') { cleanup(); onLeave?.(); }
            }, 5000);
          }
        };

        // ── 4. Attach signaling handlers ──
        const activeChannel = channelRef.current!;

        pc.onicecandidate = (event) => {
          if (event.candidate && channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'ice',
              payload: { candidate: event.candidate.toJSON(), from: myId },
            });
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeChannel.on('broadcast', { event: 'join' }, async (msg: any) => {
          const data = msg.payload as { from: string; name: string };
          if (data.from === myId || !mounted || connectedRef.current) return;
          setPartnerName(data.name || 'Study Buddy');
          setStatus('connecting');
          if (myId < data.from && !negotiatingRef.current) {
            negotiatingRef.current = true;
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channelRef.current?.send({
                type: 'broadcast',
                event: 'offer',
                payload: { sdp: pc.localDescription!.toJSON(), from: myId, name: displayName },
              });
            } catch (e) { console.error('Offer error:', e); negotiatingRef.current = false; }
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeChannel.on('broadcast', { event: 'offer' }, async (msg: any) => {
          const data = msg.payload as { sdp: RTCSessionDescriptionInit; from: string; name: string };
          if (data.from === myId || !mounted) return;
          if (!connectedRef.current) { setPartnerName(data.name || 'Study Buddy'); setStatus('connecting'); }
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channelRef.current?.send({
              type: 'broadcast',
              event: 'answer',
              payload: { sdp: pc.localDescription!.toJSON(), from: myId, name: displayName },
            });
          } catch (e) { console.error('Answer error:', e); }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeChannel.on('broadcast', { event: 'answer' }, async (msg: any) => {
          const data = msg.payload as { sdp: RTCSessionDescriptionInit; from: string; name: string };
          if (data.from === myId || !mounted) return;
          if (!connectedRef.current) setPartnerName(data.name || 'Study Buddy');
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            negotiatingRef.current = false;
          } catch (e) { console.error('Remote desc error:', e); }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeChannel.on('broadcast', { event: 'ice' }, async (msg: any) => {
          const data = msg.payload as { candidate: RTCIceCandidateInit; from: string };
          if (data.from === myId || !mounted) return;
          try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch { /* late ICE ok */ }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeChannel.on('broadcast', { event: 'leave' }, (msg: any) => {
          const data = msg.payload as { from: string };
          if (data.from === myId || !mounted) return;
          cleanup(); onLeave?.();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeChannel.on('broadcast', { event: 'screen-start' }, (msg: any) => {
          if (msg.payload.from === myId || !mounted) return;
          setPartnerScreenSharing(true);
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeChannel.on('broadcast', { event: 'screen-stop' }, (msg: any) => {
          if (msg.payload.from === myId || !mounted) return;
          setPartnerScreenSharing(false);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeChannel.on('broadcast', { event: 'chat' }, (msg: any) => {
          const data = msg.payload as ChatMsg;
          if (data.from === myId || !mounted) return;
          setChatMessages(prev => [...prev, data]);
          if (!showChatRef.current) setUnreadChat(prev => prev + 1);
        });

        // ── 5. Announce presence ──
        const announce = () => {
          channelRef.current?.send({
            type: 'broadcast', event: 'join',
            payload: { from: myId, name: displayName },
          });
        };
        announce();
        announceRef.current = setInterval(announce, 2000);

        const heartbeat = setInterval(() => {
          if (!mounted) { clearInterval(heartbeat); return; }
          channelRef.current?.send({ type: 'broadcast', event: 'ping', payload: { from: myId } }).catch(() => {});
        }, 3000);
        window.addEventListener('pagehide', () => clearInterval(heartbeat), { once: true });

      } catch (initErr) {
        console.error('[Call] init() crashed:', initErr);
        if (mounted) setError('Something went wrong setting up the call. Please reload and try again.');
      }
    };

    const handleBeforeUnload = () => {
      try { channelRef.current?.send({ type: 'broadcast', event: 'leave', payload: { from: myId } }); } catch { /* best effort */ }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    init();

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      if (channelRef.current) {
        try { channelRef.current.send({ type: 'broadcast', event: 'leave', payload: { from: myId } }); } catch { /* best effort */ }
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, displayName, audioOnly]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(prev => !prev);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(prev => !prev);
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current || status !== 'connected') return;
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoSender && cameraTrack) await videoSender.replaceTrack(cameraTrack);
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      channelRef.current?.send({ type: 'broadcast', event: 'screen-stop', payload: { from: myId } });
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.addEventListener('ended', async () => {
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
          if (sender && camTrack) await sender.replaceTrack(camTrack);
          screenStreamRef.current = null;
          setIsScreenSharing(false);
          channelRef.current?.send({ type: 'broadcast', event: 'screen-stop', payload: { from: myId } });
        });
        const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) await videoSender.replaceTrack(screenTrack);
        setIsScreenSharing(true);
        channelRef.current?.send({ type: 'broadcast', event: 'screen-start', payload: { from: myId } });
      } catch { /* user cancelled */ }
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !channelRef.current) return;
    const msg: ChatMsg = {
      id: `${myId}_${Date.now()}`,
      from: myId,
      name: displayName,
      text: chatInput.trim(),
      ts: Date.now(),
    };
    channelRef.current.send({ type: 'broadcast', event: 'chat', payload: msg });
    setChatMessages(prev => [...prev, msg]);
    setChatInput('');
  };

  const toggleChat = () => {
    setShowChat(prev => !prev);
    setUnreadChat(0);
  };

  const endCall = () => {
    const ch = channelRef.current;
    if (ch) {
      try { ch.send({ type: 'broadcast', event: 'leave', payload: { from: myId } }); } catch { /* */ }
      setTimeout(() => { try { ch.send({ type: 'broadcast', event: 'leave', payload: { from: myId } }); } catch { /* */ } }, 100);
      setTimeout(() => { try { ch.send({ type: 'broadcast', event: 'leave', payload: { from: myId } }); } catch { /* */ } }, 300);
    }
    setTimeout(() => { cleanup(); onLeave?.(); }, ch ? 500 : 0);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomName).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return {
    // State
    status, isMuted, isVideoOff, partnerName, duration, error, codeCopied,
    isScreenSharing, partnerScreenSharing,
    chatMessages, chatInput, setChatInput, showChat, unreadChat,
    myId,
    // Refs for video elements
    localVideoRef, remoteVideoRef, remoteAudioRef, chatEndRef,
    // Actions
    toggleMute, toggleVideo, toggleScreenShare,
    sendChatMessage, toggleChat, endCall, copyRoomCode,
    formatDuration,
  };
}
