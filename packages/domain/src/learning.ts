import type { Actor, ClassRef } from './rbac';
import { DEFAULT_SKILL_WEIGHTS, type SkillKey } from './taxonomy';

export const QUESTION_TYPES = [
  'mc', 'mc_multi', 'fill_blank', 'fill_gaps', 'reorder', 'listen_mc', 'dictation', 'picture',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Open types go to the teacher's grading queue; the rest auto-grade. */
export const MANUAL_TYPES: QuestionType[] = ['dictation', 'picture'];

/** Who can author questions/assignments and grade for a class. */
export function canTeachClass(actor: Actor, cls: ClassRef): boolean {
  if (actor.orgId !== cls.orgId) return false;
  if (actor.role === 'owner' || actor.role === 'academic_director') return true;
  return actor.role === 'tutor' && cls.teacherId === actor.id;
}

export function canAuthorQuestions(actor: Actor): boolean {
  return ['owner', 'academic_director', 'tutor'].includes(actor.role);
}

export interface SkillScore {
  earned: number;
  possible: number;
}

/**
 * Weighted overall grade per Part C: weights renormalized over the skills
 * actually present in the assignment, so a grammar-only quiz is still /100.
 */
export function weightedOverall(
  skillScores: Partial<Record<SkillKey, SkillScore>>,
  weights: Record<SkillKey, number> = DEFAULT_SKILL_WEIGHTS,
): number | null {
  let weightSum = 0;
  let total = 0;
  for (const [skill, s] of Object.entries(skillScores) as [SkillKey, SkillScore][]) {
    if (!s || s.possible <= 0) continue;
    const w = weights[skill] ?? 0;
    weightSum += w;
    total += w * (s.earned / s.possible);
  }
  if (weightSum === 0) return null;
  return Math.round((total / weightSum) * 1000) / 10; // one decimal, 0-100
}

/** Friendly display for ages 5–8 (Part C): stars/stamps from a 0-100 score. */
export function friendlyStars(score: number): number {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  if (score >= 50) return 1;
  return 0;
}
