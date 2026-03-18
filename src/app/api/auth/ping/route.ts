import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';

// POST /api/auth/ping
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Update last_active_at timestamp in the students table
    const { error } = await supabase
      .from('students')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('[Auth Ping] Error updating last_active_at:', error);
      return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auth Ping] Server error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
