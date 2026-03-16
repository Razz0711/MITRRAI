// ============================================
// MitrAI - Arya Conversations API
// GET: get or create conversation for user
// ============================================

import { NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { supabase } from '@/lib/store/core';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // Find existing conversation
  const { data: existing } = await supabase
    .from('arya_conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, data: existing[0] });
  }

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('arya_conversations')
    .insert({ user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create conversation' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: newConv });
}
