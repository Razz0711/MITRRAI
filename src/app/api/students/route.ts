// ============================================
// MitrAI - Student Profile API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllStudents, createStudent, getStudentById, deleteStudent, updateStudent } from '@/lib/store';
import { StudentProfile, LearningType, StudyMethod, SessionLength, BreakPattern, StudyPace, Day, SessionType, StudyStylePref, CommunicationType, TeachingAbility, Level } from '@/lib/types';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

// Strip sensitive fields when viewing other users' profiles
function stripSensitive(student: StudentProfile): Partial<StudentProfile> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email, admissionNumber, ...safe } = student;
  return safe;
}

/** Build a full StudentProfile from a partial body + id (shared by POST & PUT) */
function buildStudentProfile(source: Record<string, unknown>, id: string): StudentProfile {
  return {
    id,
    createdAt: new Date().toISOString(),
    name: String(source.name || 'Unknown').slice(0, 100),
    age: Math.min(Math.max(Number(source.age) || 17, 10), 100),
    email: String(source.email || '').slice(0, 200),
    admissionNumber: (source.admissionNumber as string) || '',
    city: (source.city as string) || '',
    country: (source.country as string) || 'India',
    timezone: (source.timezone as string) || 'IST',
    preferredLanguage: (source.preferredLanguage as string) || 'English',
    bio: (source.bio as string) || '',
    photoUrl: (source.photoUrl as string) || '',
    schedulePreferences: (source.schedulePreferences as string[]) || [],
    currentStudy: (source.currentStudy as string) || '',
    institution: (source.institution as string) || 'SVNIT Surat',
    department: (source.department as string) || '',
    yearLevel: (source.yearLevel as string) || '',
    targetExam: (source.targetExam as string) || '',
    targetDate: (source.targetDate as string) || '',
    strongSubjects: (source.strongSubjects as string[]) || [],
    weakSubjects: (source.weakSubjects as string[]) || [],
    currentlyStudying: (source.currentlyStudying as string) || '',
    upcomingTopics: (source.upcomingTopics as string[]) || [],
    learningType: (source.learningType as LearningType) || 'practical',
    studyMethod: (source.studyMethod as StudyMethod[]) || ['problems'],
    sessionLength: (source.sessionLength as SessionLength) || '1hr',
    breakPattern: (source.breakPattern as BreakPattern) || 'flexible',
    pace: (source.pace as StudyPace) || 'medium',
    availableDays: (source.availableDays as Day[]) || ['Monday', 'Wednesday', 'Friday'],
    availableTimes: (source.availableTimes as string) || '7PM-10PM IST',
    sessionsPerWeek: (source.sessionsPerWeek as number) || 3,
    sessionType: (source.sessionType as SessionType) || 'both',
    studyStyle: (source.studyStyle as StudyStylePref) || 'flexible',
    communication: (source.communication as CommunicationType) || 'extrovert',
    teachingAbility: (source.teachingAbility as TeachingAbility) || 'average',
    accountabilityNeed: (source.accountabilityNeed as Level) || 'medium',
    videoCallComfort: (source.videoCallComfort as boolean) ?? true,
    shortTermGoal: (source.shortTermGoal as string) || '',
    longTermGoal: (source.longTermGoal as string) || '',
    studyHoursTarget: (source.studyHoursTarget as number) || 4,
    weeklyGoals: (source.weeklyGoals as string) || '',
    dob: (source.dob as string) || '',
    showBirthday: source.showBirthday !== false,
    matchKey: (source.matchKey as string) || '',
    programType: (source.programType as string) || '',
    batchYear: (source.batchYear as string) || '',
    deptCode: (source.deptCode as string) || '',
    rollNo: (source.rollNo as string) || '',
    deptKnown: source.deptKnown !== false,
    profileAutoFilled: (source.profileAutoFilled as boolean) || false,
  };
}

// GET - Fetch all students or a specific student
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const student = await getStudentById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }
    // Return full data for own profile, stripped for others
    const data = id === authUser.id ? student : stripSensitive(student);
    return NextResponse.json({ success: true, data });
  }

  const students = await getAllStudents();
  const data = students.map(s => s.id === authUser.id ? s : stripSensitive(s));
  return NextResponse.json({ success: true, data });
}

// POST - Create a new student profile
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`students-create:${authUser.id}`, 10, 60_000)) return rateLimitExceeded();
  try {
    const body = await req.json();

    // If client sends an ID, check if it already exists — if so, return it
    // (this happens when signup auto-creates a profile)
    if (body.id) {
      const existing = await getStudentById(body.id);
      if (existing) {
        return NextResponse.json({ success: true, data: existing }, { status: 200 });
      }
    }

    // Check for duplicate: one profile per email
    // If same email exists, return existing profile (update via PUT instead)
    if (!body._autoCreated) {
      const allStudents = await getAllStudents();
      const duplicate = allStudents.find(
        s => s.email && body.email &&
          s.email.toLowerCase() === body.email.toLowerCase()
      );
      if (duplicate) {
        // Return existing profile instead of creating a new one
        return NextResponse.json({ success: true, data: duplicate }, { status: 200 });
      }
    }

    const student = buildStudentProfile(body, body.id || uuidv4());

    const created = await createStudent(student);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create student' }, { status: 500 });
  }
}

// PUT - Update an existing student profile (used by onboarding to fill in details)
export async function PUT(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`students-update:${authUser.id}`, 20, 60_000)) return rateLimitExceeded();
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Student ID is required' }, { status: 400 });
    }

    // Ownership check: can only update own profile
    if (id !== authUser.id) return forbidden();

    const existing = await getStudentById(id);
    if (!existing) {
      // If not found, create it instead
      const student = buildStudentProfile(updates, id);
      const created = await createStudent(student);
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    const updated = await updateStudent(id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update student' }, { status: 500 });
  }
}

// DELETE - Delete a student profile (ownership verified)
export async function DELETE(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Student ID is required' }, { status: 400 });
    }

    // Ownership check: only the profile owner can delete
    if (id !== authUser.id) return forbidden();

    const student = await getStudentById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const deleted = await deleteStudent(id);
    if (deleted) {
      return NextResponse.json({ success: true, message: 'Profile deleted successfully' });
    }

    return NextResponse.json({ success: false, error: 'Failed to delete profile' }, { status: 500 });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete profile' }, { status: 500 });
  }
}