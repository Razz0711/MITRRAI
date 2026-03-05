// ============================================
// MitrAI - Radar API
// Campus discovery: broadcast, list active pings, go offline
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/radar?userId=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = req.nextUrl.searchParams.get('userId') || authUser.id;

  try {
    // Get all active (non-expired) pings
    const now = new Date().toISOString();
    const { data: pings, error } = await supabase
      .from('radar_pings')
      .select('*')
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('radar GET error:', error);
      return NextResponse.json({ success: true, data: { pings: [], myPing: null } });
    }

    const formatted = (pings || []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      userId: p.user_id as string,
      userName: p.user_name as string,
      activityId: p.activity_id as string,
      zone: p.zone as string,
      note: (p.note || '') as string,
      isAnonymous: (p.is_anonymous || false) as boolean,
      createdAt: p.created_at as string,
      expiresAt: p.expires_at as string,
    }));

    const myPing = formatted.find(p => p.userId === userId) || null;

    return NextResponse.json({
      success: true,
      data: { pings: formatted, myPing },
    });
  } catch (err) {
    console.error('radar GET catch:', err);
    return NextResponse.json({ success: true, data: { pings: [], myPing: null } });
  }
}

// POST /api/radar — broadcast a ping
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`radar:${authUser.id}`, 5, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { userName, activityId, zone, note, isAnonymous } = body;

    // Always use the authenticated user's ID (prevents FK mismatches)
    const userId = authUser.id;

    if (!activityId) {
      return NextResponse.json({ success: false, error: 'activityId is required' }, { status: 400 });
    }

    // Remove any existing ping from this user
    const { error: delErr } = await supabase.from('radar_pings').delete().eq('user_id', userId);
    if (delErr) console.warn('radar DELETE existing:', delErr.message);

    // Create new ping (expires in 2 hours)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error } = await supabase.from('radar_pings').insert({
      user_id: userId,
      user_name: userName || 'Student',
      activity_id: activityId,
      zone: zone || 'Hostel',
      note: (note || '').slice(0, 100),
      is_anonymous: isAnonymous || false,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    }).select('id').single();

    if (error) {
      console.error('radar POST insert error:', error.message, error.details, error.hint);
      return NextResponse.json({ success: false, error: `Could not broadcast: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { id: inserted?.id } });
  } catch (err) {
    console.error('radar POST catch:', err);
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/radar — stop broadcasting
export async function DELETE(_req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    // Always use the authenticated user's ID
    await supabase.from('radar_pings').delete().eq('user_id', authUser.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('radar DELETE catch:', err);
    return NextResponse.json({ success: false, error: 'Failed to stop broadcast' }, { status: 500 });
  }
}
