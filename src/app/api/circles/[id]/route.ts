// ============================================
// MitrRAI - Circle Detail API
// GET: circle info + members (with profiles) + rooms
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getCircleById,
  getCircleMembers,
} from '@/lib/store/circles';
import { getActiveRooms } from '@/lib/store/rooms';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const circle = await getCircleById(params.id);
  if (!circle) {
    return NextResponse.json(
      { success: false, error: 'Circle not found' },
      { status: 404 }
    );
  }

  // Fetch members + circle rooms in parallel
  const [memberships, rooms] = await Promise.all([
    getCircleMembers(params.id),
    getActiveRooms(params.id),
  ]);

  // memberships already includes name + department from getCircleMembers join
  const members = memberships.map((m) => ({
    userId: m.userId,
    name: m.userName,
    department: m.department || '',
  }));

  return NextResponse.json({
    success: true,
    data: {
      circle,
      members,
      rooms,
    },
  });
}
