import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DB, User } from './types';
import { buildSeed } from './seed';

const DB_KEY = 'etop-db-v1';
const SESSION_KEY = 'etop-session-v1';

// Every collection on the DB must be an array. A malformed or partial record
// (valid JSON but missing collections) would otherwise crash views downstream.
const DB_COLLECTIONS: (keyof DB)[] = [
  'users',
  'classes',
  'assessments',
  'scores',
  'homework',
  'homeworkStatus',
  'vocabLists',
  'practice',
  'feedback',
];

function isValidDB(value: unknown): value is DB {
  if (!value || typeof value !== 'object') return false;
  const db = value as Record<string, unknown>;
  return DB_COLLECTIONS.every((key) => Array.isArray(db[key]));
}

function persist(db: DB): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (err) {
    // Storage can be full or blocked (private mode). Keep the app usable in
    // memory rather than crashing on write.
    console.warn('Could not persist the local database', err);
  }
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DB>;
      // Migrate databases saved before newer collections existed
      parsed.feedback ??= [];
      if (isValidDB(parsed)) return parsed;
      // Corrupt or partial record: fall through to a clean reseed.
      console.warn('Stored database was invalid, restoring demo data');
    }
  } catch {
    // fall through to a fresh seed
  }
  const db = buildSeed();
  persist(db);
  return db;
}

interface AppCtx {
  db: DB;
  mutate: (fn: (db: DB) => void) => void;
  resetDemo: () => void;
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB);
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));

  const mutate = useCallback((fn: (db: DB) => void) => {
    setDb((prev) => {
      const next = structuredClone(prev);
      fn(next);
      persist(next);
      return next;
    });
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = buildSeed();
    persist(fresh);
    setDb(fresh);
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const u = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
      if (!u) return false;
      localStorage.setItem(SESSION_KEY, u.id);
      setUserId(u.id);
      return true;
    },
    [db.users],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUserId(null);
  }, []);

  const user = useMemo(() => db.users.find((u) => u.id === userId) ?? null, [db.users, userId]);

  const value = useMemo(
    () => ({ db, mutate, resetDemo, user, login, logout }),
    [db, mutate, resetDemo, user, login, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
