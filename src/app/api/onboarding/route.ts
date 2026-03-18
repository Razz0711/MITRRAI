// ============================================
// MitrRAI - Onboarding Chat API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getOnboardingResponse } from '@/lib/grok';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`onboarding:${authUser.id}`, 20, 60_000)) return rateLimitExceeded();
  // Parse body ONCE before try/catch so it's available in the catch block
  let step = 0;
  let message = '';
  let collectedData: Record<string, string> = {};
  let conversationHistory: { role: string; content: string }[] = [];

  try {
    const body = await req.json();
    step = body.step ?? 0;
    message = body.message ?? '';
    collectedData = body.collectedData ?? {};
    conversationHistory = body.conversationHistory ?? [];

    if (!process.env.GROK_API_KEY) {
      // Fallback responses when no API key
      const fallbackResponse = getFallbackResponse(step, message, collectedData);
      return NextResponse.json({ success: true, data: { response: fallbackResponse } });
    }

    const response = await getOnboardingResponse(step, message, collectedData, conversationHistory);

    return NextResponse.json({ success: true, data: { response } });
  } catch (error) {
    console.error('Onboarding chat error:', error);

    // Use already-parsed values from above (won't lose them even if Grok fails)
    const fallback = getFallbackResponse(step, message, collectedData);

    return NextResponse.json({ success: true, data: { response: fallback } });
  }
}

function getFallbackResponse(step: number, _message: string, data: Record<string, string>): string {
  const name = data.name || 'there';

  // Steps are renumbered: name/dept/year come from registration, not onboarding
  const responses: Record<number, string> = {
    0: `Great choice! Now tell me — which subjects are you strong in?\n(List them separated by commas, e.g., Linear Algebra, Probability)`,
    1: `Nice! Which subjects are you strong in?\n(List them separated by commas)`,
    2: `And which subjects do you need help with? That's exactly what a study buddy is for.\n(Separate with commas)`,
    3: `How do you prefer to study? Pick one or more.`,
    4: `How long are your study sessions usually?`,
    5: `Which days and times work best for you?\n(e.g., Mon, Wed, Fri evenings 7-10 PM)`,
    6: `What's your main goal right now?\n(e.g., Score 9+ SGPA, GATE prep, complete project, etc.)`,
    7: `Last question! Do you prefer a strict study schedule or flexible one? And do you need someone to keep you accountable?`,
    8: `All set, ${name}! Creating your profile now.\nI'll match you with the best study buddies from SVNIT.\n\nHead to the dashboard to see your matches!`,
  };

  return responses[step] || responses[0];
}
