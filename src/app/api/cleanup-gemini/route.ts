// ============================================
// MitrRAI - One-time cleanup: remove Gemini error messages from Arya chat history
// DELETE this file after running once
// ============================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/store/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Delete all messages that contain the old Gemini error text
    const { data, error } = await supabase
      .from('arya_messages')
      .delete()
      .or('content.ilike.%GEMINI_API_KEY%,content.ilike.%[DEBUG] API error%,content.ilike.%gemini%error%')
      .select('id');

    if (error) {
      console.error('Cleanup error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${data?.length || 0} old Gemini error messages`,
      deletedIds: data?.map(r => r.id) || [],
    });
  } catch (err) {
    console.error('Cleanup error:', err);
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}
