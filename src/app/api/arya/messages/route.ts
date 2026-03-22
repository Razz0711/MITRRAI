// ============================================
// MitrRAI - Arya Messages API
// GET: fetch messages for a conversation
// POST: insert a new message
// PATCH: soft-delete messages (is_deleted_by_user)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { supabase } from '@/lib/store/core';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

// is_deleted_by_user only affects UI rendering.
// Arya context loader always reads full message history
// regardless of this flag to maintain conversation continuity
// and learn user communication patterns.

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const conversationId = req.nextUrl.searchParams.get('conversation_id');
  if (!conversationId) {
    return NextResponse.json({ success: false, error: 'conversation_id required' }, { status: 400 });
  }

  // Verify conversation belongs to user
  const { data: conv } = await supabase
    .from('arya_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (!conv) {
    return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
  }

  // Fetch messages — filter out soft-deleted for UI
  const { data: messages, error } = await supabase
    .from('arya_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('is_deleted_by_user', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Fetch messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: messages || [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // Rate limit: 60 message inserts per minute per user
  if (!rateLimit(`arya-messages:${user.id}`, 60, 60_000)) return rateLimitExceeded();

  const body = await req.json();
  const { conversation_id, role, content, is_voice, arya_reaction } = body;

  if (!conversation_id || !role || !content) {
    return NextResponse.json({ success: false, error: 'conversation_id, role, content required' }, { status: 400 });
  }

  if (!['user', 'assistant'].includes(role)) {
    return NextResponse.json({ success: false, error: 'role must be user or assistant' }, { status: 400 });
  }

  // Insert message
  const insertPayload: Record<string, unknown> = {
    conversation_id,
    user_id: user.id,
    role,
    content,
    is_voice_message: !!is_voice,
  };
  if (arya_reaction) insertPayload.arya_reaction = arya_reaction;

  const { data: msg, error } = await supabase
    .from('arya_messages')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Insert message error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save message' }, { status: 500 });
  }

  // Update conversation message count + updated_at
  await supabase
    .from('arya_conversations')
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation_id);

  // Increment message_count via raw update
  try {
    await supabase.rpc('increment_message_count', { conv_id: conversation_id });
  } catch {
    // If RPC doesn't exist, just update timestamp
  }

  return NextResponse.json({ success: true, data: msg });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const { action, conversation_id, message_id } = body;

  if (action === 'delete_message' && message_id) {
    // Soft-delete a single message
    const { error } = await supabase
      .from('arya_messages')
      .update({ is_deleted_by_user: true })
      .eq('id', message_id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete message' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === 'clear_chat' && conversation_id) {
    // Soft-delete ALL messages in conversation — UI clear only
    // Messages are retained in DB to understand user tone, preferences, and
    // communication style so Arya can personalize future responses.
    // This data is never shown to other users and is only used internally
    // for Arya's context window on next session load.
    const { error } = await supabase
      .from('arya_messages')
      .update({ is_deleted_by_user: true })
      .eq('conversation_id', conversation_id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to clear chat' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === 'rate_message' && message_id && typeof body.rating !== 'undefined') {
    const { error } = await supabase
      .from('arya_messages')
      .update({ rating: body.rating })
      .eq('id', message_id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to rate message' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
}
