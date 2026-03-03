// ============================================
// MitrAI - Rate Your Professor (Anonymous)
// Search / Browse → Professor Profile → Multi-factor Rating
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const DEPARTMENTS = [
  'Mathematics', 'Computer Science', 'Artificial Intelligence', 'Mechanical', 'Civil Engineering', 'Electrical',
  'Electronics', 'Chemical', 'Physics', 'Chemistry',
];

const FACTORS = [
  { key: 'teaching', label: 'Teaching', icon: '📚', desc: 'Explanation & clarity' },
  { key: 'grading', label: 'Grading', icon: '📝', desc: 'Fairness & leniency' },
  { key: 'friendliness', label: 'Friendly', icon: '🤝', desc: 'Approachability' },
  { key: 'material', label: 'Material', icon: '📖', desc: 'Notes, slides, assignments' },
] as const;

type FactorKey = typeof FACTORS[number]['key'];

interface ProfessorWithStats {
  id: string; name: string; department: string; designation: string;
  avgTeaching: number; avgGrading: number; avgFriendliness: number; avgMaterial: number;
  avgOverall: number; totalRatings: number; batchBreakdown: Record<string, number>;
}

interface AnonymousRating {
  id: string; teaching: number; grading: number; friendliness: number; material: number;
  comment: string; batchYear: string; department: string; createdAt: string;
}

export default function RatingsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<'browse' | 'detail'>('browse');
  const [selectedDept, setSelectedDept] = useState('Mathematics');
  const [search, setSearch] = useState('');
  const [professors, setProfessors] = useState<ProfessorWithStats[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail view
  const [selectedProf, setSelectedProf] = useState<ProfessorWithStats | null>(null);
  const [profRatings, setProfRatings] = useState<AnonymousRating[]>([]);

  // Add professor
  const [showAddProf, setShowAddProf] = useState(false);
  const [newProfName, setNewProfName] = useState('');
  const [newProfDesig, setNewProfDesig] = useState('');
  const [addingProf, setAddingProf] = useState(false);

  // Rate form
  const [showRateForm, setShowRateForm] = useState(false);
  const [ratings, setRatings] = useState<Record<FactorKey, number>>({ teaching: 0, grading: 0, friendliness: 0, material: 0 });
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<Record<FactorKey, number> | null>(null);

  // Student info
  const [studentBatchYear, setStudentBatchYear] = useState('');
  const [studentDept, setStudentDept] = useState('');

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user) return;
    fetch('/api/students').then(r => r.json()).then(data => {
      if (data.success) {
        const mine = (data.data as { email?: string; batchYear?: string; department?: string }[]).find(
          s => s.email?.toLowerCase() === user.email?.toLowerCase()
        );
        if (mine) { setStudentBatchYear(mine.batchYear || ''); setStudentDept(mine.department || ''); }
      }
    }).catch(() => {});
  }, [user]);

  const loadProfessors = useCallback(async (dept: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ratings?department=${encodeURIComponent(dept)}`);
      const data = await res.json();
      if (data.success) setProfessors(data.data.professors || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { loadProfessors(selectedDept); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/ratings?search=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (data.success) setProfessors(data.data.professors || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedDept, loadProfessors]);

  useEffect(() => { if (view === 'browse') loadProfessors(selectedDept); }, [selectedDept, view, loadProfessors]);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(val), 400);
  };

  const selectProfessor = async (prof: ProfessorWithStats) => {
    setSelectedProf(prof);
    setView('detail');
    setLoading(true);
    try {
      const res = await fetch(`/api/ratings?professorId=${prof.id}`);
      const data = await res.json();
      if (data.success) setProfRatings(data.data.ratings || []);
      if (user) {
        const res2 = await fetch(`/api/ratings?professorId=${prof.id}&userId=${user.id}`);
        const data2 = await res2.json();
        if (data2.success && data2.data.myRating) {
          const m = data2.data.myRating;
          setExistingRating({ teaching: m.teaching, grading: m.grading, friendliness: m.friendliness, material: m.material });
          setRatings({ teaching: m.teaching, grading: m.grading, friendliness: m.friendliness, material: m.material });
          setMyComment(m.comment || '');
        } else {
          setExistingRating(null);
          setRatings({ teaching: 0, grading: 0, friendliness: 0, material: 0 });
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addProfessor', name: newProfName.trim(), department: selectedDept, designation: newProfDesig.trim() }),
      });
      const data = await res.json();
      if (data.success) { setNewProfName(''); setNewProfDesig(''); setShowAddProf(false); loadProfessors(selectedDept); }
    } catch { /* ignore */ }
    setAddingProf(false);
  };

  const handleSubmitRating = async () => {
    if (!selectedProf || Object.values(ratings).some(v => v === 0)) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rate', professorId: selectedProf.id,
          ...ratings, comment: myComment, batchYear: studentBatchYear, department: studentDept,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRateForm(false);
        setExistingRating({ ...ratings });
        selectProfessor(selectedProf);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const goBack = () => {
    setView('browse');
    setSelectedProf(null);
    setProfRatings([]);
    setShowRateForm(false);
    setExistingRating(null);
  };

  const factorAvg = (r: AnonymousRating) => Math.round(((r.teaching + r.grading + r.friendliness + r.material) / 4) * 10) / 10;

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`;
  };

  const RatingBar = ({ value, label, icon }: { value: number; label: string; icon: string }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm w-5">{icon}</span>
      <span className="text-[11px] text-[var(--muted)] w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-500"
          style={{ width: value > 0 ? `${(value / 5) * 100}%` : '0%' }}
        />
      </div>
      <span className="text-xs font-semibold w-7 text-right">{value > 0 ? value.toFixed(1) : '—'}</span>
    </div>
  );

  const StarInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)}
          className={`text-lg transition-all ${i <= value ? 'scale-110 opacity-100' : 'opacity-20 hover:opacity-50'}`}>⭐</button>
      ))}
    </div>
  );

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-[var(--muted)] mb-4">Sign in to rate professors</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  // ── BROWSE VIEW ──
  if (view === 'browse') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold"><span className="gradient-text">Rate Professor</span> 🎓</h1>
          <p className="text-[10px] text-[var(--muted)]">🔒 All ratings are completely anonymous</p>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">🔍</span>
          <input
            type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search professor by name..."
            className="input-field w-full pl-9 text-sm"
          />
          {search && (
            <button onClick={() => { setSearch(''); loadProfessors(selectedDept); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs">✕</button>
          )}
        </div>

        {/* Dept pills */}
        {!search && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
            {DEPARTMENTS.map(dept => (
              <button key={dept} onClick={() => setSelectedDept(dept)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedDept === dept
                    ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20'
                    : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}>{dept}</button>
            ))}
          </div>
        )}

        {/* Professor List */}
        {loading ? (
          <LoadingSkeleton type="cards" count={4} label="Loading professors..." />
        ) : professors.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl mb-3 block">👨‍🏫</span>
            <p className="text-sm font-medium mb-1">{search ? 'No professors found' : 'No professors added yet'}</p>
            <p className="text-xs text-[var(--muted)]">{search ? 'Try a different name' : `Be the first to add a professor in ${selectedDept}`}</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {professors.map(prof => (
              <button key={prof.id} onClick={() => selectProfessor(prof)}
                className="w-full card p-4 text-left hover:border-[var(--primary)]/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md shadow-[var(--primary)]/20">
                    {prof.name.replace(/^Dr\.\s*/i, '').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{prof.name}</p>
                    {prof.designation && (
                      <p className="text-[10px] text-[var(--muted)] truncate">{prof.designation}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {prof.totalRatings > 0 ? (
                        <>
                          <span className="text-xs">⭐ {prof.avgOverall}/5</span>
                          <span className="text-[10px] text-[var(--muted)]">
                            · {prof.totalRatings} rating{prof.totalRatings !== 1 ? 's' : ''}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-[var(--muted)]">No ratings yet</span>
                      )}
                    </div>
                    {Object.keys(prof.batchBreakdown).length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {Object.entries(prof.batchBreakdown).sort().map(([batch, count]) => (
                          <span key={batch} className="text-[9px] bg-[var(--primary)]/10 text-[var(--primary-light)] px-1.5 py-0.5 rounded-full">
                            &apos;{batch}: {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[var(--muted)] text-xs ml-1">›</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Add Professor */}
        {!search && (
          <>
            {!showAddProf ? (
              <button onClick={() => setShowAddProf(true)}
                className="w-full card p-3 text-center text-xs text-[var(--primary-light)] font-medium hover:bg-[var(--primary)]/5 transition-colors">
                + Add a Professor
              </button>
            ) : (
              <div className="card p-4">
                <p className="text-xs font-medium mb-2">Add Professor to {selectedDept}</p>
                <input type="text" value={newProfName} onChange={e => setNewProfName(e.target.value)}
                  placeholder="Professor's full name" className="input-field w-full text-sm mb-2" maxLength={100} />
                <input type="text" value={newProfDesig} onChange={e => setNewProfDesig(e.target.value)}
                  placeholder="Designation (e.g. Assistant Professor)" className="input-field w-full text-sm mb-2" maxLength={80} />
                <div className="flex gap-2">
                  <button onClick={() => { setShowAddProf(false); setNewProfName(''); setNewProfDesig(''); }}
                    className="btn-secondary flex-1 text-xs">Cancel</button>
                  <button onClick={addProfessor} disabled={!newProfName.trim() || addingProf}
                    className="btn-primary flex-1 text-xs">{addingProf ? '...' : 'Add'}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── DETAIL VIEW ──
  if (view === 'detail' && selectedProf) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBack} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-lg">←</button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold truncate">{selectedProf.name}</h1>
            <p className="text-[10px] text-[var(--muted)] truncate">{selectedProf.designation} · {selectedProf.department}</p>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton type="cards" count={3} label="Loading..." />
        ) : (
          <>
            {/* Profile Card */}
            <div className="card p-5 mb-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-lg shadow-[var(--primary)]/20">
                {selectedProf.name.replace(/^Dr\.\s*/i, '').charAt(0)}
              </div>
              <h2 className="text-base font-bold">{selectedProf.name}</h2>
              <p className="text-[11px] text-[var(--muted)]">{selectedProf.designation}</p>

              {selectedProf.totalRatings > 0 && (
                <div className="mt-3">
                  <p className="text-2xl font-bold">{selectedProf.avgOverall}<span className="text-sm font-normal text-[var(--muted)]">/5</span></p>
                  <p className="text-[10px] text-[var(--muted)]">
                    from {selectedProf.totalRatings} student{selectedProf.totalRatings !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Batch Breakdown */}
              {Object.keys(selectedProf.batchBreakdown).length > 0 && (
                <div className="flex gap-3 justify-center flex-wrap mt-3 pt-3 border-t border-[var(--border)]">
                  {Object.entries(selectedProf.batchBreakdown).sort().map(([batch, count]) => (
                    <div key={batch} className="text-center">
                      <p className="text-sm font-bold">{count}</p>
                      <p className="text-[9px] text-[var(--muted)]">Batch &apos;{batch}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Factor Breakdown */}
            {selectedProf.totalRatings > 0 && (
              <div className="card p-4 mb-4 space-y-2.5">
                <p className="text-xs font-semibold mb-1">Rating Breakdown</p>
                <RatingBar value={selectedProf.avgTeaching} label="Teaching" icon="📚" />
                <RatingBar value={selectedProf.avgGrading} label="Grading" icon="📝" />
                <RatingBar value={selectedProf.avgFriendliness} label="Friendly" icon="🤝" />
                <RatingBar value={selectedProf.avgMaterial} label="Material" icon="📖" />
              </div>
            )}

            {/* Rate Button */}
            {!showRateForm && (
              <button onClick={() => setShowRateForm(true)} className="w-full btn-primary mb-4 text-sm">
                {existingRating ? '✏️ Update Your Rating' : '⭐ Rate This Professor'}
              </button>
            )}

            {/* Rate Form */}
            {showRateForm && (
              <div className="card p-5 mb-4">
                <p className="text-sm font-semibold mb-1 text-center">
                  {existingRating ? 'Update your rating' : 'Rate anonymously'}
                </p>
                <p className="text-[10px] text-[var(--muted)] text-center mb-4">🔒 Your identity is never revealed</p>

                <div className="space-y-3 mb-4">
                  {FACTORS.map(f => (
                    <div key={f.key} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm">{f.icon}</span>
                        <span className="text-xs font-medium ml-1.5">{f.label}</span>
                        <span className="text-[10px] text-[var(--muted)] ml-1">({f.desc})</span>
                      </div>
                      <StarInput value={ratings[f.key]} onChange={v => setRatings(prev => ({ ...prev, [f.key]: v }))} />
                    </div>
                  ))}
                </div>

                <textarea value={myComment} onChange={e => setMyComment(e.target.value)}
                  placeholder="Share your experience (optional)..."
                  className="input-field w-full text-sm resize-none mb-3" rows={3} maxLength={500} />

                <div className="flex gap-2">
                  <button onClick={() => setShowRateForm(false)} className="btn-secondary flex-1 text-xs">Cancel</button>
                  <button onClick={handleSubmitRating}
                    disabled={Object.values(ratings).some(v => v === 0) || submitting}
                    className="btn-primary flex-1 text-xs">
                    {submitting ? 'Submitting...' : existingRating ? 'Update' : 'Submit'}
                  </button>
                </div>
              </div>
            )}

            {/* Reviews List */}
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
                          <div className="w-6 h-6 rounded-full bg-[var(--surface-light)] flex items-center justify-center text-[10px]">🕵️</div>
                          <span className="text-[10px] text-[var(--muted)]">
                            Anonymous{r.batchYear ? ` · Batch '${r.batchYear}` : ''}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--muted)]">{timeAgo(r.createdAt)}</span>
                      </div>
                      {/* Mini factor row */}
                      <div className="flex gap-2 flex-wrap mb-1">
                        <span className="text-[10px] text-[var(--muted)]">📚{r.teaching}</span>
                        <span className="text-[10px] text-[var(--muted)]">📝{r.grading}</span>
                        <span className="text-[10px] text-[var(--muted)]">🤝{r.friendliness}</span>
                        <span className="text-[10px] text-[var(--muted)]">📖{r.material}</span>
                        <span className="text-[10px] font-semibold">⭐{factorAvg(r)}</span>
                      </div>
                      {r.comment && (
                        <p className="text-xs text-[var(--foreground)] mt-1.5 leading-relaxed">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
