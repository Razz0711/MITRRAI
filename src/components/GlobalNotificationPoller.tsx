// ============================================
// MitrAI - Global Notification Manager
// Runs on every authenticated page inside AppShell.
//
// TWO notification channels:
// 1. REAL Web Push (server → push service → phone)
//    Works even when browser is FULLY CLOSED.
//    Handled by usePushNotifications hook + service worker.
//
// 2. Polling fallback (for in-app badge updates)
//    Polls every 60s to update unread count when tab is open.
// ============================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Notification as NotifType } from '@/lib/types';

const POLL_INTERVAL = 30_000; // 30 seconds

export default function GlobalNotificationPoller() {
  const { user } = useAuth();
  const { permission, requestPermission, showNotification } = usePushNotifications();
  const knownIds = useRef<Set<string>>(new Set());
  const initialised = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request permission after a short delay on first render
  useEffect(() => {
    if (!user || permission !== 'default') return;
    const t = setTimeout(() => requestPermission(), 3000);
    return () => clearTimeout(t);
  }, [user, permission, requestPermission]);

  const poll = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      const data = await res.json();
      if (!data.success) return;

      const notifs: NotifType[] = data.data || [];

      // On first poll just seed the known IDs (don't spam on page load)
      if (!initialised.current) {
        knownIds.current = new Set(notifs.map(n => n.id));
        initialised.current = true;
        return;
      }

      // Find genuinely new unread notifications
      const fresh = notifs.filter(n => !n.read && !knownIds.current.has(n.id));

      if (fresh.length > 0 && permission === 'granted') {
        // Show native push for the most recent one
        const latest = fresh[0];
        // Strip embedded metadata tags from display text
        const cleanMessage = latest.message.replace(/\s*\{\{room:[^}]+\}\}/g, '');
        showNotification(latest.title, cleanMessage, {
          tag: `notif-${latest.id}`,
          url: getUrlForNotif(latest),
        });
      }

      // Update known IDs
      for (const n of notifs) knownIds.current.add(n.id);
    } catch {
      // network error — silently ignore
    }
  }, [user, permission, showNotification]);

  // Initial poll + interval
  useEffect(() => {
    if (!user) return;
    // Small delay so the page hydrates first
    const firstPoll = setTimeout(poll, 2000);
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      clearTimeout(firstPoll);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, poll]);

  // No UI — this is a background process
  return null;
}

/** Map notification type → deeplink URL */
function getUrlForNotif(n: NotifType): string {
  const t = n.type;
  if (t === 'anon_waiting') return '/anon';
  if (t === 'match_found') return '/matches';
  if (t === 'friend_request' || t === 'friend_accepted') return '/friends';
  if (t === 'room_join' || t === 'room_message') return '/rooms';
  if (t === 'doubt_posted') return '/doubts';
  if (t === 'material_uploaded') return '/materials';
  if (t === 'birthday_wish') return '/home';
  if (t === 'radar_connect') {
    // Extract embedded roomId for direct deeplink to anon chat room
    const roomMatch = n.message?.match(/\{\{room:([^}]+)\}\}/);
    if (roomMatch) return `/anon/${roomMatch[1]}`;
    if (n.message?.includes('anonymous')) return '/anon';
    return '/chat';
  }
  if (t === 'session_request' || t === 'session_accepted' || t === 'session_declined') return '/session';
  return '/home';
}
