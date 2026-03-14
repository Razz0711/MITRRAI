// ============================================
// MitrAI - Payment Submission API
// POST /api/anon/pay { plan, transactionId, upiRef }
// GET  /api/anon/pay — check payment status
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import {
  submitPayment,
  getUserPaymentStatus,
  isAnonOpenAccessActive,
  ANON_OPEN_ACCESS_ENDS_AT,
} from '@/lib/store/anon';
import { ANON_PRICING } from '@/lib/anon-aliases';
import { normalizeOptionalPaymentReference, validatePaymentReference } from '@/lib/payment-validation';

export const dynamic = 'force-dynamic';

// GET — check current payment status
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const payment = await getUserPaymentStatus(authUser.id);
  return NextResponse.json({
    success: true,
    data: {
      payment,
      isOpenAccess: isAnonOpenAccessActive(),
      openAccessEndsAt: ANON_OPEN_ACCESS_ENDS_AT,
    },
  });
}

// POST — submit a new payment
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = authUser.id;
  if (!rateLimit(`anon-pay:${userId}`, 3, 300_000)) return rateLimitExceeded();

  try {
    if (isAnonOpenAccessActive()) {
      return NextResponse.json(
        { success: false, error: 'Anonymous chat is free for everyone until April 14, 2026.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { plan, transactionId, upiRef } = body;

    // Validate plan
    const tier = ANON_PRICING.find(t => t.plan === plan);
    if (!tier) {
      return NextResponse.json({ success: false, error: 'Invalid plan' }, { status: 400 });
    }

    // Validate transaction ID
    if (!transactionId || typeof transactionId !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid transaction/reference ID required' }, { status: 400 });
    }

    const validatedTxn = validatePaymentReference(transactionId);
    if (!validatedTxn.valid) {
      return NextResponse.json({ success: false, error: validatedTxn.error }, { status: 400 });
    }

    const result = await submitPayment(
      userId,
      plan,
      tier.price,
      validatedTxn.normalized,
      normalizeOptionalPaymentReference(upiRef) || undefined,
    );
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Payment submitted! Admin will verify within 24 hours.' });
  } catch (error) {
    console.error('Payment submit error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
