// ============================================
// MitrAI - Arya Chat API (Gemini 1.5 Flash)
// Loads full conversation history (ignores is_deleted_by_user)
// Passes system prompt on every call
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { supabase } from '@/lib/store/core';
import { ARYA_SYSTEM_PROMPT } from '@/lib/arya-prompt';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const { conversation_id, message } = body;

  if (!conversation_id || !message) {
    return NextResponse.json({ success: false, error: 'conversation_id and message required' }, { status: 400 });
  }

  try {
    // Load full conversation history from Supabase
    // is_deleted_by_user is intentionally IGNORED here.
    // Arya context loader always reads full message history
    // regardless of this flag to maintain conversation continuity
    // and learn user communication patterns.
    const { data: history } = await supabase
      .from('arya_messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(50);

    // Convert to Gemini format (Gemini uses 'model' instead of 'assistant')
    const conversationHistory = history?.map(msg => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }],
    })) ?? [];

    // Initialize Gemini model with system prompt
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: ARYA_SYSTEM_PROMPT,
    });

    // Start chat with conversation history
    const chat = model.startChat({
      history: conversationHistory,
    });

    // Send the new user message
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json({
      success: true,
      data: { response: responseText },
    });
  } catch (err) {
    console.error('Gemini chat error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to get response from Arya' },
      { status: 500 }
    );
  }
}
