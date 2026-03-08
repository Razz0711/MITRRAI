// ============================================
// MitrAI - Unified Push Hook
// Automatically uses web push on browsers,
// native FCM on Android/iOS Capacitor apps
// ============================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePushNotifications } from './usePushNotifications';

type NativePushStatus = 'idle' | 'registering' | 'registered' | 'denied' | 'error';

/**
 * Unified push notification hook that works on both web and native.
 * 
 * On web: uses existing web push (service worker + VAPID)
 * On native (Capacitor): uses FCM/APNs via Capacitor PushNotifications plugin
 * 
 * Usage: Just replace `usePushNotifications()` with `useUnifiedPush()` —
 * it returns the same interface plus native status.
 */
export function useUnifiedPush(userId?: string) {
  // Web push (existing hook)
  const webPush = usePushNotifications();
  
  // Native push state
  const [nativeStatus, setNativeStatus] = useState<NativePushStatus>('idle');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const nativeRegistered = useRef(false);

  // Register native push on mount (only runs on Capacitor)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (nativeRegistered.current) return;
    
    // Check if running in Capacitor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as Record<string, any>).Capacitor;
    if (!cap?.isNativePlatform?.()) return; // Web browser — skip native push

    const platform = cap.getPlatform?.() as string | undefined;
    if (!platform || platform === 'web') return;

    nativeRegistered.current = true;
    setNativeStatus('registering');

    // Dynamic import to avoid loading native code on web
    (async () => {
      try {
        const { registerNativePush, onNativePushReceived, onNativePushAction } = await import('@/lib/capacitor/native-push');
        
        const token = await registerNativePush();
        
        if (!token) {
          setNativeStatus('denied');
          return;
        }

        setFcmToken(token);
        setNativeStatus('registered');

        // Send token to server
        if (userId) {
          await fetch('/api/fcm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, platform }),
          });
          console.log('[UnifiedPush] FCM token saved to server');
        }

        // Handle notifications received while app is in foreground
        onNativePushReceived((notification) => {
          console.log('[UnifiedPush] Foreground notification:', notification);
          // Could show an in-app toast/banner here
        });

        // Handle notification tap
        onNativePushAction((action) => {
          console.log('[UnifiedPush] Notification tapped:', action);
          const url = action.notification.data?.url;
          if (url && typeof window !== 'undefined') {
            window.location.href = url;
          }
        });
      } catch (err) {
        console.error('[UnifiedPush] Native push setup failed:', err);
        setNativeStatus('error');
      }
    })();
  }, [userId]);

  return {
    // Web push (pass-through)
    ...webPush,
    
    // Native push extras
    nativeStatus,
    fcmToken,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isNative: typeof window !== 'undefined' && !!(window as Record<string, any>).Capacitor?.isNativePlatform?.(),
  };
}
