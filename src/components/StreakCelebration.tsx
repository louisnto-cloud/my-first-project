import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { useI18n } from '../i18n';
import { streakOf } from '../lib';

const MILESTONES = [3, 7, 14, 30, 50, 100];
const STORAGE_KEY = 'etop-streak-celebrated-v1';

interface Milestone {
  streak: number;
  emoji: string;
  labelKey: string;
}

function pick(streak: number): Milestone | null {
  const hit = MILESTONES.filter((m) => streak >= m).pop();
  if (!hit) return null;
  const emoji = hit >= 100 ? '💎' : hit >= 50 ? '🏆' : hit >= 30 ? '🌟' : hit >= 14 ? '⚡' : hit >= 7 ? '🔥' : '✨';
  return { streak: hit, emoji, labelKey: `streak.${hit}` };
}

function loadCelebrated(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // fall through
  }
  return new Set();
}

function markCelebrated(next: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
}

/**
 * Renders once when the student first crosses a streak milestone this session.
 * Uses localStorage so we don't re-fire on every mount for the same milestone.
 */
export function StreakCelebration() {
  const { db, user } = useApp();
  const { t } = useI18n();
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    const streak = streakOf(db, user.id);
    const m = pick(streak);
    if (!m) return;
    const key = `${user.id}:${m.streak}`;
    const seen = loadCelebrated();
    if (seen.has(key)) return;
    seen.add(key);
    markCelebrated(seen);
    setMilestone(m);
  }, [db, user]);

  useEffect(() => {
    if (!milestone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMilestone(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [milestone]);

  if (!milestone) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur"
      onClick={() => setMilestone(null)}
    >
      <div
        className="animate-pop card flex max-w-xs flex-col items-center gap-3 py-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden="true" className="text-7xl">{milestone.emoji}</div>
        <div id="streak-title" className="text-2xl font-black text-violet-700 dark:text-violet-300">
          {milestone.streak} 🔥
        </div>
        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {t(milestone.labelKey)}
        </div>
        <button
          onClick={() => setMilestone(null)}
          autoFocus
          className="btn-primary mt-2 w-full"
        >
          {t('streak.keepGoing')}
        </button>
      </div>
    </div>
  );
}
