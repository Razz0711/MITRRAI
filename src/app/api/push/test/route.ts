// ============================================
// MitrAI - Push Notification Test & Debug
// GET  → debug info (subscription count, VAPID status)
// POST → send a test push notification to yourself
// ============================================

import { NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import {
  getUserPushSubscriptions,
  getAllPushSubscriptions,
  sendPushToUser,
} from '@/lib/store/push-subscriptions';

export const dynamic = 'force-dynamic';

// GET /api/push/test — debug information
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const userSubs = await getUserPushSubscriptions(authUser.id);
    const allSubs = await getAllPushSubscriptions();

    const vapidPub = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();
    const vapidPriv = (process.env.VAPID_PRIVATE_KEY || '').trim();

    return NextResponse.json({
      success: true,
      data: {
        userId: authUser.id,
        email: authUser.email,
        yourSubscriptions: userSubs.length,
        yourEndpoints: userSubs.map(s => s.endpoint.slice(0, 80) + '...'),
        totalSubscriptionsInDB: allSubs.length,
        vapidPublicKeySet: !!vapidPub,
        vapidPublicKeyLength: vapidPub.length,
        vapidPrivateKeySet: !!vapidPriv,
        vapidSubject: process.env.VAPID_SUBJECT || 'mailto:mitrai@svnit.ac.in',
      },
    });
  } catch (error) {
    console.error('Push debug error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST /api/push/test — send a test push to yourself
export async function POST() {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const userSubs = await getUserPushSubscriptions(authUser.id);

    if (userSubs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'NO_SUBSCRIPTIONS',
        message: 'You have 0 push subscriptions. Make sure you allowed notifications and the service worker registered.',
      });
    }

    await sendPushToUser(authUser.id, {
      title: '🔔 MitrAI Test Notification',
      body: 'Push notifications are working! You will receive alerts even when the browser is closed.',
      url: '/home',
    });

    return NextResponse.json({
      success: true,
      message: `Test push sent to ${userSubs.length} device(s).`,
      subscriptionCount: userSubs.length,
    });
  } catch (error) {
    console.error('Push test error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
