// ─── Progress: where she is on the road ──────────────────────────────────────

import { BONUS_WORLDS, MAIN_WORLDS, WORLDS } from '@/content/worlds';
import type { Lesson, World } from '@/content/types';
import type { SaveDoc } from '@/lib/storage';

export interface NextStep {
  world: World;
  lesson: Lesson;
  /** True when she left this lesson mid-way and we are resuming. */
  resuming: boolean;
  step: number;
}

export const allLessons = (): { world: World; lesson: Lesson }[] =>
  WORLDS.flatMap((world) => world.lessons.map((lesson) => ({ world, lesson })));

export function isWorldUnlocked(world: World, save: SaveDoc): boolean {
  if (BONUS_WORLDS.some((w) => w.id === world.id)) {
    // Bonus roads open off the main pilgrimage.
    if (world.id === 'asia') return !!save.stamps.sinai;
    return false;
  }
  const idx = MAIN_WORLDS.findIndex((w) => w.id === world.id);
  if (idx <= 0) return true;
  const prev = MAIN_WORLDS[idx - 1];
  if (prev.lessons.length === 0) return false;
  return prev.lessons.every((l) => save.completed[l.id]);
}

/** The next thing on the road: the resume point if one exists, else the first
 *  incomplete lesson in pilgrimage order (main road first, then open bonus
 *  roads). Null when everything open is complete. */
export function nextStep(save: SaveDoc): NextStep | null {
  if (save.position) {
    const found = allLessons().find(({ lesson }) => lesson.id === save.position!.lessonId);
    if (found && !save.completed[found.lesson.id]) {
      return { ...found, resuming: save.position.step > 0, step: save.position.step };
    }
  }
  const next = allLessons().find(
    ({ world, lesson }) => !save.completed[lesson.id] && isWorldUnlocked(world, save),
  );
  return next ? { ...next, resuming: false, step: 0 } : null;
}

export function worldProgress(world: World, save: SaveDoc): { done: number; total: number } {
  const done = world.lessons.filter((l) => save.completed[l.id]).length;
  return { done, total: world.lessons.length };
}

/** Steps walked = completed lessons, the XP of this app. */
export function stepsWalked(save: SaveDoc): number {
  return Object.keys(save.completed).length;
}
