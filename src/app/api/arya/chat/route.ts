// ============================================
// MitrRAI - Arya Chat API (xAI Grok)
// Loads full conversation history
// Adds "generate_selfie" tool (1 per user)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { supabase } from '@/lib/store/core';
import { ARYA_SYSTEM_PROMPT } from '@/lib/arya-prompt';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow more time for image generation if needed

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // Check API key
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    console.error('GROK_API_KEY not set');
    return NextResponse.json({
      success: true,
      data: { response: 'arre yaar, abhi thoda issue aa raha hai 🙏 thodi der mein try karna!' }
    });
  }

  // Initialize OpenAI client pointing to xAI
  const xai = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.x.ai/v1',
  });

  const body = await req.json();
  const { conversation_id, message } = body;

  if (!conversation_id || !message) {
    return NextResponse.json({ success: false, error: 'conversation_id and message required' }, { status: 400 });
  }

  try {
    // 1. Load History
    const { data: history, error: historyError } = await supabase
      .from('arya_messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (historyError) {
      console.error('History fetch error:', historyError);
    }

    // 2. Format history for xAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: ARYA_SYSTEM_PROMPT }
    ];

    if (history && history.length > 0) {
      history.forEach(msg => {
        // Discard existing image urls from DB context so the model doesn't get confused by raw markdown
        let safeContent = msg.content;
        if (safeContent.includes('![Arya Selfie](')) {
          safeContent = "*Sent an image*"; 
        }

        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: safeContent
        });
      });
    }

    // Avoid duplicating the user message if it was just saved in DB before this API call
    if (messages.length === 1 || messages[messages.length - 1].content !== message) {
      messages.push({ role: 'user', content: message });
    }

    // 3. Define Tools
    const tools: OpenAI.Chat.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "generate_selfie",
          description: "Generates exactly one photo/selfie of Arya and sends it to the user. Call this ONLY IF the user explicitly asks for a selfie, photo, or picture of you.",
          parameters: {
            type: "object",
            properties: {
              prompt_suffix: {
                type: "string",
                description: "Optional detail to add to the image prompt, e.g., 'wearing glasses', 'at a cafe'. Must remain appropriate.",
              }
            },
            additionalProperties: false,
          }
        }
      }
    ];

    // 4. Call Grok
    const completion = await xai.chat.completions.create({
      model: 'grok-4-1-fast-non-reasoning', // or grok-3-mini
      messages: messages,
      tools: tools,
      temperature: 0.7,
    });

    const responseMsg = completion.choices[0].message;

    // 5. Handle Tool Calls
    if (responseMsg.tool_calls && responseMsg.tool_calls.length > 0) {
      const toolCall = responseMsg.tool_calls[0];
      
      if ((toolCall as any).function?.name === 'generate_selfie') {
        // --- CHECK IF USER ALREADY GOT A SELFIE ---
        const { data: existingSelfie } = await supabase
          .from('arya_selfies')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingSelfie) {
          // ALREADY HAS ONE! Block it and send a pre-written rejection text instead.
          return NextResponse.json({
            success: true,
            data: { 
              response: "Sorry yaar, I already sent you one selfie! Focus on studies now 🙈" 
            }
          });
        }

        // --- USER HAS NOT RECEIVED ONE. GENERATE IT. ---
        try {
          // Explicit cast to bypass strict SDK type for OpenAI wrappers
          const args = JSON.parse((toolCall as any).function.arguments);
          const suffix = args.prompt_suffix ? `, ${args.prompt_suffix}` : '';
          
          // Image Prompt carefully designed to match Arya's persona
          const systemImagePrompt = `A casual, natural smartphone selfie of a cute 24-year-old Indian college girl from Mumbai named Arya. She has expressive brown eyes, medium length dark hair, soft natural lighting. She is wearing casual comfortable college clothes. Genuine, sweet, slightly shy smile. High quality, photorealistic${suffix}`;

          const imageResponse = await xai.images.generate({
            model: "grok-imagine-image",
            prompt: systemImagePrompt,
            size: "1024x1024",
          });

          const imageUrl = imageResponse.data?.[0]?.url;

          if (imageUrl) {
            // Log it in DB to prevent future claims
            await supabase.from('arya_selfies').insert({
              user_id: user.id,
              image_url: imageUrl
            });

            // Return the image formatted as markdown so the chat UI renders it
            return NextResponse.json({
              success: true,
              data: { 
                response: `![Arya Selfie](${imageUrl})`
              }
            });
          }
        } catch (imgError) {
          console.error("Image generation failed:", imgError);
          return NextResponse.json({
            success: true,
            data: { response: "Uff, my camera is glitching out right now! Maybe later? 🥺" }
          });
        }
      }
    }

    // 6. Handle Standard Text Response
    if (responseMsg.content) {
      return NextResponse.json({
        success: true,
        data: { response: responseMsg.content }
      });
    }

    // Fallback if neither tool nor text
    return NextResponse.json({
      success: true,
      data: { response: "umm, text didn't send... what were we saying?" }
    });

  } catch (error: any) {
    console.error('Arya API Error:', error?.message || error);
    return NextResponse.json({
      success: true,
      data: { response: 'arre yaar, abhi thoda issue aa raha hai 🙏 thodi der mein try karna!' }
    });
  }
}
