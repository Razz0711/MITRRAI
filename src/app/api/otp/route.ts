// ============================================
// MitrRAI - OTP Verification API
// Generates and verifies email OTP codes
// Sends real OTP via Gmail SMTP (nodemailer)
// Stores OTPs in Supabase (not in-memory) for serverless compatibility
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

// Create reusable transporter with connection pooling and timeouts
const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  auth: {
    user: (process.env.SMTP_EMAIL || '').trim(),
    pass: (process.env.SMTP_APP_PASSWORD || '').trim(),
  },
  connectionTimeout: 8000,  // 8s to establish connection
  greetingTimeout: 8000,    // 8s for SMTP greeting
  socketTimeout: 10000,     // 10s for socket inactivity
});

async function sendOtpEmail(to: string, code: string) {
  const fromEmail = (process.env.SMTP_EMAIL || '').trim();
  const mailOptions = {
    from: `"MitrRAI" <${fromEmail}>`,
    to,
    subject: `${code} is your MitrRAI verification code`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden;">
        <div style="background: #1a1a2e; padding: 28px 24px 12px; text-align: center;">
          <img src="https://mitrrai-study.vercel.app/logo.jpg" alt="MitrRAI" width="120" style="display: block; margin: 0 auto; height: auto; border-radius: 14px;" />
        </div>
        <div style="background: linear-gradient(180deg, #1a1a2e 0%, #7c3aed 80%, #a855f7 100%); padding: 8px 24px 24px; text-align: center;">
          <h1 style="color: white; font-size: 22px; margin: 0;">MitrRAI</h1>
          <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 4px 0 0;">Your SVNIT Study Buddy</p>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <p style="color: #e0e0e0; font-size: 15px; margin: 0 0 8px;">Your verification code is:</p>
          <div style="background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 12px; padding: 20px; margin: 16px 0;">
            <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #a855f7;">${code}</span>
          </div>
          <p style="color: #888; font-size: 13px; margin: 16px 0 0;">This code expires in <strong style="color: #e0e0e0;">5 minutes</strong>.</p>
          <p style="color: #666; font-size: 12px; margin: 8px 0 0;">If you didn&apos;t request this, you can safely ignore this email.</p>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
          <p style="color: #555; font-size: 11px; margin: 0;">MitrRAI &mdash; Find your perfect study partner at SVNIT</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// POST /api/otp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (action === 'send') {
      // IP-level guard: 5 OTP sends per 10 minutes per IP
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      if (!rateLimit(`otp-send:${ip}`, 5, 10 * 60_000)) return rateLimitExceeded();
      // Clean expired OTPs (non-blocking — don’t delay the user)
      supabase.from('otp_codes').delete().lt('expires_at', new Date().toISOString()).then(() => {}, () => {});

      // Demo reviewer account — use fixed OTP, skip real email
      const DEMO_EMAIL = 'demo@mitrai.study';
      if (normalizedEmail === DEMO_EMAIL) {
        const fixedCode = '123456';
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min for demo
        await supabase.from('otp_codes').upsert({
          email: normalizedEmail,
          code: fixedCode,
          expires_at: expiresAt,
          attempts: 0,
          created_at: new Date().toISOString(),
        }, { onConflict: 'email' });
        console.log(`[OTP] Demo account — fixed code stored for ${normalizedEmail}`);
        return NextResponse.json({ success: true, message: 'Verification code sent to your email' });
      }

      // Rate limit: don't allow re-send within 30 seconds
      const { data: existing } = await supabase
        .from('otp_codes')
        .select('created_at')
        .eq('email', normalizedEmail)
        .single();

      if (existing) {
        const createdAt = new Date(existing.created_at).getTime();
        const now = Date.now();
        if (now - createdAt < 30000) {
          return NextResponse.json({
            success: false,
            error: 'Please wait 30 seconds before requesting a new code',
          }, { status: 429 });
        }
      }

      // Generate 6-digit OTP (cryptographically secure)
      const code = String(crypto.randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Store in Supabase (upsert — replace any existing OTP for this email)
      const { error: upsertError } = await supabase.from('otp_codes').upsert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt,
        attempts: 0,
        created_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      if (upsertError) {
        console.error('[OTP] Failed to store OTP:', upsertError);
        return NextResponse.json({
          success: false,
          error: 'Failed to generate verification code. Please try again.',
        }, { status: 500 });
      }

      // Send OTP via email
      try {
        await sendOtpEmail(normalizedEmail, code);
      } catch (emailErr: unknown) {
        const errMsg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.error('[OTP] Failed to send email:', errMsg);
        await supabase.from('otp_codes').delete().eq('email', normalizedEmail);
        return NextResponse.json({
          success: false,
          error: 'Failed to send verification email. Please try again.',
        }, { status: 500 });
      }

      console.log(`[OTP] Code sent to ${normalizedEmail}`);

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email',
      });
    }

    if (action === 'verify') {
      const { code } = body;

      if (!code) {
        return NextResponse.json({ success: false, error: 'Verification code is required' }, { status: 400 });
      }

      const { data: stored, error: fetchError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      if (fetchError || !stored) {
        return NextResponse.json({ success: false, error: 'No verification code found. Please request a new one.' }, { status: 400 });
      }

      if (new Date(stored.expires_at) < new Date()) {
        await supabase.from('otp_codes').delete().eq('email', normalizedEmail);
        return NextResponse.json({ success: false, error: 'Code expired. Please request a new one.' }, { status: 400 });
      }

      if (stored.attempts >= 5) {
        await supabase.from('otp_codes').delete().eq('email', normalizedEmail);
        return NextResponse.json({ success: false, error: 'Too many failed attempts. Please request a new code.' }, { status: 429 });
      }

      if (stored.code !== code.trim()) {
        await supabase
          .from('otp_codes')
          .update({ attempts: stored.attempts + 1 })
          .eq('email', normalizedEmail);

        return NextResponse.json({
          success: false,
          error: `Invalid code. ${5 - (stored.attempts + 1)} attempts remaining.`,
        }, { status: 400 });
      }

      // OTP verified — keep the row alive so frontend can retry login if it fails
      // The row expires naturally and gets cleaned up on next OTP send
      return NextResponse.json({ success: true, message: 'Email verified successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('OTP error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
