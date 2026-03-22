// ============================================
// MitrRAI - Campus Feed Post API
// DELETE: delete own post
// GET:    imin_users (post author only) | comments
// POST:   toggle reaction | add comment
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { deletePost, toggleReaction } from '@/lib/store/feed';
import { supabase } from '@/lib/store/core';

export const dynamic = 'force-dynamic';

// GET /api/feed/[id]?action=imin_users   → who clicked "I'm in" (post author only)
// GET /api/feed/[id]?action=comments     → comments on the post
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const action = req.nextUrl.searchParams.get('action');

  if (action === 'imin_users') {
    // Verify requester is the post author
    const { data: post } = await supabase
      .from('campus_posts')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (!post || post.user_id !== authUser.id) {
      return NextResponse.json({ success: false, error: 'Only the post author can see this' }, { status: 403 });
    }

    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('user_id')
      .eq('post_id', params.id)
      .eq('type', 'imin');

    const userIds = (reactions || []).map((r: { user_id: string }) => r.user_id);
    if (userIds.length === 0) return NextResponse.json({ success: true, data: [] });

    const { data: students } = await supabase
      .from('students')
      .select('id, name, department, year_level')
      .in('id', userIds);

    return NextResponse.json({ success: true, data: students || [] });
  }

  if (action === 'comments') {
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('id, user_id, user_name, content, created_at')
      .eq('post_id', params.id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
    return NextResponse.json({ success: true, data: comments || [] });
  }

  return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/feed/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const result = await deletePost(params.id, authUser.id);
    if (!result.success) return NextResponse.json(result, { status: 403 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feed DELETE error:', error);
    return NextResponse.json({ success: false, error: 'kuch gadbad ho gayi, dobara try karo 🙏' }, { status: 500 });
  }
}

// POST /api/feed/[id] { action: 'react', type: 'imin'|'reply'|'connect' }
//                    | { action: 'comment', content: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  if (!rateLimit(`feed-react:${authUser.id}`, 60, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { action, type, content } = body;

    if (action === 'react') {
      if (!type) return NextResponse.json({ success: false, error: 'Reaction type required' }, { status: 400 });
      const result = await toggleReaction(params.id, authUser.id, type);
      return NextResponse.json(result);
    }

    if (action === 'comment') {
      if (!content?.trim()) return NextResponse.json({ success: false, error: 'Comment content required' }, { status: 400 });
      if (content.length > 200) return NextResponse.json({ success: false, error: 'Max 200 characters' }, { status: 400 });

      // Fetch user name
      const { data: student } = await supabase.from('students').select('name').eq('id', authUser.id).single();
      const userName = student?.name || 'Student';

      const { data: comment, error } = await supabase
        .from('post_comments')
        .insert({ post_id: params.id, user_id: authUser.id, user_name: userName, content: content.trim() })
        .select('id, user_id, user_name, content, created_at')
        .single();

      if (error) return NextResponse.json({ success: false, error: 'Failed to save comment' }, { status: 500 });
      return NextResponse.json({ success: true, data: comment });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Feed POST error:', error);
    return NextResponse.json({ success: false, error: 'kuch gadbad ho gayi, dobara try karo 🙏' }, { status: 500 });
  }
}
