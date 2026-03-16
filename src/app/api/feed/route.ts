// ============================================
// MitrAI - Campus Feed API
// GET: fetch posts with filters
// POST: create a new post
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { getFeedPosts, createPost } from '@/lib/store/feed';

export const dynamic = 'force-dynamic';

// GET /api/feed?category=&location=&limit=20&offset=0
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const sp = req.nextUrl.searchParams;

  try {
    const result = await getFeedPosts({
      category: sp.get('category') || undefined,
      location: sp.get('location') || undefined,
      limit: parseInt(sp.get('limit') || '20'),
      offset: parseInt(sp.get('offset') || '0'),
      userId: authUser.id,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Feed GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// POST /api/feed { content, category, subcategory?, location?, lat?, lng?, isAnonymous? }
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  if (!rateLimit(`feed-post:${authUser.id}`, 10, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { content, category, subcategory, location, lat, lng, isAnonymous } = body;

    if (!content || !category) {
      return NextResponse.json({ success: false, error: 'Content and category required' }, { status: 400 });
    }

    const result = await createPost({
      userId: authUser.id,
      content,
      category,
      subcategory,
      location,
      lat,
      lng,
      isAnonymous,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Feed POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
