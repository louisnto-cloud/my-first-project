// Outcomes math: mastery decay, growth, correlation. Pure and tested.

/**
 * Mastery decay: a skill untouched drifts from mastered toward review.
 * No decay for the first 30 idle days, then ×0.9 per further 30 days.
 */
export function decayedScore(score: number, updatedAt: Date, now: Date): number {
  const idleDays = Math.max(0, (now.getTime() - updatedAt.getTime()) / 86_400_000);
  if (idleDays <= 30) return score;
  const periods = (idleDays - 30) / 30;
  return score * Math.pow(0.9, periods);
}

export function masteryLabel(score: number): 'mastered' | 'developing' | 'review' {
  if (score >= 0.8) return 'mastered';
  if (score >= 0.5) return 'developing';
  return 'review';
}

/** Pearson correlation; null when fewer than 3 pairs or zero variance. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return Math.round((num / Math.sqrt(dx * dy)) * 1000) / 1000;
}

export const REFERRAL_CREDIT_VND = 200_000;
export const STALLED_AFTER_DAYS = 21;
