import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Actor, Role } from '@etop/domain';
import { type DB, one } from './db.js';

// scrypt via node:crypto — zero native dependencies (DECISIONS.md D6).
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `s1:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [v, saltHex, hashHex] = stored.split(':');
  if (v !== 's1' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, SCRYPT);
  return timingSafeEqual(actual, expected);
}

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12h staff shift

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueToken(db: DB, userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  await db.query('INSERT INTO auth_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
    hashToken(token),
    userId,
    expires,
  ]);
  return token;
}

export interface ActorRow extends Actor {
  name: string;
  locale: string;
}

export async function actorFromToken(db: DB, token: string): Promise<ActorRow | null> {
  return one<ActorRow>(
    db,
    `SELECT u.id, u.org_id AS "orgId", u.role::text AS role, u.site_id AS "siteId",
            u.name, u.locale
       FROM auth_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = $1 AND t.expires_at > now() AND u.archived = false`,
    [hashToken(token)],
  ) as Promise<(ActorRow & { role: Role }) | null>;
}
