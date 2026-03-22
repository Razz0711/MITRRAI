// ============================================
// MitrRAI - Study Rooms API
// GET: list active rooms
// POST: create a room
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveRooms,
  createRoom,
  getUserRooms,
  awardXP,
  awardBadge,
} from '@/lib/store';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/rooms?userId=xxx&filter=mine|all
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = req.nextUrl.searchParams.get('userId') || authUser.id;
  const filter = req.nextUrl.searchParams.get('filter') || 'all';

  if (filter === 'mine') {
    const rooms = await getUserRooms(userId);
    return NextResponse.json({ success: true, data: { rooms } });
  }

  const rooms = await getActiveRooms();
  return NextResponse.json({ success: true, data: { rooms } });
}

// POST /api/rooms — create a room
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`rooms:${authUser.id}`, 10, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { name, topic, description, circleId, creatorId, creatorName, maxMembers, durationMinutes } = body;

    if (!name || !creatorId) {
      return NextResponse.json({ success: false, error: 'name and creatorId required' }, { status: 400 });
    }

    const room = await createRoom({
      name,
      topic: topic || '',
      description: description || '',
      circleId: circleId || '',
      creatorId,
      maxMembers: maxMembers || 5,
      durationMinutes: durationMinutes || 120,
    }, creatorName || 'Anonymous');

    if (!room) {
      return NextResponse.json({ success: false, error: 'Could not create room' }, { status: 500 });
    }

    // Award XP + badge for creating a room
    await awardXP(creatorId, 15, 'Created a study room');
    await awardBadge(creatorId, 'room_creator');

    return NextResponse.json({ success: true, data: { room } });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
