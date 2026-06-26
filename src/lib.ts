import type { DB, PracticeEvent, Score, ScheduleSlot, User } from './types';

export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}

export const todayISO = () => daysAgo(0);

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// Deterministic PRNG so the seeded demo data is stable per session
export function rng(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pointsOf(db: DB, studentId: string): number {
  return db.practice.filter((p) => p.studentId === studentId).reduce((s, p) => s + p.points, 0);
}

export function streakOf(db: DB, studentId: string): number {
  const dates = new Set(db.practice.filter((p) => p.studentId === studentId).map((p) => p.date));
  let streak = 0;
  // A streak survives if the student practiced today or yesterday
  let offset = dates.has(todayISO()) ? 0 : 1;
  while (dates.has(daysAgo(offset + streak))) streak++;
  return streak;
}

export function practicedToday(db: DB, studentId: string): boolean {
  return db.practice.some((p) => p.studentId === studentId && p.date === todayISO());
}

export function scoresOf(db: DB, studentId: string): { score: Score; assessment: NonNullable<DB['assessments'][number]> }[] {
  return db.scores
    .filter((s) => s.studentId === studentId)
    .map((score) => ({ score, assessment: db.assessments.find((a) => a.id === score.assessmentId)! }))
    .filter((x) => x.assessment)
    .sort((a, b) => a.assessment.date.localeCompare(b.assessment.date));
}

export function avgPct(db: DB, studentId: string): number | null {
  const xs = scoresOf(db, studentId);
  if (!xs.length) return null;
  return xs.reduce((s, x) => s + (x.score.score / x.assessment.maxScore) * 100, 0) / xs.length;
}

export function hwDoneCount(db: DB, studentId: string): number {
  return db.homeworkStatus.filter((h) => h.studentId === studentId && h.done).length;
}

export function studentsInClass(db: DB, classId: string): User[] {
  return db.users.filter((u) => u.role === 'student' && u.classIds.includes(classId));
}

export interface BadgeDef {
  id: string;
  emoji: string;
  nameEn: string;
  nameVi: string;
  descEn: string;
  descVi: string;
  earned: (s: BadgeStats) => boolean;
}

export interface BadgeStats {
  points: number;
  streak: number;
  hwDone: number;
  practiceCount: number;
  bestPct: number;
  avgPct: number;
}

export const BADGES: BadgeDef[] = [
  { id: 'first-steps', emoji: '🐣', nameEn: 'First Steps', nameVi: 'Bước đầu tiên', descEn: 'Complete your first practice', descVi: 'Hoàn thành buổi luyện tập đầu tiên', earned: (s) => s.practiceCount >= 1 },
  { id: 'streak-3', emoji: '🔥', nameEn: 'On Fire', nameVi: 'Bốc lửa', descEn: '3-day practice streak', descVi: 'Chuỗi 3 ngày luyện tập', earned: (s) => s.streak >= 3 },
  { id: 'streak-7', emoji: '⚡', nameEn: 'Unstoppable', nameVi: 'Không thể cản', descEn: '7-day practice streak', descVi: 'Chuỗi 7 ngày luyện tập', earned: (s) => s.streak >= 7 },
  { id: 'points-50', emoji: '⭐', nameEn: 'Rising Star', nameVi: 'Ngôi sao mới', descEn: 'Earn 50 points', descVi: 'Đạt 50 điểm thưởng', earned: (s) => s.points >= 50 },
  { id: 'points-200', emoji: '🌟', nameEn: 'Superstar', nameVi: 'Siêu sao', descEn: 'Earn 200 points', descVi: 'Đạt 200 điểm thưởng', earned: (s) => s.points >= 200 },
  { id: 'hw-5', emoji: '📚', nameEn: 'Homework Hero', nameVi: 'Anh hùng bài tập', descEn: 'Complete 5 homework tasks', descVi: 'Hoàn thành 5 bài tập', earned: (s) => s.hwDone >= 5 },
  { id: 'ace', emoji: '🏆', nameEn: 'Ace', nameVi: 'Điểm tuyệt đối', descEn: 'Score 90%+ on a test', descVi: 'Đạt 90%+ trong một bài kiểm tra', earned: (s) => s.bestPct >= 90 },
  { id: 'scholar', emoji: '🎓', nameEn: 'Scholar', nameVi: 'Học giả', descEn: 'Keep an 80%+ average', descVi: 'Giữ điểm trung bình trên 80%', earned: (s) => s.avgPct >= 80 },
];

export function badgeStats(db: DB, studentId: string): BadgeStats {
  const xs = scoresOf(db, studentId);
  const pcts = xs.map((x) => (x.score.score / x.assessment.maxScore) * 100);
  return {
    points: pointsOf(db, studentId),
    streak: streakOf(db, studentId),
    hwDone: hwDoneCount(db, studentId),
    practiceCount: db.practice.filter((p) => p.studentId === studentId).length,
    bestPct: pcts.length ? Math.max(...pcts) : 0,
    avgPct: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0,
  };
}

export function earnedBadges(db: DB, studentId: string): BadgeDef[] {
  const stats = badgeStats(db, studentId);
  return BADGES.filter((b) => b.earned(stats));
}

export function leaderboard(db: DB, classId: string): { user: User; points: number }[] {
  return studentsInClass(db, classId)
    .map((user) => ({ user, points: pointsOf(db, user.id) }))
    .sort((a, b) => b.points - a.points);
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns dates (newest first) of past class sessions based on the weekly schedule. */
export function sessionDates(schedule: ScheduleSlot[], daysBack = 56): string[] {
  const weekdays = new Set(schedule.map((s) => s.weekday));
  const today = new Date();
  const dates: string[] = [];
  for (let d = 0; d <= daysBack; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    if (weekdays.has(date.getDay())) {
      dates.push(iso(date));
    }
  }
  return dates;
}

export function addPractice(db: DB, studentId: string, type: PracticeEvent['type'], points: number): void {
  db.practice.push({ id: uid('pr'), studentId, date: todayISO(), type, points });
}
