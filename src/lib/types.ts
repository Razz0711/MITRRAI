// ============================================
// MitrAI - Study Buddy Matching Platform Types
// ============================================

export interface StudentProfile {
  id: string;
  createdAt: string;

  // Basic Info
  name: string;
  age: number;
  email: string;
  admissionNumber: string;
  city: string;
  country: string;
  timezone: string;
  preferredLanguage: string;
  bio?: string;
  photoUrl?: string;
  schedulePreferences?: string[];

  // Academic Info
  department: string; // CSE, AI, Mechanical, etc.
  currentStudy: string; // degree/exam/course
  institution: string;
  yearLevel: string;
  targetExam: string;
  targetDate: string;

  // Subjects
  strongSubjects: string[];
  weakSubjects: string[];
  currentlyStudying: string;
  upcomingTopics: string[];

  // Study Style
  learningType: LearningType;
  studyMethod: StudyMethod[];
  sessionLength: SessionLength;
  breakPattern: BreakPattern;
  pace: StudyPace;

  // Schedule
  availableDays: Day[];
  availableTimes: string; // e.g. "8PM-11PM IST"
  sessionsPerWeek: number;
  sessionType: SessionType;

  // Personality
  studyStyle: StudyStylePref;
  communication: CommunicationType;
  teachingAbility: TeachingAbility;
  accountabilityNeed: Level;
  videoCallComfort: boolean;

  // Goals
  shortTermGoal: string;
  longTermGoal: string;
  studyHoursTarget: number;
  weeklyGoals: string;

  // Birthday (stored server-side, no longer leaked via URL)
  dob: string;           // YYYY-MM-DD
  showBirthday: boolean; // privacy toggle

  // Batch-matching fields (auto-parsed from SVNIT email)
  matchKey: string;        // e.g. "i22ma" — used for batch-only matching
  programType: string;     // i, u, p, d
  batchYear: string;       // 2-digit batch year e.g. "22"
  deptCode: string;        // 2-3 letter dept code e.g. "ma"
  rollNo: string;          // 3-digit roll number e.g. "038"
  deptKnown: boolean;      // whether the dept code was recognized
  profileAutoFilled: boolean; // whether profile was auto-filled from email
}

export type LearningType = 'visual' | 'auditory' | 'reading' | 'practical';
export type StudyMethod = 'notes' | 'videos' | 'problems' | 'discussion';
export type SessionLength = '30mins' | '1hr' | '2hrs';
export type BreakPattern = 'pomodoro' | 'flexible';
export type StudyPace = 'fast' | 'medium' | 'slow';
export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type SessionType = 'teaching' | 'learning' | 'both';
export type StudyStylePref = 'strict' | 'flexible';
export type CommunicationType = 'introvert' | 'extrovert';
export type TeachingAbility = 'can explain well' | 'average' | 'prefer learning';
export type Level = 'high' | 'medium' | 'low';

// ============================================
// Onboarding Types
// ============================================

export interface OnboardingStep {
  id: number;
  phase: string;
  question: string;
  field: keyof StudentProfile | string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date';
  options?: string[];
  placeholder?: string;
  validation?: (value: string) => boolean;
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
}

// ============================================
// Matching Types
// ============================================

export interface MatchScore {
  overall: number;
  subject: number;
  schedule: number;
  style: number;
  goal: number;
  personality: number;
}

export interface MatchResult {
  student: StudentProfile;
  score: MatchScore;
  whyItWorks: string;
  potentialChallenges: string;
  recommendedFirstTopic: string;
  bestFormat: string;
  complementaryFactors: string[];
}

// ============================================
// Study Plan Types
// ============================================

export interface DailyPlan {
  day: Day;
  soloSession: {
    time: string;
    topic: string;
    duration: string;
    goal: string;
    resources: string[];
  };
  buddySession?: {
    time: string;
    topic: string;
    duration: string;
    format: string;
    goals: string[];
  };
  dailyTarget: string;
}

export interface WeeklyStudyPlan {
  studentName: string;
  buddyName: string;
  weekDates: string;
  mainGoal: string;
  days: DailyPlan[];
  weekSummary: {
    topicsToComplete: string[];
    problemsToSolve: number;
    mockTests: number;
    hoursTarget: number;
  };
  successMetrics: string[];
}

// ============================================
// Session Types
// ============================================

export interface StudySession {
  id: string;
  student1Id: string;
  student2Id: string;
  topic: string;
  goal: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  summary?: SessionSummary;
}

export interface SessionSummary {
  topicsCovered: string[];
  conceptsMastered: string[];
  needsMorePractice: string[];
  homework: string[];
  nextSessionTopic: string;
  rating: number;
}

// ============================================
// Notification Types
// ============================================

import { NotificationType } from './constants';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ============================================
// Birthday Types
// ============================================

export interface BirthdayWish {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  createdAt: string;
}

export interface BirthdayInfo {
  userId: string;
  userName: string;
  department: string;
  dayMonth: string;        // "DD-MM" for display (no year)
  isToday: boolean;
  daysUntil: number;       // 0 = today, 1 = tomorrow, etc.
}

// ============================================
// Availability & Session Booking Types
// ============================================

export type SlotStatus = 'available' | 'tentative' | 'engaged' | 'unavailable';

export interface TimeSlot {
  day: Day;
  hour: number;            // 6-23 (6AM to 11PM)
  status: SlotStatus;
  sessionId?: string;      // if engaged, references the session
  buddyName?: string;      // who they're studying with
}

export interface UserAvailability {
  userId: string;
  slots: TimeSlot[];
  updatedAt: string;
}

export interface SessionBooking {
  id: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  day: Day;
  hour: number;
  topic: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
}

// ============================================
// Online Status Types
// ============================================

export type OnlineStatusType = 'online' | 'in-session' | 'offline';

export interface UserStatus {
  userId: string;
  status: OnlineStatusType;
  lastSeen: string;
  currentSubject?: string;  // what they're studying (optional)
  sessionStartedAt?: string;
  hideStatus: boolean;       // privacy: appear offline
  hideSubject: boolean;      // privacy: hide what studying
}

// ============================================
// Study Materials Types
// ============================================

export type MaterialType = 'notes' | 'question-paper' | 'assignment' | 'reference' | 'other';

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  department: string;
  yearLevel: string;
  subject: string;
  type: MaterialType;
  uploadedBy: string;       // user name
  uploadedByEmail: string;  // user email
  fileName: string;
  fileSize: number;         // bytes
  storedFileName: string;   // unique filename on disk
  createdAt: string;
}

// ============================================
// Friend & Rating Types
// ============================================

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: FriendRequestStatus;
  createdAt: string;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user1Name: string;
  user2Id: string;
  user2Name: string;
  createdAt: string;
}

export interface BuddyRating {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  rating: number;           // 1-10
  review: string;           // optional text
  createdAt: string;
}

// ============================================
// Subscription Types
// ============================================

export type SubscriptionPlan = 'free' | 'monthly' | 'yearly';

export interface Subscription {
  userId: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;          // empty for free
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  transactionId?: string;   // UPI transaction/UTR ID
  createdAt: string;
}

// ============================================
// Chat / Messaging Types
// ============================================

export interface DirectMessage {
  id: string;
  chatId: string;           // sorted pair of user IDs
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface ChatThread {
  chatId: string;           // sorted pair of user IDs
  user1Id: string;
  user1Name: string;
  user2Id: string;
  user2Name: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount1: number;     // unread for user1
  unreadCount2: number;     // unread for user2
}

// ============================================
// API Response Types
// ============================================

export interface Feedback {
  id: string;
  userId: string;
  name: string;
  email: string;
  type: 'feedback' | 'bug' | 'feature' | 'contact';
  rating: number;
  message: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Calendar Event Types
// ============================================

// ============================================
// Attendance Types
// ============================================

export interface AttendanceRecord {
  id: string;
  userId: string;
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  lastUpdated: string;
  createdAt: string;
}

export type CalendarEventType = 'class' | 'study' | 'exam' | 'assignment' | 'meeting' | 'reminder';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: CalendarEventType;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
  room: string;
  recurring: boolean;    // true = repeats every week on this day
  recurringDay: string;  // e.g. 'Monday' (only if recurring)
  color: string;         // hex or tailwind class
  buddyId: string;       // optional buddy for study sessions
  buddyName: string;
  createdAt: string;
}
