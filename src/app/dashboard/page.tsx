// ============================================
// MitrAI - Dashboard Page (with Birthday, Status, Notifications)
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { StudentProfile, Day, BirthdayInfo, UserStatus, Notification as NotifType } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import BirthdayBanner, { UpcomingBirthdays } from '@/components/BirthdayBanner';
import { StatusDot } from '@/components/StatusIndicator';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function DashboardPage() {
  const { user } = useAuth();
  const { play: playSound } = useNotificationSound();
  const { permission, requestPermission, showNotification } = usePushNotifications();
  const prevUnreadRef = useRef<number>(0);
  const prevNotifIdsRef = useRef<Set<string>>(new Set());
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [myProfiles, setMyProfiles] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Birthday state
  const [birthdays, setBirthdays] = useState<BirthdayInfo[]>([]);
  const [wishedMap, setWishedMap] = useState<Record<string, boolean>>({});

  // Status & Notifications
  const [myStatus, setMyStatus] = useState<UserStatus | null>(null);
  const [notifications, setNotifications] = useState<NotifType[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  // Privacy: goals hidden by default
  const [showGoals, setShowGoals] = useState(false);

  // Delete profile
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Invite
  const [inviteCopied, setInviteCopied] = useState(false);

  // Study streak (from sessions)
  const [studyStreak, setStudyStreak] = useState(0);

  // Gamification
  const [xp, setXp] = useState<{ totalXp: number; level: string; currentStreak: number; longestStreak: number } | null>(null);
  const [badges, setBadges] = useState<{ badgeId: string; badgeName: string; badgeEmoji: string; earnedAt: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Load birthdays from server (DOBs are stored in students table)
  const loadBirthdays = useCallback(async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({ days: '7', userId: user.id });
      const res = await fetch(`/api/birthday?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBirthdays(data.data.birthdays || []);
        setWishedMap(data.data.wishedMap || {});
      }
    } catch (err) { console.error('loadBirthdays:', err); }
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        const notifs: NotifType[] = data.data || [];
        const newUnread = notifs.filter(n => !n.read).length;
        // 🔊 Play sound when new unread notifications arrive
        if (newUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
          playSound('important');
        }
        // 📱 Show native push notification for genuinely new items
        const newItems = notifs.filter(n => !n.read && !prevNotifIdsRef.current.has(n.id));
        if (newItems.length > 0 && prevNotifIdsRef.current.size > 0) {
          // Show the most recent new notification as a pop-up
          const latest = newItems[0];
          showNotification(
            latest.title,
            latest.message,
            { tag: `notif-${latest.id}` }
          );
        }
        // Track seen notification IDs
        prevNotifIdsRef.current = new Set(notifs.map(n => n.id));
        prevUnreadRef.current = newUnread;
        setNotifications(notifs);
      }
    } catch (err) { console.error('loadNotifications:', err); }
  }, [user, playSound, showNotification]);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/status?userId=${user.id}`);
      const data = await res.json();
      if (data.success) setMyStatus(data.data);
    } catch (err) { console.error('loadStatus:', err); }
  }, [user]);

  useEffect(() => {
    if (user) { loadBirthdays(); loadNotifications(); loadStatus(); }
  }, [user, loadBirthdays, loadNotifications, loadStatus]);

  // Request notification permission on first user interaction
  useEffect(() => {
    if (!user || permission !== 'default') return;
    // Auto-request after a brief delay (better UX than on page load)
    const timer = setTimeout(() => requestPermission(), 2000);
    return () => clearTimeout(timer);
  }, [user, permission, requestPermission]);

  // Poll for new notifications every 30s so user gets pop-ups even without refresh
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadNotifications, 30_000);
    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  // Re-fetch birthdays when the date changes (e.g., user stays on page past midnight)
  useEffect(() => {
    if (!user) return;
    let lastDate = new Date().toDateString();
    const dateCheck = setInterval(() => {
      const now = new Date().toDateString();
      if (now !== lastDate) {
        lastDate = now;
        loadBirthdays(); // Re-fetch from server so isToday is recalculated
      }
    }, 60_000); // check every minute
    return () => clearInterval(dateCheck);
  }, [user, loadBirthdays]);

  // Load gamification data
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch(`/api/gamification?userId=${user.id}`);
        const data = await res.json();
        if (data.success) {
          setXp(data.data.xp);
          setBadges(data.data.badges || []);
        }
      } catch (err) { console.error('loadGamification:', err); }
    })();
  }, [user]);

  // Calculate study streak from localStorage activity
  useEffect(() => {
    try {
      const streakData = JSON.parse(localStorage.getItem('mitrai_study_streak') || '{"dates":[],"streak":0}');
      const today = new Date().toISOString().slice(0, 10);
      const dates: string[] = streakData.dates || [];
      
      if (!dates.includes(today)) {
        // Auto-mark today as active since user visited dashboard
        dates.push(today);
      }
      
      // Calculate streak: consecutive days ending at today
      let streak = 0;
      let checkDate = new Date();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const dateStr = checkDate.toISOString().slice(0, 10);
        if (dates.includes(dateStr)) {
          streak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
          break;
        }
      }
      
      setStudyStreak(streak);
      localStorage.setItem('mitrai_study_streak', JSON.stringify({ dates: dates.slice(-30), streak }));
    } catch (err) { console.error('studyStreak:', err); setStudyStreak(1); }
  }, []);

  const getInviteLink = () => {
    const admNo = student?.admissionNumber || user?.id?.slice(0, 6) || 'svnit';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mitrai-study.vercel.app';
    return `${origin}/login?ref=${admNo}`;
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(getInviteLink());
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const link = getInviteLink();
    const msg = encodeURIComponent(`Hey! Join MitrAI — find study buddies at SVNIT 🎓\n${link}\nMade by students, for students!`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const loadData = async () => {
    try {
      const savedId = localStorage.getItem('mitrai_student_id');

      const res = await fetch('/api/students');
      const data = await res.json();

      if (data.success) {
        // Filter to only show the current user's own profiles
        const userEmail = user?.email?.toLowerCase() || '';
        const mine = (data.data as StudentProfile[]).filter(
          (s: StudentProfile) => s.email && s.email.toLowerCase() === userEmail
        );
        setMyProfiles(mine);

        if (savedId) {
          const found = mine.find((s: StudentProfile) => s.id === savedId);
          if (found) {
            setStudent(found);
            setSelectedStudentId(found.id);
          }
        }

        // If no saved student, use first of user's own profiles
        if (!savedId && mine.length > 0) {
          setStudent(mine[0]);
          setSelectedStudentId(mine[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (id: string) => {
    const found = myProfiles.find(s => s.id === id);
    if (found) {
      setStudent(found);
      setSelectedStudentId(id);
      localStorage.setItem('mitrai_student_id', id);
      localStorage.setItem('mitrai_student_name', found.name);
    }
  };

  const handleWish = async (toUserId: string, toUserName: string) => {
    if (!user) return;
    try {
      await fetch('/api/birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: user.id, fromUserName: user.name, toUserId, toUserName }),
      });
    } catch (err) { console.error('handleWish:', err); }
  };

  const handleMarkNotifRead = async (notifId: string) => {
    if (!user) return;
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, notificationId: notifId }),
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch (err) { console.error('markNotifRead:', err); }
  };

  const handleDeleteProfile = async () => {
    if (!student) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/students?id=${student.id}&email=${encodeURIComponent(user?.email || '')}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        // Remove from local state
        setMyProfiles(prev => prev.filter(s => s.id !== student.id));
        localStorage.removeItem('mitrai_student_id');
        localStorage.removeItem('mitrai_student_name');
        // Select next profile or null
        const remaining = myProfiles.filter(s => s.id !== student.id);
        if (remaining.length > 0) {
          setStudent(remaining[0]);
          setSelectedStudentId(remaining[0].id);
          localStorage.setItem('mitrai_student_id', remaining[0].id);
        } else {
          setStudent(null);
          setSelectedStudentId('');
        }
        setShowDeleteConfirm(false);
      }
    } catch (err) { console.error('handleDeleteProfile:', err); }
    setDeleting(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <LoadingSkeleton type="stats" count={4} label="Loading dashboard..." />
        <div className="mt-6">
          <LoadingSkeleton type="cards" count={3} label="" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">
              Welcome back, <span className="gradient-text">{student?.name || user?.name || 'Student'}</span>
            </h1>
            {myStatus && <StatusDot status={myStatus.status} size="md" />}
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">Your study overview</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-sm">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-10 w-72 max-h-80 overflow-y-auto card p-2 z-50 shadow-xl fade-in">
                <p className="text-xs font-semibold px-2 py-1.5 border-b border-[var(--border)]">Notifications</p>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[var(--muted)] p-3 text-center">No notifications yet</p>
                ) : (
                  notifications.slice(0, 15).map(n => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && handleMarkNotifRead(n.id)}
                      className={`p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        n.read ? 'opacity-60' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <p className="font-medium">{n.title}</p>
                      <p className="text-[var(--muted)] text-[10px] mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <select
            value={selectedStudentId}
            onChange={(e) => handleStudentSelect(e.target.value)}
            className="input-field text-xs w-36 sm:w-40 truncate"
          >
            {myProfiles.map(s => (
              <option key={s.id} value={s.id}>{s.name} — {s.targetExam || 'Profile'}</option>
            ))}
          </select>
          <Link href="/onboarding" className="btn-primary text-xs">
            + New
          </Link>
        </div>
      </div>

      {/* Birthday Banner */}
      {user && (
        <BirthdayBanner
          birthdays={birthdays}
          currentUserId={user.id}
          wishedMap={wishedMap}
          onWish={handleWish}
        />
      )}

      {/* Notification Permission Prompt */}
      {permission === 'default' && (
        <div className="card p-3 mb-4 flex items-center justify-between gap-3 border-amber-500/20 fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🔔</span>
            <p className="text-xs text-[var(--muted)]">Enable push notifications so you never miss a match, message, or session</p>
          </div>
          <button onClick={requestPermission} className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap flex-shrink-0">
            Enable
          </button>
        </div>
      )}

      {student ? (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <StatCard label="Target Exam" value={student.targetExam} color="primary" />
            <StatCard label="Studying" value={student.currentStudy || 'Not set'} color="secondary" />
            <StatCard label="Daily Target" value={`${student.studyHoursTarget}h`} color="success" />
            <StatCard label="Sessions/Week" value={`${student.sessionsPerWeek}`} color="accent" />
            <StatCard label={`🔥 ${studyStreak} Day Streak`} value={studyStreak >= 7 ? '🏆 On Fire!' : studyStreak >= 3 ? '💪 Going!' : '🌱 Start'} color="primary" />
          </div>

          {/* XP & Badges Widget */}
          {xp && (
            <div className="card p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {xp.level?.charAt(0) || 'B'}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{xp.level || 'Beginner'}</p>
                    <p className="text-[10px] text-[var(--muted)]">{xp.totalXp || 0} XP earned</p>
                  </div>
                </div>
                <Link href="/circles" className="text-xs text-[var(--primary-light)] hover:underline">
                  View Circles →
                </Link>
              </div>
              {/* XP Progress Bar */}
              <div className="w-full h-2 rounded-full bg-white/10 mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, ((xp.totalXp || 0) % 500) / 5)}%` }}
                />
              </div>
              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {badges.map((b) => (
                    <span
                      key={b.badgeId}
                      title={b.badgeName}
                      className="inline-flex items-center gap-1 text-xs bg-white/5 border border-[var(--border)] rounded-full px-2.5 py-1"
                    >
                      {b.badgeEmoji} {b.badgeName}
                    </span>
                  ))}
                </div>
              )}
              {badges.length === 0 && (
                <p className="text-[10px] text-[var(--muted)]">Complete actions to earn badges!</p>
              )}
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Profile Card */}
            <div className="card p-4">
              <h2 className="text-sm font-semibold mb-3">Profile</h2>
              <div className="space-y-3">
                <ProfileRow label="Name" value={student.name} />
                {student.admissionNumber && <ProfileRow label="Admission No." value={student.admissionNumber} />}
                <ProfileRow label="Department" value={student.department || 'Not set'} />
                <ProfileRow label="Study" value={student.currentStudy} />
                <ProfileRow label="Year" value={student.yearLevel} />
                <ProfileRow label="Institution" value={student.institution || 'SVNIT Surat'} />
                <ProfileRow label="Location" value={`${student.city}, ${student.country}`} />
                {student.targetDate && <ProfileRow label="Exam Date" value={student.targetDate} />}
              </div>

              {/* Current Status */}
              {myStatus && (
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <h3 className="text-xs font-semibold text-[var(--muted)] mb-2">Current Status</h3>
                  <StatusDot status={myStatus.status} showLabel currentSubject={myStatus.currentSubject} lastSeen={myStatus.lastSeen} size="md" />
                  <p className="text-[10px] text-[var(--muted)] mt-2">
                    Free: {student.availableTimes} on {student.availableDays.map(d => d.slice(0, 3)).join(', ')}
                  </p>
                </div>
              )}

              {/* Delete Profile */}
              <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
                <button
                  onClick={() => {
                    if (user) window.open(`/api/export?userId=${user.id}`, '_blank');
                  }}
                  className="w-full text-xs text-[var(--primary-light)] hover:bg-[var(--primary)]/10 rounded-lg py-2 transition-colors"
                >
                  📦 Export My Data (GDPR)
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg py-2 transition-colors"
                >
                  🗑️ Delete This Profile
                </button>
              </div>
            </div>

            {/* Subjects Card */}
            <div className="card p-4">
              <h2 className="text-sm font-semibold mb-3">Subjects</h2>

              <div className="mb-3">
                <p className="text-[10px] text-[var(--muted)] mb-1.5 uppercase tracking-wide">Strong</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.strongSubjects.map(s => (
                    <span key={s} className="badge-success text-xs">{s}</span>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <p className="text-[10px] text-[var(--muted)] mb-1.5 uppercase tracking-wide">Needs Work</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.weakSubjects.map(s => (
                    <span key={s} className="badge-warning text-xs">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-[var(--muted)] mb-1.5 uppercase tracking-wide">Methods</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.studyMethod.map(m => (
                    <span key={m} className="badge-primary text-xs">{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Goals Card — Private by default */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Goals</h2>
                <button
                  onClick={() => setShowGoals(!showGoals)}
                  className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  title={showGoals ? 'Hide goals (private)' : 'Show goals'}
                >
                  <span>{showGoals ? '🔓' : '🔒'}</span>
                  <span>{showGoals ? 'Visible' : 'Private'}</span>
                </button>
              </div>

              {showGoals ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                    <p className="text-xs text-[var(--primary-light)] mb-1">Short Term</p>
                    <p className="text-sm font-medium">{student.shortTermGoal || 'Not set'}</p>
                  </div>
                  {student.longTermGoal && (
                    <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20">
                      <p className="text-xs text-[var(--secondary)] mb-1">Long Term</p>
                      <p className="text-sm font-medium">{student.longTermGoal}</p>
                    </div>
                  )}
                  {student.weeklyGoals && (
                    <div className="p-3 rounded-xl bg-white/5">
                      <p className="text-xs text-[var(--muted)] mb-1">Weekly Goals</p>
                      <p className="text-sm font-medium">{student.weeklyGoals}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="text-2xl mb-2 block">🔒</span>
                  <p className="text-xs text-[var(--muted)]">Your goals are private</p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">Tap the lock to view them</p>
                </div>
              )}
            </div>

            {/* Upcoming Birthdays Widget */}
            {user && <UpcomingBirthdays birthdays={birthdays} currentUserId={user.id} />}
          </div>

          {/* Schedule & Study Style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="card p-4">
              <h2 className="text-sm font-semibold mb-3">Schedule</h2>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const fullDays: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                  const isAvailable = student.availableDays.includes(fullDays[i]);
                  return (
                    <div
                      key={day}
                      className={`text-center py-2 rounded-lg text-xs font-medium ${
                        isAvailable
                          ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30'
                          : 'bg-white/5 text-[var(--muted)]'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <ProfileRow label="Time" value={student.availableTimes} />
                <ProfileRow label="Sessions/Week" value={`${student.sessionsPerWeek}`} />
                <ProfileRow label="Session Type" value={student.sessionType} />
              </div>
            </div>

            <div className="card p-4">
              <h2 className="text-sm font-semibold mb-3">Study Style</h2>
              <div className="space-y-2">
                <ProfileRow label="Learning Type" value={student.learningType} />
                <ProfileRow label="Session Length" value={student.sessionLength} />
                <ProfileRow label="Break Pattern" value={student.breakPattern} />
                <ProfileRow label="Pace" value={student.pace} />
                <ProfileRow label="Study Style" value={student.studyStyle} />
                <ProfileRow label="Communication" value={student.communication} />
                <ProfileRow label="Teaching" value={student.teachingAbility} />
                <ProfileRow label="Accountability" value={student.accountabilityNeed} />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <Link href="/matches" className="card-hover p-4 text-center block">
              <h3 className="text-sm font-semibold mb-1">Find Matches</h3>
              <p className="text-xs text-[var(--muted)]">Discover study buddies</p>
            </Link>
            <Link href="/rooms" className="card-hover p-4 text-center block">
              <h3 className="text-sm font-semibold mb-1">📚 Study Rooms</h3>
              <p className="text-xs text-[var(--muted)]">Collaborate in groups</p>
            </Link>
            <Link href="/doubts" className="card-hover p-4 text-center block">
              <h3 className="text-sm font-semibold mb-1">❓ Doubts</h3>
              <p className="text-xs text-[var(--muted)]">Ask anonymously</p>
            </Link>
            <Link href="/circles" className="card-hover p-4 text-center block">
              <h3 className="text-sm font-semibold mb-1">⭕ Circles</h3>
              <p className="text-xs text-[var(--muted)]">Interest groups</p>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <Link href="/friends" className="card-hover p-4 text-center block">
              <h3 className="text-sm font-semibold mb-1">Friends</h3>
              <p className="text-xs text-[var(--muted)]">Your buddy network</p>
            </Link>
            <Link href="/subscription" className="card-hover p-4 text-center block border-amber-500/20">
              <h3 className="text-sm font-semibold mb-1">✨ Pro</h3>
              <p className="text-xs text-amber-400">Free during launch!</p>
            </Link>
            <Link href="/analytics" className="card-hover p-4 text-center block">
              <h3 className="text-sm font-semibold mb-1">📊 Analytics</h3>
              <p className="text-xs text-[var(--muted)]">Study insights</p>
            </Link>
          </div>

          {/* Invite Batchmates */}
          <div className="card p-4 mt-4 border-[var(--primary)]/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📤</span>
              <h2 className="text-sm font-semibold">Invite your batchmates</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 bg-[var(--surface)] rounded-lg px-3 py-2 text-xs text-[var(--muted)] truncate border border-[var(--border)]">
                {getInviteLink()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyInviteLink}
                  className="btn-secondary text-xs px-3 py-2 whitespace-nowrap"
                >
                  {inviteCopied ? '✅ Copied!' : '📋 Copy'}
                </button>
                <button
                  onClick={shareOnWhatsApp}
                  className="text-xs px-3 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  📱 WhatsApp
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-lg font-bold mb-2">No Profile Yet</h2>
          <p className="text-xs text-[var(--muted)] mb-4">Complete onboarding to set up your study profile</p>
          <Link href="/onboarding" className="btn-primary text-sm">
            Start Onboarding
          </Link>
        </div>
      )}

      {/* Delete Profile Confirmation Modal */}
      {showDeleteConfirm && student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="card p-6 w-full max-w-sm slide-up">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <h2 className="text-lg font-bold text-red-400">Delete Profile?</h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                This will permanently delete your <strong>{student.targetExam}</strong> profile. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1 text-xs"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProfile}
                disabled={deleting}
                className="flex-1 text-xs py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    primary: 'border-[var(--primary)]/20',
    secondary: 'border-[var(--secondary)]/20',
    success: 'border-[var(--success)]/20',
    accent: 'border-[var(--accent)]/20',
  };

  return (
    <div className={`card p-3 min-w-0 overflow-hidden ${colorClasses[color]}`}>
      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide truncate">{label}</p>
      <p className="text-sm font-bold mt-0.5 truncate">{value}</p>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[var(--border)]/50 last:border-0">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className="text-xs font-medium capitalize">{value}</span>
    </div>
  );
}
