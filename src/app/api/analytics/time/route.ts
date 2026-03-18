import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';

// POST /api/analytics/time
// Receives an object of time deltas in seconds (e.g. { arya: 30, feed: 15, general: 15 })
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { deltas } = body;

    if (!deltas || typeof deltas !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // Prepare parameters, falling back to 0 for missing metrics
    const p_arya = Number(deltas.arya) || 0;
    const p_anon = Number(deltas.anon) || 0;
    const p_feed = Number(deltas.feed) || 0;
    const p_community = Number(deltas.community) || 0;
    const p_general = Number(deltas.general) || 0;

    const totalSecondsToLog = p_arya + p_anon + p_feed + p_community + p_general;

    if (totalSecondsToLog === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to log.' });
    }

    // Prevent absurd values from buggy clients (e.g., sending > 1 hour in a single heartbeat)
    if (totalSecondsToLog > 3600) {
      console.warn(`[Time Track] Dropped suspicious log from user ${user.id}: ${totalSecondsToLog}s`);
      return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 400 });
    }

    // Call securely atomic Postgres RPC to increment the daily row
    const { error } = await supabase.rpc('increment_user_time', {
      p_user_id: user.id,
      p_arya_seconds: p_arya,
      p_anon_seconds: p_anon,
      p_feed_seconds: p_feed,
      p_community_seconds: p_community,
      p_general_seconds: p_general
    });

    if (error) {
      console.error('[Time Track] Error incrementing time:', error);
      
      // Fallback if RPC doesn't exist yet (e.g., migration hasn't run)
      if (error.code === '42883') { // "function does not exist"
        return NextResponse.json({ success: false, error: 'RPC missing, please run migration.' }, { status: 501 });
      }

      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Time Track] Server error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
