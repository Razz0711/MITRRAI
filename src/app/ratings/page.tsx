// ============================================
// MitrAI - Rate Your Professor (Anonymous)
// Choose Dept → Choose Professor → Rate + Comment
// Shows batch-wise rating stats
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const DEPARTMENTS = [
  'CSE', 'AI', 'Mechanical', 'Civil', 'Electrical', 'Electronics', 'Chemical',
  'Integrated M.Sc. Mathematics', 'Integrated M.Sc. Physics', 'Integrated M.Sc. Chemistry',
  'Mathematics & Computing',
];

interface ProfessorWithStats {
  id: string;
  name: string;
  department: string;
  avgRating: number;
  totalRatings: number;
  batchBreakdown: Record<string, number>;
}

interface AnonymousRating {
  id: string;
  rating: number;
  comment: string;
  batchYear: string;
  department: string;
  createdAt: string;
}

export default function RatingsPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<'dept' | 'prof' | 'detail'>('dept');
  const [selectedDept, setSelectedDept] = useState('');
  const [professors, setProfessors] = useState<ProfessorWithStats[]>([]);
  const [selectedProf, setSelectedProf] = useState<ProfessorWithStats | null>(null);
  const [profRatings, setProfRatings] = useState<AnonymousRating[]>([]);
  const [loading, setLoading] = useState(false);

  // Add professor form
  const [showAddProf, setShowAddProf] = useState(false);
  const [newProfName, setNewProfName] = useState('');
  const [addingProf, setAddingProf] = useState(false);

  // Rate form
  const [showRateForm, setShowRateForm] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<{ rating: number; comment: string } | null>(null);

  // Student info
  const [studentBatchYear, setStudentBatchYear] = useState('');
  const [studentDept, setStudentDept] = useState('');

  useEffect(() => {
    if (!user) return;
    // Load student info for batch year
    fetch('/api/students').then(r => r.json()).then(data => {
      if (data.success) {
        const mine = (data.data as { email?: string; batchYear?: string; department?: string }[]).find(
          s => s.email?.toLowerCase() === user.email?.toLowerCase()
        );
        if (mine) {
          setStudentBatchYear(mine.batchYear || '');
          setStudentDept(mine.department || '');
        }
      }
    }).catch(() => {});
  }, [user]);

  const loadProfessors = async (dept: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ratings?department=${encodeURIComponent(dept)}`);
      const data = await res.json();
      if (data.success) {
        setProfessors(data.data.professors || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const selectDept = (dept: string) => {
    setSelectedDept(dept);
    setStep('prof');
    loadProfessors(dept);
  };

  const selectProfessor = async (prof: ProfessorWithStats) => {
    setSelectedProf(prof);
    setStep('detail');
    setLoading(true);
    try {
      // Load ratings
      const res = await fetch(`/api/ratings?professorId=${prof.id}`);
      const data = await res.json();
      if (data.success) {
        setProfRatings(data.data.ratings || []);
      }
      // Check if user already rated
      if (user) {
        const res2 = await fetch(`/api/ratings?professorId=${prof.id}&userId=${user.id}`);
        const data2 = await res2.json();
        if (data2.success && data2.data.myRating) {
          setExistingRating({ rating: data2.data.myRating.rating, comment: data2.data.myRating.comment });
          setMyRating(data2.data.myRating.rating);
          setMyComment(data2.data.myRating.comment || '');
        } else {
          setExistingRating(null);
          setMyRating(0);
          setMyComment('');
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const addProfessor = async () => {
    if (!newProfName.trim()) return;
    setAddingProf(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addProfessor', name: newProfName.trim(), department: selectedDept }),
      });
      const data = await res.json();
      if (data.success) {
        setNewProfName('');
        setShowAddProf(false);
        loadProfessors(selectedDept);
      }
    } catch { /* ignore */ }
    setAddingProf(false);
  };

  const submitRating = async () => {
    if (!selectedProf || myRating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rate',
          professorId: selectedProf.id,
          rating: myRating,
          comment: myComment,
          batchYear: studentBatchYear,
          department: studentDept,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRateForm(false);
        setExistingRating({ rating: myRating, comment: myComment });
        // Refresh professor data
        selectProfessor(selectedProf);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const goBack = () => {
    if (step === 'detail') {
      setStep('prof');
      setSelectedProf(null);
      setProfRatings([]);
      setShowRateForm(false);
      setExistingRating(null);
    } else if (step === 'prof') {
      setStep('dept');
      setSelectedDept('');
      setProfessors([]);
      setShowAddProf(false);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const s = size === 'lg' ? 'text-2xl' : 'text-sm';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`${s} ${i <= rating ? 'opacity-100' : 'opacity-20'}`}>
            ⭐
          </span>
        ))}
      </div>
    );
  };

  const renderInteractiveStars = () => (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHoveredStar(i)}
          onMouseLeave={() => setHoveredStar(0)}
          onClick={() => setMyRating(i)}
          className={`text-3xl transition-all ${
            i <= (hoveredStar || myRating) ? 'scale-110 opacity-100' : 'opacity-25 hover:opacity-50'
          }`}
        >
          ⭐
        </button>
      ))}
    </div>
  );

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-[var(--muted)] mb-4">Sign in to rate professors</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step !== 'dept' && (
          <button onClick={goBack} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-lg">
            ←
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold">
            <span className="gradient-text">Rate Professor</span> 🎓
          </h1>
          <p className="text-[10px] text-[var(--muted)]">
            {step === 'dept' && 'Choose a department'}
            {step === 'prof' && selectedDept}
            {step === 'detail' && selectedProf?.name}
          </p>
        </div>
      </div>

      {/* ── Step 1: Choose Department ── */}
      {step === 'dept' && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--muted)] mb-3">
            🔒 All ratings are <strong>completely anonymous</strong>. No one can see who rated.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEPARTMENTS.map(dept => (
              <button
                key={dept}
                onClick={() => selectDept(dept)}
                className="card-hover p-3 text-left block"
              >
                <p className="text-xs font-semibold">{dept}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Choose Professor ── */}
      {step === 'prof' && (
        <div>
          {loading ? (
            <LoadingSkeleton type="cards" count={3} label="Loading professors..." />
          ) : (
            <>
              {professors.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-4xl mb-3 block">👨‍🏫</span>
                  <p className="text-sm font-medium mb-1">No professors added yet</p>
                  <p className="text-xs text-[var(--muted)] mb-4">Be the first to add a professor from {selectedDept}</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {professors.map(prof => (
                    <button
                      key={prof.id}
                      onClick={() => selectProfessor(prof)}
                      className="w-full card p-4 text-left hover:border-[var(--primary)]/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{prof.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {prof.totalRatings > 0 ? (
                              <>
                                {renderStars(Math.round(prof.avgRating))}
                                <span className="text-xs text-[var(--muted)]">
                                  {prof.avgRating}/5 · {prof.totalRatings} rating{prof.totalRatings !== 1 ? 's' : ''}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] text-[var(--muted)]">No ratings yet</span>
                            )}
                          </div>
                          {/* Batch breakdown */}
                          {Object.keys(prof.batchBreakdown).length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {Object.entries(prof.batchBreakdown).sort().map(([batch, count]) => (
                                <span
                                  key={batch}
                                  className="text-[9px] bg-[var(--primary)]/10 text-[var(--primary-light)] px-1.5 py-0.5 rounded-full"
                                >
                                  Batch {batch}: {count} student{count !== 1 ? 's' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[var(--muted)] text-xs ml-2">›</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Add Professor */}
              {!showAddProf ? (
                <button
                  onClick={() => setShowAddProf(true)}
                  className="w-full card p-3 text-center text-xs text-[var(--primary-light)] font-medium hover:bg-[var(--primary)]/5 transition-colors"
                >
                  + Add a Professor
                </button>
              ) : (
                <div className="card p-4">
                  <p className="text-xs font-medium mb-2">Add Professor to {selectedDept}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newProfName}
                      onChange={e => setNewProfName(e.target.value)}
                      placeholder="Professor's full name"
                      className="input-field flex-1 text-sm"
                      maxLength={100}
                      onKeyDown={e => e.key === 'Enter' && addProfessor()}
                    />
                    <button
                      onClick={addProfessor}
                      disabled={!newProfName.trim() || addingProf}
                      className="btn-primary text-xs px-3"
                    >
                      {addingProf ? '...' : 'Add'}
                    </button>
                  </div>
                  <button
                    onClick={() => { setShowAddProf(false); setNewProfName(''); }}
                    className="text-[10px] text-[var(--muted)] mt-2 hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Professor Detail + Ratings ── */}
      {step === 'detail' && selectedProf && (
        <div>
          {loading ? (
            <LoadingSkeleton type="cards" count={3} label="Loading ratings..." />
          ) : (
            <>
              {/* Professor Header Card */}
              <div className="card p-5 mb-4 text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-lg shadow-[var(--primary)]/20">
                  {selectedProf.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-base font-bold">{selectedProf.name}</h2>
                <p className="text-[11px] text-[var(--muted)]">{selectedProf.department}</p>

                {selectedProf.totalRatings > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-center gap-2">
                      {renderStars(Math.round(selectedProf.avgRating), 'lg')}
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {selectedProf.avgRating}/5 from {selectedProf.totalRatings} student{selectedProf.totalRatings !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {/* Batch Breakdown */}
                {Object.keys(selectedProf.batchBreakdown).length > 0 && (
                  <div className="flex gap-2 justify-center flex-wrap mt-3 pt-3 border-t border-[var(--border)]">
                    {Object.entries(selectedProf.batchBreakdown).sort().map(([batch, count]) => (
                      <div key={batch} className="text-center">
                        <p className="text-sm font-bold">{count}</p>
                        <p className="text-[9px] text-[var(--muted)]">Batch &apos;{batch}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rate Button / Existing Rating */}
              {!showRateForm && (
                <button
                  onClick={() => setShowRateForm(true)}
                  className="w-full btn-primary mb-4 text-sm"
                >
                  {existingRating ? '✏️ Update Your Rating' : '⭐ Rate This Professor'}
                </button>
              )}

              {/* Rate Form */}
              {showRateForm && (
                <div className="card p-5 mb-4">
                  <p className="text-sm font-semibold mb-1 text-center">
                    {existingRating ? 'Update your rating' : 'Rate anonymously'}
                  </p>
                  <p className="text-[10px] text-[var(--muted)] text-center mb-4">
                    🔒 Your identity is never revealed
                  </p>

                  {/* Stars */}
                  <div className="mb-4">
                    {renderInteractiveStars()}
                    {myRating > 0 && (
                      <p className="text-center text-xs text-[var(--muted)] mt-1">
                        {myRating === 1 && 'Poor'}
                        {myRating === 2 && 'Below Average'}
                        {myRating === 3 && 'Average'}
                        {myRating === 4 && 'Good'}
                        {myRating === 5 && 'Excellent'}
                      </p>
                    )}
                  </div>

                  {/* Comment */}
                  <textarea
                    value={myComment}
                    onChange={e => setMyComment(e.target.value)}
                    placeholder="Share your experience (optional)..."
                    className="input-field w-full text-sm resize-none mb-3"
                    rows={3}
                    maxLength={500}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRateForm(false)}
                      className="btn-secondary flex-1 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitRating}
                      disabled={myRating === 0 || submitting}
                      className="btn-primary flex-1 text-xs"
                    >
                      {submitting ? 'Submitting...' : existingRating ? 'Update' : 'Submit'}
                    </button>
                  </div>
                </div>
              )}

              {/* Ratings List */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Reviews</h3>
                  <span className="text-[10px] text-[var(--muted)]">{profRatings.length} review{profRatings.length !== 1 ? 's' : ''}</span>
                </div>

                {profRatings.length === 0 ? (
                  <div className="card p-6 text-center">
                    <span className="text-3xl mb-2 block">💬</span>
                    <p className="text-xs text-[var(--muted)]">No reviews yet. Be the first!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profRatings.map(r => (
                      <div key={r.id} className="card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--surface-light)] flex items-center justify-center text-[10px]">
                              🕵️
                            </div>
                            <span className="text-[10px] text-[var(--muted)]">
                              Anonymous
                              {r.batchYear ? ` · Batch '${r.batchYear}` : ''}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--muted)]">{timeAgo(r.createdAt)}</span>
                        </div>
                        {renderStars(r.rating)}
                        {r.comment && (
                          <p className="text-xs text-[var(--foreground)] mt-2 leading-relaxed">{r.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
