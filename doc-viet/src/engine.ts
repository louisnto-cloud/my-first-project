// Core progress / gamification engine for the Đọc & Viết programme.
import { CURRICULUM, getAllLessons } from './data/curriculum';
import { hasDiacritics } from './vi';

const PROGRESS_KEY = 'dv-progress-v1';
const TTS_KEY = 'dv-tts-v1';

export interface ReviewStat {
  correct: number;
  wrong: number;
  last: string; // ISO date
}

export interface DVProgress {
  v: 1;
  completedLessons: string[];
  exerciseAnswers: Record<string, Record<string, string>>;
  writingResponses: Record<string, string>;
  xp: number;
  practiceDays: string[]; // ISO dates the learner did anything
  completedStories: string[];
  perfectLessons: string[]; // lessons finished with a perfect exercise score
  reviewHistory: Record<string, ReviewStat>; // keyed by vocabulary word
  reviewSessions: number;
  badges: string[];
  xpKeys: string[]; // one-time XP award keys — prevents re-earning by redoing the same answers
  activityLog: Record<string, DayActivity>; // ISO date → what was done that day (powers daily goals)
  placedThroughMonth?: number; // placement-test result: months 0..N are unlocked regardless of completion
}

export interface DayActivity {
  lessons: number;
  reviews: number;
  stories: number;
}

export function emptyProgress(): DVProgress {
  return {
    v: 1,
    completedLessons: [],
    exerciseAnswers: {},
    writingResponses: {},
    xp: 0,
    practiceDays: [],
    completedStories: [],
    perfectLessons: [],
    reviewHistory: {},
    reviewSessions: 0,
    badges: [],
    xpKeys: [],
    activityLog: {},
  };
}

/** Record completed lessons/reviews/stories in today's activity log by diffing two progress states. */
export function logActivity(prev: DVProgress, next: DVProgress): DVProgress {
  const lessons = Math.max(0, next.completedLessons.length - prev.completedLessons.length);
  const stories = Math.max(0, next.completedStories.length - prev.completedStories.length);
  const reviews = Math.max(0, next.reviewSessions - prev.reviewSessions);
  if (lessons + stories + reviews === 0) return next;
  const day = todayISO();
  const cur = next.activityLog[day] ?? { lessons: 0, reviews: 0, stories: 0 };
  return {
    ...next,
    activityLog: {
      ...next.activityLog,
      [day]: { lessons: cur.lessons + lessons, reviews: cur.reviews + reviews, stories: cur.stories + stories },
    },
  };
}

/**
 * Award XP for a set of one-time keys (e.g. `ex:<lesson>:<exercise>`).
 * Keys already in the ledger pay nothing, so redoing the same answers
 * can never farm XP. Returns the updated progress and the XP actually gained.
 */
export function awardOnce(p: DVProgress, entries: { key: string; xp: number }[]): { progress: DVProgress; gained: number } {
  const fresh = entries.filter((e) => !p.xpKeys.includes(e.key));
  if (fresh.length === 0) return { progress: p, gained: 0 };
  const gained = fresh.reduce((a, e) => a + e.xp, 0);
  return { progress: { ...p, xp: p.xp + gained, xpKeys: [...p.xpKeys, ...fresh.map((e) => e.key)] }, gained };
}

export function loadProgress(): DVProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return { ...emptyProgress(), ...(JSON.parse(raw) as DVProgress) };
  } catch {
    // corrupted storage — start fresh
  }
  return emptyProgress();
}

export function saveProgress(p: DVProgress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

export function resetProgress(): DVProgress {
  const fresh = emptyProgress();
  saveProgress(fresh);
  return fresh;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Record that the learner practiced today (powers the streak). */
export function touchToday(p: DVProgress): DVProgress {
  const today = todayISO();
  if (p.practiceDays.includes(today)) return p;
  return { ...p, practiceDays: [...p.practiceDays, today].sort() };
}

export function streakOf(p: DVProgress): number {
  const days = new Set(p.practiceDays);
  let streak = 0;
  const d = new Date();
  // today counts if practiced; otherwise the streak may still be alive from yesterday
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ─── XP & Levels ─────────────────────────────────────────────────────────────
export const XP = {
  exerciseCorrect: 10,
  perfectBonus: 25,
  lessonComplete: 50,
  dictationWord: 10,
  storyQuizCorrect: 10,
  storyComplete: 30,
  reviewCorrect: 5,
  reviewSession: 20,
};

export interface Level {
  xp: number;
  title: string;   // Vietnamese
  en: string;      // English translation shown underneath
  emoji: string;
}

export const LEVELS: Level[] = [
  { xp: 0, title: 'Người mới', en: 'New Learner', emoji: '🐣' },
  { xp: 100, title: 'Nhà khám phá chữ', en: 'Letter Explorer', emoji: '🔤' },
  { xp: 300, title: 'Thợ ghép vần', en: 'Syllable Builder', emoji: '🧱' },
  { xp: 600, title: 'Người viết câu', en: 'Sentence Crafter', emoji: '✏️' },
  { xp: 1000, title: 'Người đọc truyện', en: 'Story Reader', emoji: '📖' },
  { xp: 1500, title: 'Cây bút', en: 'Fluent Writer', emoji: '🖋️' },
  { xp: 2200, title: 'Bậc thầy từ ngữ', en: 'Word Master', emoji: '🏆' },
  { xp: 3000, title: 'Chuyên gia', en: 'Literacy Expert', emoji: '🎓' },
];

export function levelFor(xp: number): { level: Level; index: number; next: Level | null; pctToNext: number } {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) index = i;
  const level = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const pctToNext = next ? Math.min(100, Math.round(((xp - level.xp) / (next.xp - level.xp)) * 100)) : 100;
  return { level, index, next, pctToNext };
}

// ─── Badges ──────────────────────────────────────────────────────────────────
export interface Badge {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  earned: (p: DVProgress) => boolean;
}

export const BADGES: Badge[] = [
  { id: 'first-steps', emoji: '👣', title: 'First Steps', desc: 'Complete your first lesson', earned: (p) => p.completedLessons.length >= 1 },
  { id: 'on-a-roll', emoji: '🎢', title: 'On a Roll', desc: 'Complete 5 lessons', earned: (p) => p.completedLessons.length >= 5 },
  { id: 'halfway', emoji: '⛰️', title: 'Halfway There', desc: 'Complete 17 lessons', earned: (p) => p.completedLessons.length >= 17 },
  { id: 'graduate', emoji: '🎓', title: 'Chuyên gia', desc: 'Complete every lesson', earned: (p) => p.completedLessons.length >= getAllLessons().length },
  { id: 'perfect', emoji: '💯', title: 'Perfect!', desc: 'Get a perfect exercise score', earned: (p) => p.perfectLessons.length >= 1 },
  { id: 'sharpshooter', emoji: '🎯', title: 'Sharpshooter', desc: '5 perfect exercise scores', earned: (p) => p.perfectLessons.length >= 5 },
  { id: 'tone-tamer', emoji: '🎵', title: 'Tone Tamer', desc: 'Finish both six-tone lessons', earned: (p) => p.completedLessons.includes('m1w3l1') && p.completedLessons.includes('m1w3l2') },
  { id: 'bookworm', emoji: '🐛', title: 'Bookworm', desc: 'Finish 3 library stories', earned: (p) => p.completedStories.length >= 3 },
  { id: 'librarian', emoji: '📚', title: 'Librarian', desc: 'Finish every library story', earned: (p) => p.completedStories.length >= 12 },
  { id: 'reviewer', emoji: '🔁', title: 'Reviewer', desc: 'Complete a review session', earned: (p) => p.reviewSessions >= 1 },
  { id: 'memory-master', emoji: '🧠', title: 'Memory Master', desc: '10 review sessions', earned: (p) => p.reviewSessions >= 10 },
  { id: 'wordsmith', emoji: '🖋️', title: 'Wordsmith', desc: 'Write 10 responses of 30+ words', earned: (p) => Object.values(p.writingResponses).filter((t) => t.trim().split(/\s+/).length >= 30).length >= 10 },
  { id: 'streak-3', emoji: '🔥', title: 'Warming Up', desc: '3-day streak', earned: (p) => streakOf(p) >= 3 },
  { id: 'streak-7', emoji: '🚀', title: 'Unstoppable', desc: '7-day streak', earned: (p) => streakOf(p) >= 7 },
];

/** Re-evaluate badges; returns the updated progress and any newly earned badges. */
export function withBadges(p: DVProgress): { progress: DVProgress; earned: Badge[] } {
  const earned = BADGES.filter((b) => !p.badges.includes(b.id) && b.earned(p));
  if (earned.length === 0) return { progress: p, earned };
  return { progress: { ...p, badges: [...p.badges, ...earned.map((b) => b.id)] }, earned };
}

// ─── Month unlocking ─────────────────────────────────────────────────────────
export function isMonthUnlocked(p: DVProgress, monthIndex: number): boolean {
  if (monthIndex === 0) return true;
  if (monthIndex <= (p.placedThroughMonth ?? 0)) return true; // unlocked by placement test
  const prev = CURRICULUM[monthIndex - 1];
  return prev.weeks.flatMap((w) => w.lessons).every((l) => p.completedLessons.includes(l.id));
}

// ─── TTS settings ────────────────────────────────────────────────────────────
export interface TTSSettings {
  rate: number;       // 0.7 slow · 0.9 normal · 1.1 fast
  voiceURI: string | null;
}

export function loadTTSSettings(): TTSSettings {
  try {
    const raw = localStorage.getItem(TTS_KEY);
    if (raw) return JSON.parse(raw) as TTSSettings;
  } catch { /* fall through */ }
  return { rate: 0.9, voiceURI: null };
}

export function saveTTSSettings(s: TTSSettings) {
  localStorage.setItem(TTS_KEY, JSON.stringify(s));
}

// ─── Text size preference (readability for beginner readers) ────────────────
const TEXTSIZE_KEY = 'dv-textsize-v1';
export type TextSize = 'normal' | 'large';

export function loadTextSize(): TextSize {
  return localStorage.getItem(TEXTSIZE_KEY) === 'large' ? 'large' : 'normal';
}

export function saveTextSize(s: TextSize) {
  localStorage.setItem(TEXTSIZE_KEY, s);
}

// ─── Writing feedback (tuned for Vietnamese learner output) ──────────────────
export interface WritingCheck {
  ok: boolean;
  label: string;
}

const STOPWORDS = new Set(['và', 'là', 'có', 'của', 'một', 'không', 'tôi', 'bạn', 'thì', 'mà', 'ở', 'rất', 'cũng', 'đã', 'đang', 'sẽ', 'này', 'đó', 'cho', 'với']);

export function analyzeWriting(text: string): WritingCheck[] {
  const trimmed = text.trim().normalize('NFC');
  const words = trimmed.split(/\s+/).filter(Boolean);
  const sentences = trimmed.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const checks: WritingCheck[] = [];

  checks.push({ ok: words.length >= 15, label: words.length >= 15 ? `Good length (${words.length} words)` : `Try to write at least 15 words (currently ${words.length})` });
  checks.push({ ok: sentences.length >= 2, label: sentences.length >= 2 ? `${sentences.length} sentences — nice!` : 'Write at least 2 sentences' });

  const endsPunctuated = /[.!?]\s*$/.test(trimmed);
  checks.push({ ok: endsPunctuated, label: endsPunctuated ? 'Ends with punctuation' : 'End your writing with . ? or !' });

  const badStarts = sentences.filter((s) => s[0] && s[0] !== s[0].toUpperCase());
  checks.push({ ok: badStarts.length === 0, label: badStarts.length === 0 ? 'Sentences start with capital letters' : `Start every sentence with a capital letter (check: "${badStarts[0].slice(0, 20)}…")` });

  // Vietnamese needs diacritics: in real text well over half the syllables carry
  // a tone mark or letter hat. Flag writing that looks like "telex-less" typing.
  const withMarks = words.filter((w) => hasDiacritics(w)).length;
  const marksOk = words.length < 5 || withMarks / words.length >= 0.25;
  checks.push({ ok: marksOk, label: marksOk ? 'Tone marks & diacritics in use — tuyệt vời!' : 'Very few tone marks — Vietnamese needs its diacritics! Use the character helper row.' });

  const counts = new Map<string, number>();
  for (const w of words) {
    const key = w.toLowerCase().replace(/[^\p{L}]/gu, '');
    if (!key || STOPWORDS.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const overused = [...counts.entries()].filter(([, n]) => n > 4).map(([w]) => w);
  checks.push({ ok: overused.length === 0, label: overused.length === 0 ? 'Good word variety' : `Try a synonym — "${overused[0]}" appears ${counts.get(overused[0])} times` });

  return checks;
}
