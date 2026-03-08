// ============================================
// MitrAI - FCM Token API
// POST: save FCM token (from native Android/iOS app)
// DELETE: remove FCM token
// GET: health check
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { saveFcmToken, removeFcmToken } from '@/lib/store/fcm-tokens';

export const dynamic = 'force-dynamic';

// GET /api/fcm — health check
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'fcm-tokens' });
}

// POST /api/fcm — save an FCM token from native app
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await request.json();
    const { token, platform } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'token is required' }, { status: 400 });
    }

    if (!platform || !['android', 'ios'].includes(platform)) {
      return NextResponse.json({ success: false, error: 'platform must be android or ios' }, { status: 400 });
    }

    await saveFcmToken(authUser.id, token, platform);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('FCM token save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save FCM token' }, { status: 500 });
  }
}

// DELETE /api/fcm — remove an FCM token
export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'token required' }, { status: 400 });
    }

    await removeFcmToken(authUser.id, token);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('FCM token remove error:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove FCM token' }, { status: 500 });
  }
}
