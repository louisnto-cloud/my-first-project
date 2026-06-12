// ─── Progress: where she is on the road ──────────────────────────────────────

import { WORLDS } from '@/content/worlds';
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

/** The next thing on the road: the resume point if one exists, else the first
 *  incomplete lesson in pilgrimage order. Null when everything is complete. */
export function nextStep(save: SaveDoc): NextStep | null {
  if (save.position) {
    const found = allLessons().find(({ lesson }) => lesson.id === save.position!.lessonId);
    if (found && !save.completed[found.lesson.id]) {
      return { ...found, resuming: save.position.step > 0, step: save.position.step };
    }
  }
  const next = allLessons().find(({ lesson }) => !save.completed[lesson.id]);
  return next ? { ...next, resuming: false, step: 0 } : null;
}

export function worldProgress(world: World, save: SaveDoc): { done: number; total: number } {
  const done = world.lessons.filter((l) => save.completed[l.id]).length;
  return { done, total: world.lessons.length };
}

export function isWorldUnlocked(world: World, save: SaveDoc): boolean {
  const idx = WORLDS.findIndex((w) => w.id === world.id);
  if (idx <= 0) return true;
  const prev = WORLDS[idx - 1];
  if (prev.lessons.length === 0) return false;
  return prev.lessons.every((l) => save.completed[l.id]);
}

/** Steps walked = completed lessons, the XP of this app. */
export function stepsWalked(save: SaveDoc): number {
  return Object.keys(save.completed).length;
}
