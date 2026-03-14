import { MatchResult, MatchScore, StudentProfile } from './types';

function normalize(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function isSameDepartment(student: StudentProfile, candidate: StudentProfile): boolean {
  const studentDepartment = normalize(student.department);
  const candidateDepartment = normalize(candidate.department);
  return Boolean(studentDepartment && candidateDepartment && studentDepartment === candidateDepartment);
}

function isSameYear(student: StudentProfile, candidate: StudentProfile): boolean {
  const studentYear = normalize(student.yearLevel);
  const candidateYear = normalize(candidate.yearLevel);
  return Boolean(studentYear && candidateYear && studentYear === candidateYear);
}

function scoreBranchCompatibility(student: StudentProfile, candidate: StudentProfile): number {
  return isSameDepartment(student, candidate) ? 60 : 0;
}

function scoreYearCompatibility(student: StudentProfile, candidate: StudentProfile): number {
  return isSameYear(student, candidate) ? 40 : 0;
}

function getMatchBasis(student: StudentProfile, candidate: StudentProfile): string[] {
  const basis: string[] = [];

  if (isSameDepartment(student, candidate) && candidate.department) {
    basis.push(`Same branch: ${candidate.department}`);
  }

  if (isSameYear(student, candidate) && candidate.yearLevel) {
    basis.push(`Same year: ${candidate.yearLevel}`);
  }

  if (basis.length === 2) {
    basis.push('Shared academic context should make introductions easier.');
  }

  return basis;
}

export function calculateMatchScore(student: StudentProfile, candidate: StudentProfile): MatchScore {
  const subject = scoreBranchCompatibility(student, candidate);
  const schedule = scoreYearCompatibility(student, candidate);

  return {
    overall: subject + schedule,
    subject,
    schedule,
    style: 0,
    goal: 0,
    personality: 0,
  };
}

function buildWhyItWorks(student: StudentProfile, candidate: StudentProfile): string {
  const sameDepartment = isSameDepartment(student, candidate);
  const sameYear = isSameYear(student, candidate);

  if (sameDepartment && sameYear) {
    return `${candidate.name} is in ${candidate.department} and ${candidate.yearLevel}, so you share the same branch and year.`;
  }

  if (sameDepartment) {
    return `${candidate.name} is from your branch (${candidate.department}), so your academic context should feel familiar even across different years.`;
  }

  if (sameYear) {
    return `${candidate.name} is in your year (${candidate.yearLevel}), so your college pace and timetable rhythm should be closer.`;
  }

  return `${candidate.name} is the closest available option based on your academic details.`;
}

function buildPotentialChallenge(student: StudentProfile, candidate: StudentProfile): string {
  const sameDepartment = isSameDepartment(student, candidate);
  const sameYear = isSameYear(student, candidate);

  if (sameDepartment && sameYear) {
    return 'You may still have different schedules, so start with a short intro before planning regular sessions.';
  }

  if (sameDepartment) {
    return 'Different years can mean different subject load and timetable pressure.';
  }

  if (sameYear) {
    return 'Different branches can reduce subject overlap even when the college year matches.';
  }

  return 'This match is only loosely related to your academic profile.';
}

export async function findTopMatches(
  student: StudentProfile,
  candidates: StudentProfile[],
  topN: number = 3
): Promise<MatchResult[]> {
  const others = candidates.filter((candidate) => candidate.id !== student.id);

  const scored = others.map((candidate) => {
    const score = calculateMatchScore(student, candidate);
    return { candidate, score };
  });

  const exactMatches = scored.filter((entry) => entry.score.subject > 0 && entry.score.schedule > 0);
  const partialMatches = scored.filter((entry) => entry.score.overall > 0);
  const pool = exactMatches.length > 0 ? exactMatches : partialMatches;

  pool.sort((left, right) => {
    if (right.score.overall !== left.score.overall) return right.score.overall - left.score.overall;
    return left.candidate.name.localeCompare(right.candidate.name);
  });

  return pool.slice(0, topN).map(({ candidate, score }) => ({
    student: candidate,
    score,
    whyItWorks: buildWhyItWorks(student, candidate),
    potentialChallenges: buildPotentialChallenge(student, candidate),
    recommendedFirstTopic: 'Introduce yourselves and compare your course schedule.',
    bestFormat: 'Direct chat',
    complementaryFactors: getMatchBasis(student, candidate),
  }));
}
