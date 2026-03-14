// ============================================
// MitrAI - Anonymous Chat API
// POST: join/leave queue, poll for match
// GET: check status (active room, queue, pass)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import {
  hasActivePass,
  getActivePass,
  isUserBanned,
  joinQueue,
  leaveQueue,
  pollForMatch,
  getUserActiveRoom,
  isProSubscriber,
  hasUsedFreeTrial,
  grantFreeTrial,
  getAnonLiveStats,
  isAnonOpenAccessActive,
  ANON_OPEN_ACCESS_ENDS_AT,
} from '@/lib/store/anon';
import { broadcastNotification } from '@/lib/store/broadcast';
import { NOTIFICATION_TYPES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// GET /api/anon?check=status
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const check = req.nextUrl.searchParams.get('check');
  const userId = authUser.id;

  try {
    if (check === 'status') {
      const [initialPass, ban, activeRoom, isPro] = await Promise.all([
        getActivePass(userId),
        isUserBanned(userId),
        getUserActiveRoom(userId),
        isProSubscriber(userId),
      ]);

      const isOpenAccess = isAnonOpenAccessActive();

      // Auto-grant free 7-day trial if user has no pass and never had one
      let pass = initialPass;
      let trialGranted = false;
      if (!pass && !ban.banned && !isOpenAccess) {
        const trialPass = await grantFreeTrial(userId);
        if (trialPass) {
          pass = trialPass;
          trialGranted = true;
        }
      }

      const usedTrial = await hasUsedFreeTrial(userId);

      return NextResponse.json({
        success: true,
        data: {
          hasPass: !!pass,
          pass,
          isPro,
          banned: ban.banned,
          banReason: ban.reason,
          banExpiresAt: ban.expiresAt,
          activeRoomId: activeRoom,
          trialGranted,
          isFreeTrial: pass?.source === 'free_trial',
          usedTrial,
          isOpenAccess,
          openAccessEndsAt: ANON_OPEN_ACCESS_ENDS_AT,
        },
      });
    }

    if (check === 'poll') {
      if (!rateLimit(`anon-poll:${userId}`, 30, 60_000)) return rateLimitExceeded();
      const result = await pollForMatch(userId);
      return NextResponse.json({ success: true, data: result });
    }

    if (check === 'stats') {
      if (!rateLimit(`anon-stats:${userId}`, 20, 60_000)) return rateLimitExceeded();
      const stats = await getAnonLiveStats();
      return NextResponse.json({ success: true, data: stats });
    }

    return NextResponse.json({ success: false, error: 'Invalid check parameter' }, { status: 400 });
  } catch (error) {
    console.error('Anon GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// POST /api/anon { action: 'join' | 'leave', roomType }
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = authUser.id;
  if (!rateLimit(`anon-action:${userId}`, 20, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { action, roomType } = body;

    if (action === 'join') {
      if (!roomType) return NextResponse.json({ success: false, error: 'roomType required' }, { status: 400 });

      // Check pass
      const pass = await hasActivePass(userId);
      if (!pass) return NextResponse.json({ success: false, error: 'NO_PASS' }, { status: 403 });

      // Check ban
      const ban = await isUserBanned(userId);
      if (ban.banned) return NextResponse.json({ success: false, error: 'BANNED', reason: ban.reason, expiresAt: ban.expiresAt }, { status: 403 });

      const result = await joinQueue(userId, roomType);

      // Broadcast push notification to all other users
      if (result.success) {
        // Fire-and-forget — don't block the response
        broadcastNotification({
          type: NOTIFICATION_TYPES.ANON_WAITING,
          title: '🎭 Someone is waiting in Anon Chat!',
          message: `A fellow SVNITian is waiting in ${roomType} room. Go online and chat now!`,
          excludeUserId: userId,
        }).catch((err) => console.error('Broadcast error:', err));
      }

      return NextResponse.json({ success: result.success, data: { alias: result.alias }, error: result.error });
    }

    if (action === 'leave') {
      await leaveQueue(userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Anon POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
