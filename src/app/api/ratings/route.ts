// ============================================
// MitrAI - Professor Ratings API
// Multi-factor anonymous ratings + search
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getProfessorsWithStats,
  searchProfessorsWithStats,
  getRatingsForProfessor,
  submitRating,
  createProfessor,
  getUserRatingForProfessor,
} from '@/lib/store/ratings';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/ratings?department=X              → professors with stats
// GET /api/ratings?search=name               → search professors by name
// GET /api/ratings?professorId=xxx           → ratings for a professor
// GET /api/ratings?professorId=xxx&userId=yy → user's own rating
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const department = req.nextUrl.searchParams.get('department');
  const search = req.nextUrl.searchParams.get('search');
  const professorId = req.nextUrl.searchParams.get('professorId');
  const userId = req.nextUrl.searchParams.get('userId');

  if (professorId && userId) {
    const myRating = await getUserRatingForProfessor(userId, professorId);
    return NextResponse.json({ success: true, data: { myRating } });
  }

  if (professorId) {
    const ratings = await getRatingsForProfessor(professorId);
    const anonymous = ratings.map(r => ({
      id: r.id, teaching: r.teaching, grading: r.grading,
      friendliness: r.friendliness, material: r.material,
      comment: r.comment, batchYear: r.batchYear, department: r.department, createdAt: r.createdAt,
    }));
    return NextResponse.json({ success: true, data: { ratings: anonymous } });
  }

  if (search && search.trim().length >= 2) {
    const professors = await searchProfessorsWithStats(search.trim());
    return NextResponse.json({ success: true, data: { professors } });
  }

  if (department) {
    const professors = await getProfessorsWithStats(department);
    return NextResponse.json({ success: true, data: { professors } });
  }

  return NextResponse.json({ success: false, error: 'Provide department, search, or professorId' }, { status: 400 });
}

// POST /api/ratings
// { action: 'rate', professorId, teaching, grading, friendliness, material, comment, batchYear, department }
// { action: 'addProfessor', name, department, designation }
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`ratings:${authUser.id}`, 100, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'addProfessor') {
      const { name, department, designation } = body;
      if (!name?.trim() || !department?.trim()) {
        return NextResponse.json({ success: false, error: 'Name and department required' }, { status: 400 });
      }
      const prof = await createProfessor(name.trim(), department.trim(), designation);
      if (!prof) return NextResponse.json({ success: false, error: 'Failed to create professor' }, { status: 500 });
      return NextResponse.json({ success: true, data: { professor: prof } }, { status: 201 });
    }

    if (action === 'rate') {
      const { professorId, teaching, grading, friendliness, material, comment, batchYear, department } = body;
      const valid = (v: number) => v >= 1 && v <= 5;
      if (!professorId || !valid(teaching) || !valid(grading) || !valid(friendliness) || !valid(material)) {
        return NextResponse.json({ success: false, error: 'professorId and all 4 factor ratings (1-5) required' }, { status: 400 });
      }
      const result = await submitRating({
        professorId, userId: authUser.id,
        teaching: Math.round(teaching), grading: Math.round(grading),
        friendliness: Math.round(friendliness), material: Math.round(material),
        comment: (comment || '').slice(0, 500), batchYear: batchYear || '', department: department || '',
      });
      if (!result) return NextResponse.json({ success: false, error: 'Failed to submit rating' }, { status: 500 });
      return NextResponse.json({ success: true, data: { rating: result } });
    }

    if (action === 'seedProfessors') {
      // Bulk insert professors — { professors: [{ name, department, designation }] }
      const list: { name: string; department: string; designation: string }[] = body.professors || [];
      if (!Array.isArray(list) || list.length === 0) {
        return NextResponse.json({ success: false, error: 'Provide professors array' }, { status: 400 });
      }
      let created = 0;
      for (const p of list) {
        if (!p.name?.trim() || !p.department?.trim()) continue;
        const result = await createProfessor(p.name.trim(), p.department.trim(), p.designation?.trim());
        if (result) created++;
      }
      return NextResponse.json({ success: true, data: { created, total: list.length } });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Ratings API error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
