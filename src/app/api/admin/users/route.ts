import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAccess, isAdminAuthenticated } from '@/lib/admin-auth';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

// GET /api/admin/users?adminKey=xxx
export async function GET(req: NextRequest) {
  const adminCookie = isAdminAuthenticated();
  if (!adminCookie) {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
  }

  const adminKey = req.nextUrl.searchParams.get('adminKey');
  if (!verifyAdminAccess(adminKey)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch all students
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) throw error;

    // 2. Fetch all Arya messages with voice flag to count
    const { data: aryaMessages } = await supabase
      .from('arya_messages')
      .select('user_id, is_voice_message')
      .eq('role', 'user');

    // 3. Fetch all Anon messages (just sender_id)
    const { data: anonMessages } = await supabase
      .from('anon_messages')
      .select('sender_id');

    // 4. Fetch Anon reports to see who's getting reported
    const { data: anonReports } = await supabase
      .from('anon_reports')
      .select('reported_user_id');

    // Calculate aggregations
    const aryaCounts: Record<string, { total: number, voice: number }> = {};
    if (aryaMessages) {
      for (const msg of aryaMessages) {
        if (!aryaCounts[msg.user_id]) aryaCounts[msg.user_id] = { total: 0, voice: 0 };
        aryaCounts[msg.user_id].total++;
        if (msg.is_voice_message) aryaCounts[msg.user_id].voice++;
      }
    }

    const anonCounts: Record<string, number> = {};
    if (anonMessages) {
      for (const msg of anonMessages) {
        anonCounts[msg.sender_id] = (anonCounts[msg.sender_id] || 0) + 1;
      }
    }

    const reportCounts: Record<string, number> = {};
    if (anonReports) {
      for (const rep of anonReports) {
        reportCounts[rep.reported_user_id] = (reportCounts[rep.reported_user_id] || 0) + 1;
      }
    }

    // Merge into user data
    const enrichedData = (students || []).map(student => ({
      ...student,
      aryaMessageCount: aryaCounts[student.id]?.total || 0,
      aryaVoiceCount: aryaCounts[student.id]?.voice || 0,
      anonMessageCount: anonCounts[student.id] || 0,
      reportCount: reportCounts[student.id] || 0,
    }));

    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error) {
    console.error('[Admin Users] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load users' }, { status: 500 });
  }
}
