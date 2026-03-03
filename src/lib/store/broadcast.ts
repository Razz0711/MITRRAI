// ============================================
// MitrAI - Notification Broadcast Helpers
// Stores in-app notifications + sends real Web Push
// ============================================

import { addNotification } from './notifications';
import { getAllStudents } from './students';
import { broadcastWebPush } from './push-subscriptions';
import { NotificationType } from '../constants';

/** Map notification type → deeplink URL */
function getUrlForType(type: NotificationType): string {
  if (type === 'anon_waiting') return '/anon';
  if (type === 'match_found') return '/matches';
  if (type === 'friend_request' || type === 'friend_accepted') return '/friends';
  if (type === 'room_join' || type === 'room_message') return '/rooms';
  if (type === 'doubt_posted') return '/doubts';
  if (type === 'material_uploaded') return '/materials';
  if (type === 'birthday_wish') return '/home';
  return '/home';
}

/** Broadcast a notification to all users — in-app + real Web Push */
export async function broadcastNotification({
  type,
  title,
  message,
  excludeUserId,
}: {
  type: NotificationType;
  title: string;
  message: string;
  excludeUserId?: string;
}) {
  // 1) Store in-app notifications for every user
  const users = await getAllStudents();
  const notifPromises = users
    .filter(u => !(excludeUserId && u.id === excludeUserId))
    .map(u =>
      addNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: u.id,
        type,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
      }),
    );
  await Promise.allSettled(notifPromises);

  // 2) Send REAL Web Push (reaches phones even if browser is closed)
  const url = getUrlForType(type);
  broadcastWebPush({ title, body: message, url }, excludeUserId).catch((err) =>
    console.error('broadcastWebPush error:', err),
  );
}
