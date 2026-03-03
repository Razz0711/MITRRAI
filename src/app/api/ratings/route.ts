// ============================================
// MitrAI - Professor Ratings API
// GET: list professors with stats / get ratings for a professor
// POST: submit a rating (or add a new professor)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getProfessorsWithStats,
  getRatingsForProfessor,
  submitRating,
  createProfessor,
  getUserRatingForProfessor,
} from '@/lib/store/ratings';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/ratings?department=CSE              → professors with stats
// GET /api/ratings?professorId=xxx             → ratings for a professor
// GET /api/ratings?professorId=xxx&userId=yyy  → user's rating for a professor
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const department = req.nextUrl.searchParams.get('department');
  const professorId = req.nextUrl.searchParams.get('professorId');
  const userId = req.nextUrl.searchParams.get('userId');

  // Get user's own rating for a professor
  if (professorId && userId) {
    const myRating = await getUserRatingForProfessor(userId, professorId);
    return NextResponse.json({ success: true, data: { myRating } });
  }

  // Get all ratings for a professor
  if (professorId) {
    const ratings = await getRatingsForProfessor(professorId);
    // Strip userId for anonymity — only return comment, rating, batchYear
    const anonymous = ratings.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      batchYear: r.batchYear,
      department: r.department,
      createdAt: r.createdAt,
    }));
    return NextResponse.json({ success: true, data: { ratings: anonymous } });
  }

  // List professors with stats for a department
  if (department) {
    const professors = await getProfessorsWithStats(department);
    return NextResponse.json({ success: true, data: { professors } });
  }

  return NextResponse.json({ success: false, error: 'Provide department or professorId' }, { status: 400 });
}

// POST /api/ratings
// { action: 'rate', professorId, rating, comment, batchYear, department }
// { action: 'addProfessor', name, department }
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`ratings:${authUser.id}`, 15, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'addProfessor') {
      const { name, department } = body;
      if (!name?.trim() || !department?.trim()) {
        return NextResponse.json({ success: false, error: 'Name and department required' }, { status: 400 });
      }
      const prof = await createProfessor(name.trim(), department.trim());
      if (!prof) {
        return NextResponse.json({ success: false, error: 'Failed to create professor' }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: { professor: prof } }, { status: 201 });
    }

    if (action === 'rate') {
      const { professorId, rating, comment, batchYear, department } = body;
      if (!professorId || !rating || rating < 1 || rating > 5) {
        return NextResponse.json({ success: false, error: 'professorId and rating (1-5) required' }, { status: 400 });
      }
      const result = await submitRating({
        professorId,
        userId: authUser.id,
        rating: Math.round(rating),
        comment: (comment || '').slice(0, 500),
        batchYear: batchYear || '',
        department: department || '',
      });
      if (!result) {
        return NextResponse.json({ success: false, error: 'Failed to submit rating' }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: { rating: result } });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Ratings API error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
