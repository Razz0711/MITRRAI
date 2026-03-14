// ============================================
// MitrAI - Matching API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAllStudents, getStudentById } from '@/lib/store';
import { findTopMatches } from '@/lib/matching';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`match:${authUser.id}`, 5, 60_000)) return rateLimitExceeded();
  try {
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'studentId is required' }, { status: 400 });
    }

    const student = await getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const candidates = await getAllStudents();
    const matches = await findTopMatches(student, candidates, 3);

    return NextResponse.json({ success: true, data: { student, matches } });
  } catch (error) {
    console.error('Matching error:', error);
    return NextResponse.json({ success: false, error: 'Failed to find matches' }, { status: 500 });
  }
}
