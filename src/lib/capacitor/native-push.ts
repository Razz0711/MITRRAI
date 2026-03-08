/**
 * Native Push Notifications via Firebase Cloud Messaging (FCM)
 * 
 * This module handles push notifications on native platforms (Android/iOS)
 * using Capacitor's PushNotifications plugin.
 * 
 * On web, the existing web-push system continues to work.
 * On native, FCM handles push delivery (free & unlimited).
 */

import { isNativePlatform } from './platform';

// Types
interface NativePushToken {
  value: string; // FCM token
}

interface NativePushNotification {
  title?: string;
  body?: string;
  data?: Record<string, any>;
  id: string;
}

interface NativePushActionPerformed {
  actionId: string;
  notification: NativePushNotification;
}

type TokenHandler = (token: NativePushToken) => void;
type NotificationHandler = (notification: NativePushNotification) => void;
type ActionHandler = (action: NativePushActionPerformed) => void;

let pushPlugin: any = null;

/**
 * Dynamically import the Capacitor PushNotifications plugin
 * Only loads on native platforms to avoid errors on web
 */
async function getPushPlugin() {
  if (pushPlugin) return pushPlugin;
  if (!isNativePlatform()) return null;
  
  try {
    const mod = await import('@capacitor/push-notifications');
    pushPlugin = mod.PushNotifications;
    return pushPlugin;
  } catch {
    console.warn('[NativePush] PushNotifications plugin not available');
    return null;
  }
}

/**
 * Request permission and register for native push notifications
 * Returns the FCM token if successful, null otherwise
 */
export async function registerNativePush(): Promise<string | null> {
  const PushNotifications = await getPushPlugin();
  if (!PushNotifications) return null;

  try {
    // Check current permission status
    const permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      const result = await PushNotifications.requestPermissions();
      if (result.receive !== 'granted') {
        console.log('[NativePush] Permission denied');
        return null;
      }
    } else if (permStatus.receive !== 'granted') {
      console.log('[NativePush] Permission not granted:', permStatus.receive);
      return null;
    }

    // Register with FCM/APNs
    await PushNotifications.register();
    
    // Wait for the token
    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10000);

      PushNotifications.addListener('registration', (token: NativePushToken) => {
        clearTimeout(timeout);
        console.log('[NativePush] FCM Token:', token.value);
        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', (err: any) => {
        clearTimeout(timeout);
        console.error('[NativePush] Registration error:', err);
        resolve(null);
      });
    });
  } catch (err) {
    console.error('[NativePush] Error registering:', err);
    return null;
  }
}

/**
 * Listen for incoming push notifications (when app is in foreground)
 */
export async function onNativePushReceived(handler: NotificationHandler): Promise<void> {
  const PushNotifications = await getPushPlugin();
  if (!PushNotifications) return;

  PushNotifications.addListener('pushNotificationReceived', handler);
}

/**
 * Listen for push notification tap/action (when user taps a notification)
 */
export async function onNativePushAction(handler: ActionHandler): Promise<void> {
  const PushNotifications = await getPushPlugin();
  if (!PushNotifications) return;

  PushNotifications.addListener('pushNotificationActionPerformed', handler);
}

/**
 * Remove all notification listeners
 */
export async function removeAllNativePushListeners(): Promise<void> {
  const PushNotifications = await getPushPlugin();
  if (!PushNotifications) return;

  await PushNotifications.removeAllListeners();
}

/**
 * Get list of delivered notifications (still visible in notification tray)
 */
export async function getDeliveredNotifications(): Promise<NativePushNotification[]> {
  const PushNotifications = await getPushPlugin();
  if (!PushNotifications) return [];

  const result = await PushNotifications.getDeliveredNotifications();
  return result.notifications || [];
}
