// ============================================
// MitrAI - Campus Feed Post API
// DELETE: delete own post
// POST: toggle reaction (imin/reply/connect)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { deletePost, toggleReaction } from '@/lib/store/feed';

export const dynamic = 'force-dynamic';

// DELETE /api/feed/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const result = await deletePost(params.id, authUser.id);
    if (!result.success) {
      return NextResponse.json(result, { status: 403 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feed DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// POST /api/feed/[id] { action: 'react', type: 'imin'|'reply'|'connect' }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  if (!rateLimit(`feed-react:${authUser.id}`, 60, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { action, type } = body;

    if (action === 'react') {
      if (!type) {
        return NextResponse.json({ success: false, error: 'Reaction type required' }, { status: 400 });
      }
      const result = await toggleReaction(params.id, authUser.id, type);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Feed POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
