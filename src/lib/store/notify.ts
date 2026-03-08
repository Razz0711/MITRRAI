// ============================================
// MitrAI - Unified Notification Sender
// Sends notifications via BOTH web push + native FCM
// Drop-in replacement for sendPushToUser / sendPushToUsers
// ============================================

import { sendPushToUser, sendPushToUsers, broadcastWebPush } from './push-subscriptions';
import { sendFcmToUser, sendFcmToUsers, getAllFcmTokens, sendFcmPush } from './fcm-tokens';

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send notification to a single user via ALL channels (web push + FCM)
 * Use this instead of sendPushToUser() for full coverage
 */
export async function notifyUser(
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  console.log(`[Notify] Sending to user ${userId}: "${payload.title}"`);
  await Promise.allSettled([
    sendPushToUser(userId, payload),
    sendFcmToUser(userId, payload),
  ]);
}

/**
 * Send notification to multiple users via ALL channels
 * Use this instead of sendPushToUsers() for full coverage
 */
export async function notifyUsers(
  userIds: string[],
  payload: NotificationPayload,
): Promise<void> {
  if (!userIds.length) return;
  console.log(`[Notify] Sending to ${userIds.length} user(s): "${payload.title}"`);
  await Promise.allSettled([
    sendPushToUsers(userIds, payload),
    sendFcmToUsers(userIds, payload),
  ]);
}

/**
 * Broadcast notification to ALL users via ALL channels
 * Use this instead of broadcastWebPush() for full coverage
 */
export async function notifyAll(
  payload: NotificationPayload,
  excludeUserId?: string,
): Promise<void> {
  console.log(`[Notify] Broadcasting: "${payload.title}" (exclude: ${excludeUserId || 'none'})`);
  
  // Web push broadcast
  const webPushPromise = broadcastWebPush(payload, excludeUserId);
  
  // FCM broadcast
  const fcmBroadcastPromise = (async () => {
    const allTokens = await getAllFcmTokens();
    const targets = excludeUserId
      ? allTokens.filter(t => {
          const uid = (t as unknown as Record<string, string>).user_id || t.userId;
          return uid !== excludeUserId;
        })
      : allTokens;
    
    for (let i = 0; i < targets.length; i += 50) {
      const batch = targets.slice(i, i + 50);
      await Promise.allSettled(batch.map(t => sendFcmPush(t.token, payload)));
    }
  })();

  await Promise.allSettled([webPushPromise, fcmBroadcastPromise]);
}
