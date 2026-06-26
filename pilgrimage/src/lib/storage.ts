// ─── Persistence: one versioned document in localStorage ────────────────────
// No accounts, no backend. Everything she does lives on her phone, with a
// JSON export/import so the pilgrimage survives a phone change.

export type Lang = 'en' | 'vi';

export interface JournalEntry {
  date: string; // ISO
  lessonId: string;
  text: string;
}

export interface SaveDoc {
  v: 1;
  name: string;
  lang: Lang;
  onboarded: boolean;
  /** lessonId -> ISO date completed */
  completed: Record<string, string>;
  /** Exact resume point, even mid-lesson, even offline, even days later. */
  position: { lessonId: string; step: number } | null;
  /** One candle per day a lesson was completed (ISO dates, yyyy-mm-dd). */
  candles: string[];
  /** worldId -> ISO date the passport stamp was earned */
  stamps: Record<string, string>;
  journal: JournalEntry[];
  /** Spaced-repetition seed: itemId -> times seen. */
  seen: Record<string, number>;
  sound: boolean;
  /** ISO date the Daily Reliquary was last opened. */
  reliquary: string;
  /** OCIA milestone dates: milestoneId -> yyyy-mm-dd. */
  ocia: Record<string, string>;
}

const KEY = 'pilgrimage.v1';

const fresh = (): SaveDoc => ({
  v: 1,
  name: '',
  lang: 'en',
  onboarded: false,
  completed: {},
  position: null,
  candles: [],
  stamps: {},
  journal: [],
  seen: {},
  sound: false,
  reliquary: '',
  ocia: {},
});

let cache: SaveDoc | null = null;
const listeners = new Set<() => void>();

function read(): SaveDoc {
  if (cache) return cache;
  if (typeof window === 'undefined') return fresh();
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...fresh(), ...(JSON.parse(raw) as SaveDoc) } : fresh();
  } catch {
    cache = fresh();
  }
  return cache;
}

export function getSave(): SaveDoc {
  return read();
}

export function updateSave(patch: Partial<SaveDoc> | ((d: SaveDoc) => Partial<SaveDoc>)): SaveDoc {
  const cur = read();
  const next = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) };
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode); the session still works in memory.
  }
  listeners.forEach((fn) => fn());
  return next;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function todayISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Light a candle for today (idempotent). */
export function lightCandle(): void {
  const today = todayISO();
  updateSave((d) => (d.candles.includes(today) ? {} : { candles: [...d.candles, today] }));
}

export function exportJSON(): string {
  return JSON.stringify(read(), null, 2);
}

export function importJSON(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as SaveDoc;
    if (parsed?.v !== 1) return false;
    cache = { ...fresh(), ...parsed };
    window.localStorage.setItem(KEY, JSON.stringify(cache));
    listeners.forEach((fn) => fn());
    return true;
  } catch {
    return false;
  }
}
