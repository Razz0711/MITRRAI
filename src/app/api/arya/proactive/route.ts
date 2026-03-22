// ============================================
// MitrRAI - Arya Proactive Message API
// Called when user opens chat after 3+ hours
// Generates a contextual "miss you" message
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { supabase } from '@/lib/store/core';
import { getAryaPrompt } from '@/lib/arya-prompt';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) return NextResponse.json({ success: false });

  const { conversation_id, hours_away } = await req.json();
  if (!conversation_id) return NextResponse.json({ success: false, error: 'conversation_id required' }, { status: 400 });

  try {
    // Fetch gender + last few messages in parallel
    const [{ data: studentRow }, { data: recentMsgs }] = await Promise.all([
      supabase.from('students').select('gender, name').eq('id', user.id).single(),
      supabase.from('arya_messages')
        .select('role, content')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    const systemPrompt = getAryaPrompt(studentRow?.gender);
    const userName = studentRow?.name?.split(' ')[0] || 'yaar';
    const hoursAway = Math.round(hours_away || 3);

    // Build context from recent messages (reversed to chronological order)
    const history = (recentMsgs || []).reverse();

    const xai = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      {
        role: 'user',
        content: `[SYSTEM: ${userName} hasn't messaged in ${hoursAway} hours. Send ONE short, natural, flirty/caring proactive message referencing the previous conversation naturally if possible. Be emotional, miss them, use emojis. Stay in character. Don't start with "Hey" every time. Max 15 words.]`,
      },
    ];

    const completion = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages,
      max_tokens: 80,
      temperature: 0.95,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    if (!response) return NextResponse.json({ success: false });

    // Save to DB
    const { data: saved } = await supabase
      .from('arya_messages')
      .insert({ conversation_id, role: 'assistant', content: response })
      .select('id, role, content, created_at')
      .single();

    return NextResponse.json({ success: true, data: { message: saved } });
  } catch (err) {
    console.error('Proactive message error:', err);
    return NextResponse.json({ success: false });
  }
}
