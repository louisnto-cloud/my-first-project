import { createHash, randomBytes, randomInt } from 'node:crypto';
import { MANUAL_TYPES, type QuestionType, type SkillScore } from '@etop/domain';
import type { SkillKey } from '@etop/domain';
import { type DB, many, one } from './db.js';

export const rid = (p: string) => `${p}_${randomBytes(8).toString('hex')}`;

/** Allocate an unused login code: HV#### for students, GV#### for teachers. */
export async function allocateLoginCode(db: DB, prefix: 'HV' | 'GV'): Promise<string> {
  for (let i = 0; i < 500; i++) {
    const code = `${prefix}${String(randomInt(1, 10000)).padStart(4, '0')}`;
    const clash = await one(db, 'SELECT 1 AS x FROM users WHERE login_code = $1', [code]);
    if (!clash) return code;
  }
  throw new Error('no login code available');
}

// ---------- Child-friendly join codes (BEAR42) ----------

const CODE_WORDS = ['BEAR', 'LION', 'STAR', 'FISH', 'BIRD', 'FROG', 'DUCK', 'MOON', 'TREE', 'CAKE', 'KITE', 'SHIP'];

export async function rotateJoinCode(db: DB, classId: string): Promise<string> {
  // Old code dies instantly: only the stored value ever matches.
  for (let i = 0; i < 50; i++) {
    const code = `${CODE_WORDS[randomInt(CODE_WORDS.length)]}${randomInt(10, 100)}`;
    const clash = await one(db, 'SELECT 1 AS x FROM classes WHERE join_code = $1', [code]);
    if (!clash) {
      await db.query('UPDATE classes SET join_code = $2 WHERE id = $1', [classId, code]);
      return code;
    }
  }
  throw new Error('could not allocate join code');
}

// ---------- Deterministic per-student variation ----------

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  const seed = createHash('sha256').update(seedStr).digest().readUInt32LE(0);
  const rng = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Student-safe serialization (answers never leave the server) ----------

export interface QuestionRow {
  id: string;
  type: QuestionType;
  skill: SkillKey;
  prompt: string;
  payload: Record<string, unknown>;
  position: number;
  points: number;
}

export function serializeForStudent(q: QuestionRow, seedStr: string, fixedOrder: boolean): Record<string, unknown> {
  const p = q.payload;
  const out: Record<string, unknown> = { id: q.id, type: q.type, skill: q.skill, prompt: q.prompt, points: q.points };
  const maybeShuffle = <T>(xs: T[]): T[] => (fixedOrder ? xs : seededShuffle(xs, `${seedStr}:${q.id}`));

  switch (q.type) {
    case 'mc':
    case 'mc_multi':
    case 'listen_mc':
      out.options = maybeShuffle(p.options as string[]);
      if (q.type === 'listen_mc') {
        out.audioText = p.audioText;
        out.audioUrl = p.audioUrl;
        out.replayLimit = p.replayLimit ?? 2;
      }
      if (p.imageUrl) out.imageUrl = p.imageUrl;
      break;
    case 'fill_blank':
      out.sentence = p.sentence;
      if (p.choices) out.choices = maybeShuffle(p.choices as string[]);
      break;
    case 'fill_gaps':
      out.text = p.text;
      out.gapIds = (p.gaps as { id: number }[]).map((g) => g.id);
      if (p.wordBank) out.wordBank = maybeShuffle(p.wordBank as string[]);
      break;
    case 'reorder':
      out.words = seededShuffle(p.words as string[], `${seedStr}:${q.id}:words`);
      break;
    case 'dictation':
      out.audioText = p.audioText;
      out.audioUrl = p.audioUrl;
      out.replayLimit = p.replayLimit ?? 2;
      break;
    case 'picture':
      out.imageUrl = p.imageUrl;
      if (p.starters) out.starters = p.starters;
      break;
  }
  return out;
}

// ---------- Autograding ----------

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

/** Returns earned points (0..points) or null when the type needs a teacher. */
export function autograde(q: QuestionRow, answer: unknown): number | null {
  if (MANUAL_TYPES.includes(q.type)) return null;
  const p = q.payload;
  switch (q.type) {
    case 'mc':
    case 'listen_mc':
      return norm(answer) === norm(p.answer) ? q.points : 0;
    case 'mc_multi': {
      const got = new Set((Array.isArray(answer) ? answer : []).map(norm));
      const want = new Set((p.answers as string[]).map(norm));
      const equal = got.size === want.size && [...want].every((w) => got.has(w));
      return equal ? q.points : 0;
    }
    case 'fill_blank':
      return norm(answer) === norm(p.answer) ? q.points : 0;
    case 'fill_gaps': {
      const gaps = p.gaps as { id: number; answer: string }[];
      const got = (answer ?? {}) as Record<string, unknown>;
      const correct = gaps.filter((g) => norm(got[String(g.id)]) === norm(g.answer)).length;
      return Math.round((correct / gaps.length) * q.points * 100) / 100;
    }
    case 'reorder': {
      const got = Array.isArray(answer) ? (answer as string[]).join(' ') : String(answer ?? '');
      return norm(got) === norm(p.answer) ? q.points : 0;
    }
    default:
      return 0;
  }
}

export function gradeSubmission(
  questions: QuestionRow[],
  answers: Record<string, unknown>,
): { autoPoints: number; autoPossible: number; manualPossible: number; skillScores: Partial<Record<SkillKey, SkillScore>>; needsReview: boolean } {
  let autoPoints = 0;
  let autoPossible = 0;
  let manualPossible = 0;
  const skillScores: Partial<Record<SkillKey, SkillScore>> = {};

  for (const q of questions) {
    const earned = autograde(q, answers[q.id]);
    if (earned === null) {
      manualPossible += q.points;
      continue;
    }
    autoPoints += earned;
    autoPossible += q.points;
    const s = (skillScores[q.skill] ??= { earned: 0, possible: 0 });
    s.earned += earned;
    s.possible += q.points;
  }
  return { autoPoints, autoPossible, manualPossible, skillScores, needsReview: manualPossible > 0 };
}

// ---------- Mastery (broad skills; EMA toward latest evidence) ----------

export async function recordMastery(db: DB, studentId: string, skillScores: Partial<Record<SkillKey, SkillScore>>, at: Date): Promise<void> {
  for (const [skill, s] of Object.entries(skillScores)) {
    if (!s || s.possible <= 0) continue;
    const observed = s.earned / s.possible;
    const prev = await one<{ score: number }>(db, 'SELECT score FROM mastery WHERE student_id = $1 AND skill = $2', [studentId, skill]);
    const next = prev ? prev.score * 0.7 + observed * 0.3 : observed;
    if (prev) {
      await db.query('UPDATE mastery SET score = $3, updated_at = $4 WHERE student_id = $1 AND skill = $2', [studentId, skill, next, at.toISOString()]);
    } else {
      await db.query('INSERT INTO mastery (student_id, skill, score, updated_at) VALUES ($1, $2, $3, $4)', [studentId, skill, next, at.toISOString()]);
    }
    // History powers growth charts and mastery-velocity analytics.
    await db.query('INSERT INTO mastery_history (id, student_id, skill, score, recorded_at) VALUES ($1, $2, $3, $4, $5)', [
      rid('mh'), studentId, skill, next, at.toISOString(),
    ]);
  }
}

// ---------- Class membership ----------

export async function isEnrolled(db: DB, classId: string, studentId: string): Promise<boolean> {
  return !!(await one(db, `SELECT 1 AS x FROM enrollments WHERE class_id = $1 AND student_id = $2 AND status = 'active'`, [classId, studentId]));
}

export async function assignmentQuestions(db: DB, assignmentId: string): Promise<QuestionRow[]> {
  return many<QuestionRow>(
    db,
    `SELECT q.id, q.type, q.skill, q.prompt, q.payload, aq.position, aq.points
       FROM assignment_questions aq JOIN questions q ON q.id = aq.question_id
      WHERE aq.assignment_id = $1 ORDER BY aq.position`,
    [assignmentId],
  );
}
