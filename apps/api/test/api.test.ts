import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createDb, many, type DB } from '../src/db.js';
import { buildServer } from '../src/server.js';
import { seedDemo } from '../src/seed.js';
import { hashPassword } from '../src/auth.js';

let db: DB;
let app: FastifyInstance;

async function login(email: string, password = 'etop123'): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
  expect(res.statusCode).toBe(200);
  return res.json().token as string;
}

function get(url: string, token?: string) {
  return app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} });
}

beforeAll(async () => {
  db = await createDb(); // in-memory
  await seedDemo(db);
  // Second tenant to prove org isolation
  await db.query("INSERT INTO orgs (id, name) VALUES ('org_other', 'Other School')");
  await db.query("INSERT INTO sites (id, org_id, name) VALUES ('site_x', 'org_other', 'X')");
  await db.query(
    "INSERT INTO users (id, org_id, site_id, role, name, email, password_hash) VALUES ('ux_owner', 'org_other', null, 'owner', 'X Owner', 'owner@other.test', $1)",
    [hashPassword('etop123')],
  );
  await db.query(
    "INSERT INTO classes (id, org_id, site_id, teacher_id, name) VALUES ('cx', 'org_other', 'site_x', null, 'X Class')",
  );
  app = await buildServer(db);
});

describe('auth', () => {
  it('logs in with valid credentials', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'zhao@etop.vn', password: 'etop123' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe('owner');
  });

  it('rejects a wrong password and audits the failure', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'zhao@etop.vn', password: 'wrong-pass' } });
    expect(res.statusCode).toBe(401);
    const rows = await many(db, "SELECT 1 FROM audit_log WHERE action = 'auth.login_failed'");
    expect(rows.length).toBeGreaterThan(0);
  });

  it('rejects requests without a token', async () => {
    expect((await get('/me')).statusCode).toBe(401);
    expect((await get('/classes')).statusCode).toBe(401);
  });

  it('stores no plaintext passwords', async () => {
    const rows = await many<{ password_hash: string }>(db, 'SELECT password_hash FROM users');
    for (const r of rows) {
      expect(r.password_hash).toMatch(/^s1:[0-9a-f]{32}:[0-9a-f]{64}$/);
      expect(r.password_hash).not.toContain('etop123');
    }
  });
});

describe('class scoping (Phase 1 definition of done)', () => {
  it('student sees only their own class in listings', async () => {
    const token = await login('minh@etop.vn'); // s0, enrolled in c1
    const res = await get('/classes', token);
    expect(res.statusCode).toBe(200);
    const ids = (res.json() as { id: string }[]).map((c) => c.id);
    expect(ids).toEqual(['c1']);
  });

  it('student can open their own class', async () => {
    const token = await login('minh@etop.vn');
    expect((await get('/classes/c1', token)).statusCode).toBe(200);
  });

  it('DoD: student requesting another class by ID gets a server-side 403, and it is audited', async () => {
    const token = await login('minh@etop.vn');
    const res = await get('/classes/c4', token);
    expect(res.statusCode).toBe(403);
    const denials = await many(
      db,
      "SELECT 1 FROM audit_log WHERE action = 'access.denied' AND entity = 'class' AND entity_id = 'c4' AND actor_id = 's0'",
    );
    expect(denials.length).toBeGreaterThan(0);
  });

  it('tutor sees only classes they teach; 403 on a colleague’s class', async () => {
    const token = await login('lan@etop.vn');
    const ids = ((await get('/classes', token)).json() as { id: string }[]).map((c) => c.id).sort();
    expect(ids).toEqual(['c1', 'c2', 'up1']);
    expect((await get('/classes/c3', token)).statusCode).toBe(403);
  });

  it('owner sees every class in the org but cannot see another tenant', async () => {
    const token = await login('zhao@etop.vn');
    const ids = ((await get('/classes', token)).json() as { id: string }[]).map((c) => c.id);
    expect(ids).toHaveLength(9); // 6 demo classes + Up 1/2/3
    // Cross-tenant by ID: 404, never data
    expect((await get('/classes/cx', token)).statusCode).toBe(404);
  });

  it('other tenant cannot see ETOP classes', async () => {
    const token = await login('owner@other.test');
    const res = await get('/classes', token);
    expect((res.json() as unknown[]).length).toBe(1);
    expect((await get('/classes/c1', token)).statusCode).toBe(404);
  });
});

describe('student profile scoping', () => {
  it('parent sees own child, 403 on another child', async () => {
    const token = await login('phuhuynh@etop.vn');
    expect((await get('/students/s0', token)).statusCode).toBe(200);
    expect((await get('/students/s1', token)).statusCode).toBe(403);
  });

  it('tutor sees students in their classes only', async () => {
    const token = await login('lan@etop.vn'); // teaches c1 (s0, s6, …) not c4
    expect((await get('/students/s0', token)).statusCode).toBe(200); // s0 in c1
    expect((await get('/students/s3', token)).statusCode).toBe(403); // s3 in c4
  });

  it('student cannot read a classmate’s profile', async () => {
    const token = await login('minh@etop.vn');
    expect((await get('/students/s6', token)).statusCode).toBe(403);
  });
});

describe('audit log', () => {
  it('owner can read, tutor cannot', async () => {
    const owner = await login('zhao@etop.vn');
    const tutor = await login('lan@etop.vn');
    expect((await get('/audit', owner)).statusCode).toBe(200);
    expect((await get('/audit', tutor)).statusCode).toBe(403);
  });

  it('records logins', async () => {
    const res = await get('/audit', await login('zhao@etop.vn'));
    const actions = (res.json() as { action: string }[]).map((a) => a.action);
    expect(actions).toContain('auth.login');
  });
});
