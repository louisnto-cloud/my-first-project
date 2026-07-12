// The 6-month Vietnamese reading & writing curriculum.
// Months live in their own modules to keep file sizes sane.
import type { Lesson, Month } from './types';
import { month1, month2 } from './months12';
import { month3, month4 } from './months34';
import { month5, month6 } from './months56';

export type { Exercise, Lesson, LessonKind, Month, Week } from './types';

export const CURRICULUM: Month[] = [month1, month2, month3, month4, month5, month6];

export function getAllLessons(): Lesson[] {
  return CURRICULUM.flatMap((m) => m.weeks.flatMap((w) => w.lessons));
}

export function getLessonById(id: string): Lesson | undefined {
  return getAllLessons().find((l) => l.id === id);
}

export const MONTH_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  red:     { bg: 'bg-red-600',     text: 'text-red-600',     border: 'border-red-300',     light: 'bg-red-50' },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-600',   border: 'border-amber-300',   light: 'bg-amber-50' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-300', light: 'bg-emerald-50' },
  orange:  { bg: 'bg-orange-500',  text: 'text-orange-600',  border: 'border-orange-300',  light: 'bg-orange-50' },
  rose:    { bg: 'bg-rose-500',    text: 'text-rose-600',    border: 'border-rose-300',    light: 'bg-rose-50' },
  violet:  { bg: 'bg-violet-600',  text: 'text-violet-600',  border: 'border-violet-300',  light: 'bg-violet-50' },
};
