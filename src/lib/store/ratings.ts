// ============================================
// MitrAI - Professor Ratings Store
// Anonymous professor ratings with batch stats
// ============================================

import { supabase } from './core';

export interface Professor {
  id: string;
  name: string;
  department: string;
  createdAt: string;
}

export interface ProfessorRating {
  id: string;
  professorId: string;
  userId: string;
  rating: number;
  comment: string;
  batchYear: string;
  department: string;
  createdAt: string;
}

export interface ProfessorWithStats {
  id: string;
  name: string;
  department: string;
  avgRating: number;
  totalRatings: number;
  batchBreakdown: Record<string, number>; // batchYear → count
}

// ── Professors CRUD ──

export async function getProfessorsByDepartment(department: string): Promise<Professor[]> {
  const { data, error } = await supabase
    .from('professors')
    .select('*')
    .ilike('department', department)
    .order('name');
  if (error) { console.error('getProfessorsByDepartment error:', error); return []; }
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    department: r.department,
    createdAt: r.created_at,
  }));
}

export async function createProfessor(name: string, department: string): Promise<Professor | null> {
  const { data, error } = await supabase
    .from('professors')
    .upsert({ name: name.trim(), department: department.trim() }, { onConflict: 'name,department' })
    .select()
    .single();
  if (error) { console.error('createProfessor error:', error); return null; }
  return { id: data.id, name: data.name, department: data.department, createdAt: data.created_at };
}

// ── Ratings CRUD ──

export async function getRatingsForProfessor(professorId: string): Promise<ProfessorRating[]> {
  const { data, error } = await supabase
    .from('professor_ratings')
    .select('*')
    .eq('professor_id', professorId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getRatingsForProfessor error:', error); return []; }
  return (data || []).map(r => ({
    id: r.id,
    professorId: r.professor_id,
    userId: r.user_id,
    rating: r.rating,
    comment: r.comment || '',
    batchYear: r.batch_year || '',
    department: r.department || '',
    createdAt: r.created_at,
  }));
}

export async function submitRating(opts: {
  professorId: string;
  userId: string;
  rating: number;
  comment: string;
  batchYear: string;
  department: string;
}): Promise<ProfessorRating | null> {
  const { data, error } = await supabase
    .from('professor_ratings')
    .upsert({
      professor_id: opts.professorId,
      user_id: opts.userId,
      rating: opts.rating,
      comment: opts.comment,
      batch_year: opts.batchYear,
      department: opts.department,
    }, { onConflict: 'user_id,professor_id' })
    .select()
    .single();
  if (error) { console.error('submitRating error:', error); return null; }
  return {
    id: data.id,
    professorId: data.professor_id,
    userId: data.user_id,
    rating: data.rating,
    comment: data.comment || '',
    batchYear: data.batch_year || '',
    department: data.department || '',
    createdAt: data.created_at,
  };
}

export async function getUserRatingForProfessor(userId: string, professorId: string): Promise<ProfessorRating | null> {
  const { data, error } = await supabase
    .from('professor_ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('professor_id', professorId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    professorId: data.professor_id,
    userId: data.user_id,
    rating: data.rating,
    comment: data.comment || '',
    batchYear: data.batch_year || '',
    department: data.department || '',
    createdAt: data.created_at,
  };
}

export async function getProfessorsWithStats(department: string): Promise<ProfessorWithStats[]> {
  const profs = await getProfessorsByDepartment(department);
  if (profs.length === 0) return [];

  const profIds = profs.map(p => p.id);
  const { data: allRatings, error } = await supabase
    .from('professor_ratings')
    .select('professor_id, rating, batch_year')
    .in('professor_id', profIds);

  if (error) { console.error('getProfessorsWithStats error:', error); }

  const ratingsMap: Record<string, { total: number; sum: number; batches: Record<string, number> }> = {};
  for (const r of (allRatings || [])) {
    const pid = r.professor_id;
    if (!ratingsMap[pid]) ratingsMap[pid] = { total: 0, sum: 0, batches: {} };
    ratingsMap[pid].total++;
    ratingsMap[pid].sum += r.rating;
    const batch = r.batch_year || 'Unknown';
    ratingsMap[pid].batches[batch] = (ratingsMap[pid].batches[batch] || 0) + 1;
  }

  return profs.map(p => {
    const stats = ratingsMap[p.id] || { total: 0, sum: 0, batches: {} };
    return {
      id: p.id,
      name: p.name,
      department: p.department,
      avgRating: stats.total > 0 ? Math.round((stats.sum / stats.total) * 10) / 10 : 0,
      totalRatings: stats.total,
      batchBreakdown: stats.batches,
    };
  });
}
