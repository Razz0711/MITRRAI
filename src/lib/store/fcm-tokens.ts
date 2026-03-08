// ============================================
// MitrAI - FCM Token Store
// CRUD for native push (FCM) tokens + send via Firebase Admin SDK (V1 API)
// ============================================

import { supabase } from './core';
import admin from 'firebase-admin';

// ---- Firebase Admin SDK initialization (lazy, singleton) ----
let _firebaseInitialized = false;

function ensureFirebaseInitialized(): boolean {
  if (_firebaseInitialized) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin not configured — missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
    return false;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
    _firebaseInitialized = true;
    return true;
  } catch (err) {
    console.error('Firebase Admin init error:', err);
    return false;
  }
}

export interface FcmTokenRecord {
  id: string;
  userId: string;
  token: string;
  platform: 'android' | 'ios';
  createdAt: string;
  updatedAt: string;
}

/** Save or update an FCM token for a user */
export async function saveFcmToken(
  userId: string,
  token: string,
  platform: 'android' | 'ios',
): Promise<void> {
  const id = `fcm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.from('fcm_tokens').upsert(
    {
      id,
      user_id: userId,
      token,
      platform,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  );
  if (error) console.error('saveFcmToken error:', error);
  else console.log(`FCM token saved for user ${userId} (${platform})`);
}

/** Remove an FCM token */
export async function removeFcmToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('fcm_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);
  if (error) console.error('removeFcmToken error:', error);
}

/** Get all FCM tokens for a user */
export async function getUserFcmTokens(userId: string): Promise<FcmTokenRecord[]> {
  const { data, error } = await supabase
    .from('fcm_tokens')
    .select('*')
    .eq('user_id', userId);
  if (error) { console.error('getUserFcmTokens error:', error); return []; }
  return (data || []) as unknown as FcmTokenRecord[];
}

/** Get all FCM tokens (for broadcast) */
export async function getAllFcmTokens(): Promise<FcmTokenRecord[]> {
  const { data, error } = await supabase
    .from('fcm_tokens')
    .select('*');
  if (error) { console.error('getAllFcmTokens error:', error); return []; }
  return (data || []) as unknown as FcmTokenRecord[];
}

/**
 * Send FCM push notification to a specific token
 * Uses Firebase Admin SDK (V1 API) — the modern, recommended approach
 */
export async function sendFcmPush(
  token: string,
  payload: { title: string; body: string; url?: string },
): Promise<boolean> {
  if (!ensureFirebaseInitialized()) {
    console.warn('sendFcmPush: Firebase not initialized, skipping');
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url || '/home',
        title: payload.title,
        body: payload.body,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'mitrai_notifications',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('FCM push sent:', response, 'to:', token.slice(0, 20) + '...');
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    console.error('sendFcmPush failed:', code, (err as Error)?.message);

    // Token is invalid/expired — clean up
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      console.log('FCM token expired, removing:', token.slice(0, 20) + '...');
      await supabase.from('fcm_tokens').delete().eq('token', token);
    }

    return false;
  }
}

/** Send FCM push to ALL tokens of a user */
export async function sendFcmToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  const tokens = await getUserFcmTokens(userId);
  console.log(`sendFcmToUser: ${tokens.length} token(s) for user ${userId}`);
  await Promise.allSettled(tokens.map(t => sendFcmPush(t.token, payload)));
}

/** Send FCM push to multiple users */
export async function sendFcmToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!userIds.length) return;
  const { data, error } = await supabase
    .from('fcm_tokens')
    .select('*')
    .in('user_id', userIds);
  if (error) { console.error('sendFcmToUsers error:', error); return; }
  const tokens = (data || []) as unknown as FcmTokenRecord[];
  console.log(`sendFcmToUsers: ${tokens.length} token(s) for ${userIds.length} user(s)`);

  for (let i = 0; i < tokens.length; i += 50) {
    const batch = tokens.slice(i, i + 50);
    await Promise.allSettled(batch.map(t => sendFcmPush(t.token, payload)));
  }
}
