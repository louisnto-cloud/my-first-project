import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

export type DB = PGlite;

const schemaSql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

/**
 * Create a database. No path → in-memory (tests). With a path → persisted
 * to disk (dev). Production swaps this for a hosted Postgres pool behind
 * the same query surface.
 */
export async function createDb(dataDir?: string): Promise<DB> {
  const db = dataDir ? new PGlite(dataDir) : new PGlite();
  await db.exec(schemaSql);
  return db;
}

export async function one<T>(db: DB, sql: string, params: unknown[] = []): Promise<T | null> {
  const res = await db.query<T>(sql, params);
  return res.rows[0] ?? null;
}

export async function many<T>(db: DB, sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await db.query<T>(sql, params);
  return res.rows;
}
