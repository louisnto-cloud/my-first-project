// Skills taxonomy scaffolding (full knowledge graph lands in Phase 3).
// ETOP defaults per Part C: configurable per class by the Academic Director.

export const SKILLS = ['grammar', 'reading', 'listening', 'writing'] as const;
export type SkillKey = (typeof SKILLS)[number];

export const DEFAULT_SKILL_WEIGHTS: Record<SkillKey, number> = {
  grammar: 0.3,
  listening: 0.3,
  reading: 0.2,
  writing: 0.2,
};

// CEFR / Cambridge Young Learners aligned levels, ages 5–15.
export const LEVELS = ['pre_a1_starters', 'a1_movers', 'a2_flyers', 'b1'] as const;
export type LevelKey = (typeof LEVELS)[number];
