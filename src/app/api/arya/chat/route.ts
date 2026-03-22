// ============================================
// MitrRAI - Arya Chat API (xAI Grok)
// Loads full conversation history
// Adds "generate_selfie" tool (1 per user)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { supabase } from '@/lib/store/core';
import { getAryaPrompt } from '@/lib/arya-prompt';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { detectCrisis } from '@/lib/crisis-detection';
import { getStickerIds } from '@/lib/arya-stickers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow more time for image generation if needed

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // Rate limit: 20 messages per minute per user
  if (!rateLimit(`arya-chat:${user.id}`, 20, 60_000)) return rateLimitExceeded();

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

  // Detect crisis signals — supplements Arya's response with a safety note on the client
  const isCrisis = detectCrisis(String(message));

  try {
    // 1. Fetch gender + history in parallel to minimize latency
    const [{ data: studentRow }, { data: history, error: historyError }] = await Promise.all([
      supabase.from('students').select('gender').eq('id', user.id).single(),
      supabase.from('arya_messages').select('role, content')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })
        .limit(50),
    ]);
    const basePrompt = getAryaPrompt(studentRow?.gender);
    const systemPrompt = basePrompt + `\n\n## REACTIONS & STICKERS\nYou can react to the user's message like a WhatsApp reaction. To do so, start your reply with "REACT:" followed by a single emoji (e.g. "REACT:❤️" or "REACT:😂"). Do this occasionally — only when the emotion is strong (funny, touching, surprising). After "REACT:emoji" continue your normal reply on the same line.\n\nYou can also send a sticker by including [STICKER:id] anywhere in your reply. Available sticker IDs: ${getStickerIds()}. Use stickers spontaneously when the mood fits — max once every 5 messages. You can send a sticker with text, or just a sticker alone.\n\nExample: "REACT:😂 haha yaar you're too funny! [STICKER:laugh]"`;


    if (historyError) {
      console.error('History fetch error:', historyError);
    }

    // 3. Format history for xAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
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

    // 4. Call Grok with 10s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let completion;
    try {
      completion = await xai.chat.completions.create({
        model: 'grok-4-1-fast-non-reasoning',
        messages: messages,
        tools: tools,
        temperature: 0.7,
      }, { signal: controller.signal });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (apiError: any) {
      clearTimeout(timeout);
      if (apiError?.name === 'AbortError' || apiError?.code === 'ETIMEDOUT') {
        return NextResponse.json({
          success: true,
          data: { response: 'arre yaar, thoda time lag raha hai 😅 ek minute mein try karna!' }
        });
      }
      if (apiError?.status === 429 || apiError?.message?.includes('429')) {
        return NextResponse.json({
          success: true,
          data: { response: 'arre yaar thoda busy hoon, ek minute mein try karna 🙏' }
        });
      }
      throw apiError;
    }
    clearTimeout(timeout);

    const responseMsg = completion.choices[0].message;

    // 5. Handle Tool Calls
    if (responseMsg.tool_calls && responseMsg.tool_calls.length > 0) {
      const toolCall = responseMsg.tool_calls[0];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      let raw = responseMsg.content.trim();

      // Parse optional reaction: "REACT:❤️ rest of message"
      let reaction: string | undefined;
      const reactMatch = raw.match(/^REACT:(\S+)\s*/);
      if (reactMatch) {
        reaction = reactMatch[1];
        raw = raw.slice(reactMatch[0].length).trim();
      }

      // Parse optional sticker: [STICKER:id]
      let sticker: string | undefined;
      const stickerMatch = raw.match(/\[STICKER:([a-z_]+)\]/);
      if (stickerMatch) {
        sticker = stickerMatch[1];
        // Keep [STICKER:id] in content so it persists in DB and UI can render it
      }

      return NextResponse.json({
        success: true,
        data: { response: raw || '...', reaction, sticker, crisisResource: isCrisis || undefined }
      });
    }

    // Fallback if neither tool nor text
    return NextResponse.json({
      success: true,
      data: { response: "umm, text didn't send... what were we saying?", crisisResource: isCrisis || undefined }
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Arya API Error:', error?.message || error);
    return NextResponse.json({
      success: true,
      data: { response: 'arre yaar, abhi thoda issue aa raha hai 🙏 thodi der mein try karna!' }
    });
  }
}
