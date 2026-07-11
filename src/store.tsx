import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DB, User } from './types';
import { buildSeed } from './seed';

const DB_KEY = 'etop-db-v1';
const SESSION_KEY = 'etop-session-v1';

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw) as DB;
      // Migrate databases saved before newer collections existed
      db.feedback ??= [];
      db.attendance ??= [];
      return db;
    }
  } catch {
    // fall through to a fresh seed
  }
  const db = buildSeed();
  localStorage.setItem(DB_KEY, JSON.stringify(db));
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
      localStorage.setItem(DB_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = buildSeed();
    localStorage.setItem(DB_KEY, JSON.stringify(fresh));
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
