import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const schemaSql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

export interface QueryResult<T> {
  rows: T[];
  affectedRows: number;
}

/** Driver-neutral database surface: PGlite for dev/tests, node-postgres
 * when DATABASE_URL is set (hosted). Only this file knows which. */
export interface DB {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  ping(): Promise<boolean>;
}

class PgliteDb implements DB {
  constructor(private readonly p: PGlite) {}
  async query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const r = await this.p.query<T>(sql, params);
    return { rows: r.rows, affectedRows: r.affectedRows ?? 0 };
  }
  async exec(sql: string): Promise<void> {
    await this.p.exec(sql);
  }
  async ping(): Promise<boolean> {
    try {
      await this.p.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

interface PgPoolLike {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
}

class PgDb implements DB {
  constructor(private readonly pool: PgPoolLike) {}
  async query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const r = await this.pool.query(sql, params);
    return { rows: r.rows as T[], affectedRows: r.rowCount ?? 0 };
  }
  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }
  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * No DATABASE_URL → PGlite (in-memory for tests, on-disk for dev).
 * DATABASE_URL set → hosted Postgres via node-postgres.
 * The bootstrap schema is idempotent (CREATE IF NOT EXISTS) on both.
 */
export async function createDb(dataDir?: string): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: url,
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false },
      max: 10,
    });
    const db = new PgDb(pool);
    await db.exec(schemaSql);
    return db;
  }
  const p = dataDir ? new PGlite(dataDir) : new PGlite();
  await p.exec(schemaSql);
  return new PgliteDb(p);
}

export async function one<T>(db: DB, sql: string, params: unknown[] = []): Promise<T | null> {
  const res = await db.query<T>(sql, params);
  return res.rows[0] ?? null;
}

export async function many<T>(db: DB, sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await db.query<T>(sql, params);
  return res.rows;
}
