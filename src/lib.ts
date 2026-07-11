import type { DB, PracticeEvent, Score, User, VocabList, VocabWord } from './types';

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

// ---- Level / XP progression -------------------------------------------------
// Points earned from practice, homework and quizzes double as XP. Each level
// costs a little more than the last, so early wins come fast and later levels
// feel earned. Tiers give a friendly name + emoji that grows with the learner.
const TIERS: { emoji: string; en: string; vi: string }[] = [
  { emoji: '🌱', en: 'Sprout', vi: 'Mầm non' },
  { emoji: '🌿', en: 'Sapling', vi: 'Chồi biếc' },
  { emoji: '🍀', en: 'Explorer', vi: 'Nhà thám hiểm' },
  { emoji: '⭐', en: 'Achiever', vi: 'Người xuất sắc' },
  { emoji: '🌟', en: 'Star', vi: 'Ngôi sao' },
  { emoji: '🔥', en: 'Champion', vi: 'Nhà vô địch' },
  { emoji: '💎', en: 'Master', vi: 'Bậc thầy' },
  { emoji: '👑', en: 'Legend', vi: 'Huyền thoại' },
];

export interface LevelInfo {
  level: number;
  emoji: string;
  titleEn: string;
  titleVi: string;
  intoLevel: number; // XP earned inside the current level
  need: number; // XP required to clear the current level
  pct: number; // 0..1 progress to next level
  floor: number; // cumulative XP at the start of this level
}

export function levelCost(level: number): number {
  return 60 + (level - 1) * 30; // L1:60, L2:90, L3:120 …
}

export function levelInfo(points: number): LevelInfo {
  let level = 1;
  let floor = 0;
  let need = levelCost(level);
  while (points >= floor + need) {
    floor += need;
    level += 1;
    need = levelCost(level);
  }
  const tier = TIERS[Math.min(level - 1, TIERS.length - 1)];
  const intoLevel = points - floor;
  return { level, emoji: tier.emoji, titleEn: tier.en, titleVi: tier.vi, intoLevel, need, pct: need ? intoLevel / need : 0, floor };
}

// ---- Attendance -------------------------------------------------------------
export function attendanceOf(db: DB, studentId: string) {
  return db.attendance.filter((a) => a.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));
}

export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  total: number;
}

export function attendanceCounts(db: DB, studentId: string): AttendanceCounts {
  const xs = db.attendance.filter((a) => a.studentId === studentId);
  return {
    present: xs.filter((a) => a.status === 'present').length,
    late: xs.filter((a) => a.status === 'late').length,
    absent: xs.filter((a) => a.status === 'absent').length,
    total: xs.length,
  };
}

// Rate credits a late arrival as half a present, out of all recorded sessions.
export function attendanceRate(db: DB, studentId: string): number | null {
  const c = attendanceCounts(db, studentId);
  if (c.total === 0) return null;
  return ((c.present + c.late * 0.5) / c.total) * 100;
}

export function classAttendanceRate(db: DB, classId: string): number | null {
  const roster = studentsInClass(db, classId);
  const rates = roster.map((s) => attendanceRate(db, s.id)).filter((x): x is number => x != null);
  if (!rates.length) return null;
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

// Speak English text aloud using the browser's built-in speech synthesis.
// Fully offline and dependency-free; silently no-ops where unsupported.
export function speak(text: string): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.92;
    synth.speak(u);
  } catch {
    /* speech not available — ignore */
  }
}

export function addPractice(db: DB, studentId: string, type: PracticeEvent['type'], points: number): void {
  db.practice.push({ id: uid('pr'), studentId, date: todayISO(), type, points });
}

// ---- Vocabulary mastery (Leitner spaced repetition) -------------------------
// Each word sits in a box 0..5. A correct recall bumps it up a box; a miss
// knocks it down one. A word is "mastered" at box 5 and "due" below that.
export const SRS_MAX = 5;

export function boxOf(db: DB, studentId: string, wordId: string): number {
  return db.vocabProgress.find((p) => p.studentId === studentId && p.wordId === wordId)?.box ?? 0;
}

export function recordReview(db: DB, studentId: string, wordId: string, knew: boolean): void {
  const existing = db.vocabProgress.find((p) => p.studentId === studentId && p.wordId === wordId);
  const prev = existing?.box ?? 0;
  const box = knew ? Math.min(SRS_MAX, prev + 1) : Math.max(0, prev - 1);
  if (existing) {
    existing.box = box;
    existing.lastReviewed = todayISO();
  } else {
    db.vocabProgress.push({ id: uid('vp'), studentId, wordId, box, lastReviewed: todayISO() });
  }
}

// Mastery of a list = average box across its words, normalised to 0..1.
export function listMastery(db: DB, studentId: string, list: VocabList): number {
  if (!list.words.length) return 0;
  const total = list.words.reduce((s, w) => s + boxOf(db, studentId, w.id), 0);
  return total / (list.words.length * SRS_MAX);
}

export function masteredCount(db: DB, studentId: string, list: VocabList): number {
  return list.words.filter((w) => boxOf(db, studentId, w.id) >= SRS_MAX).length;
}

// Words still worth reviewing across a student's classes, weakest first.
export function dueWords(db: DB, studentId: string, classIds: string[], limit = 12): VocabWord[] {
  const words = db.vocabLists.filter((v) => classIds.includes(v.classId)).flatMap((l) => l.words);
  return words
    .map((w) => ({ w, box: boxOf(db, studentId, w.id) }))
    .filter((x) => x.box < SRS_MAX)
    .sort((a, b) => a.box - b.box)
    .slice(0, limit)
    .map((x) => x.w);
}

export function dueCount(db: DB, studentId: string, classIds: string[]): number {
  return db.vocabLists
    .filter((v) => classIds.includes(v.classId))
    .flatMap((l) => l.words)
    .filter((w) => boxOf(db, studentId, w.id) < SRS_MAX).length;
}
