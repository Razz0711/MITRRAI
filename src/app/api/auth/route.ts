// ============================================
// MitrRAI - Auth API Route
// Handles signup via Supabase Auth Admin API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as supabaseService } from '@/lib/supabase';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { parseStudentEmail } from '@/lib/email-parser';

// Admin client for user creation (uses service role key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!supabaseAdmin) {
      console.error('[Auth] Missing SUPABASE_URL or SERVICE_ROLE_KEY');
      return NextResponse.json({ success: false, error: 'kuch gadbad ho gayi, admin se baat karo 🙏' }, { status: 500 });
    }

    if (action === 'signup') {
      const { name, email, password, admissionNumber, department, yearLevel, gender, dob,
              matchKey, programType, batchYear, deptCode, rollNo, deptKnown, profileAutoFilled } = body;

      // Rate limit signups by email (10 attempts per 10 minutes)
      if (email && !rateLimit(`auth:${email}`, 10, 600_000)) return rateLimitExceeded();

      if (!name || !email || !password || !dob) {
        return NextResponse.json({ success: false, error: 'Name, email, password, and date of birth are required' }, { status: 400 });
      }

      // Validate SVNIT email (allow demo reviewer account)
      const DEMO_EMAIL = 'demo@mitrai.study';
      const svnitRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?svnit\.ac\.in$/;
      if (email.trim().toLowerCase() !== DEMO_EMAIL && !svnitRegex.test(email)) {
        return NextResponse.json({ success: false, error: 'Only SVNIT emails allowed' }, { status: 400 });
      }

      if (password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      // Parse email to auto-fill if not provided by client
      const parsed = parseStudentEmail(email.trim().toLowerCase());
      const finalAdmNo = admissionNumber || parsed?.admissionNumber || '';
      const finalDept = department || parsed?.department || '';
      const finalYear = yearLevel || parsed?.yearLevel || '';
      const finalMatchKey = matchKey || parsed?.matchKey || '';
      const finalProgramType = programType || parsed?.programType || '';
      const finalBatchYear = batchYear || parsed?.batchYear || '';
      const finalDeptCode = deptCode || parsed?.deptCode || '';
      const finalRollNo = rollNo || parsed?.rollNo || '';
      const finalDeptKnown = deptKnown ?? parsed?.deptKnown ?? true;
      const finalAutoFilled = profileAutoFilled ?? !!parsed;

      // Pre-check: reject if email OR admission number already exists in students table
      const trimmedEmail = email.trim().toLowerCase();
      const { data: existingByEmail } = await supabaseService
        .from('students')
        .select('id')
        .eq('email', trimmedEmail)
        .maybeSingle();
      if (existingByEmail) {
        return NextResponse.json({ success: false, error: 'An account with this email already exists. Please log in.' }, { status: 409 });
      }

      if (finalAdmNo) {
        const { data: existingByAdmNo } = await supabaseService
          .from('students')
          .select('id')
          .ilike('admission_number', finalAdmNo.trim())
          .maybeSingle();
        if (existingByAdmNo) {
          return NextResponse.json({ success: false, error: 'An account with this admission number already exists. Please log in.' }, { status: 409 });
        }
      }

      // Create Supabase Auth user with admin API (auto-confirmed, no email verification needed since we verified via OTP)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          name: name.trim(),
          admissionNumber: finalAdmNo.trim().toUpperCase(),
          department: finalDept,
          yearLevel: finalYear,
          dob,
          showBirthday: true,
          matchKey: finalMatchKey,
          programType: finalProgramType,
          batchYear: finalBatchYear,
          deptCode: finalDeptCode,
          rollNo: finalRollNo,
          deptKnown: finalDeptKnown,
          profileAutoFilled: finalAutoFilled,
        },
      });

      if (authError) {
        if (authError.message.includes('already') || authError.message.includes('exists')) {
          return NextResponse.json({ success: false, error: 'An account with this email already exists' }, { status: 409 });
        }
        console.error('[Auth] Signup error:', authError);
        return NextResponse.json({ success: false, error: 'Failed to create account. Please try again.' }, { status: 500 });
      }

      const userId = authData.user.id;

      // Auto-create a minimal student profile so this user is immediately visible for matching
      try {
        let currentStudy = parsed?.currentStudy || `B.Tech ${finalDept}`;
        if (!parsed) {
          if (finalDept.startsWith('Integrated')) currentStudy = finalDept;
          else if (finalDept === 'Mathematics & Computing') currentStudy = 'B.Tech Mathematics & Computing';
        }

        await supabaseService.from('students').upsert({
          id: userId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          admission_number: finalAdmNo.trim().toUpperCase(),
          department: finalDept,
          year_level: finalYear,
          gender: gender || 'Male',
          dob: dob || '',
          show_birthday: true,
          current_study: currentStudy,
          institution: 'SVNIT Surat',
          city: 'Surat',
          country: 'India',
          timezone: 'IST',
          preferred_language: 'English',
          match_key: finalMatchKey,
          program_type: finalProgramType,
          batch_year: finalBatchYear,
          dept_code: finalDeptCode,
          roll_no: finalRollNo,
          dept_known: finalDeptKnown,
          profile_auto_filled: finalAutoFilled,
        }, { onConflict: 'id' });
      } catch (err) {
        console.error('profileUpsert:', err);
        // Best-effort — profile will be completed during onboarding
      }

      return NextResponse.json({ success: true, userId });
    }

    if (action === 'login') {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
      }

      const trimmedEmail = email.trim().toLowerCase();

      // Rate limit login attempts (15 per 10 minutes per email)
      if (!rateLimit(`login:${trimmedEmail}`, 15, 600_000)) return rateLimitExceeded();

      try {
        // Server-side proxy: Vercel→Supabase (fast, reliable server-to-server)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            },
            body: JSON.stringify({ email: trimmedEmail, password }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          const msg = data.error_description || data.msg || 'Invalid credentials';
          const status = response.status === 400 ? 401 : response.status;
          return NextResponse.json({ success: false, error: msg }, { status });
        }

        return NextResponse.json({
          success: true,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
      } catch (err) {
        console.error('[Auth] Server-side login error:', err);
        return NextResponse.json({ success: false, error: 'Login failed — please try again.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Auth] Error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
