import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createDb, type DB } from '../src/db.js';
import { buildServer } from '../src/server.js';
import { seedDemo } from '../src/seed.js';

let db: DB;
let app: FastifyInstance;

const req = (method: 'GET' | 'POST', url: string, token?: string, payload?: object) =>
  app.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, ...(payload ? { payload } : {}) });

async function codeLogin(code: string) {
  return app.inject({ method: 'POST', url: '/auth/login-code', payload: { code } });
}

beforeAll(async () => {
  db = await createDb();
  await seedDemo(db);
  app = await buildServer(db);
});

describe('login by code (mã số học viên / mã số giáo viên)', () => {
  it('a student logs in with just their code — case-insensitive, no password', async () => {
    const res = await codeLogin('hv0001'); // Minh
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({ id: 's0', role: 'student' });
  });

  it('a teacher logs in with their GV code', async () => {
    const res = await codeLogin('GV0001'); // Ms. Lan
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({ id: 'u_lan', role: 'tutor' });
  });

  it('wrong codes and non-code roles are rejected', async () => {
    expect((await codeLogin('HV9999')).statusCode).toBe(401);
    expect((await codeLogin('xx')).statusCode).toBe(400);
    // Owner/parents have no codes — email+password only.
    const owner = await db.query(`SELECT login_code FROM users WHERE id = 'u_zhao'`);
    expect((owner.rows[0] as { login_code: string | null }).login_code).toBeNull();
  });

  it('code-login students see only their own class, with teacher name and schedule', async () => {
    const token = (await codeLogin('HV0001')).json().token as string;
    const classes = (await req('GET', '/classes', token)).json() as { id: string; teacherName: string; scheduleNote: string }[];
    expect(classes).toHaveLength(1);
    expect(classes[0]).toMatchObject({ id: 'c1', teacherName: 'Ms. Lan' });
    expect(classes[0].scheduleNote).toContain('Thứ 2');
    // And the hard scoping still holds for a code login.
    expect((await req('GET', '/classes/c4', token)).statusCode).toBe(403);
  });
});

describe('roster management', () => {
  let lan: string;

  it('teacher sees student codes on their roster; students do not', async () => {
    lan = (await codeLogin('GV0001')).json().token as string;
    const cls = (await req('GET', '/classes/c1', lan)).json() as { roster: { id: string; loginCode?: string }[] };
    expect(cls.roster.find((r) => r.id === 's0')?.loginCode).toBe('HV0001');

    const minh = (await codeLogin('HV0001')).json().token as string;
    const asStudent = (await req('GET', '/classes/c1', minh)).json() as { roster: { loginCode?: string }[] };
    expect(asStudent.roster.every((r) => r.loginCode === undefined)).toBe(true);
  });

  it('teacher pastes a name list → accounts with codes are created and enrolled', async () => {
    const res = await req('POST', '/classes/c1/students', lan, { names: ['Nguyễn Mới Một', 'Trần Mới Hai'] });
    const created = res.json().created as { id: string; name: string; loginCode: string }[];
    expect(created).toHaveLength(2);
    expect(created[0].loginCode).toMatch(/^HV\d{4}$/);

    // The new student can log in immediately and sees exactly class c1.
    const tok = (await codeLogin(created[0].loginCode)).json().token as string;
    const classes = (await req('GET', '/classes', tok)).json() as { id: string }[];
    expect(classes.map((c) => c.id)).toEqual(['c1']);
  });

  it('teachers cannot add students to a colleague’s class', async () => {
    expect((await req('POST', '/classes/c3/students', lan, { names: ['X'] })).statusCode).toBe(403);
  });

  it('rotating a student code kills the old one instantly', async () => {
    const rotated = await req('POST', '/students/s0/rotate-code', lan);
    const newCode = rotated.json().loginCode as string;
    expect(newCode).toMatch(/^HV\d{4}$/);
    expect((await codeLogin('HV0001')).statusCode).toBe(401); // old code dead
    expect((await codeLogin(newCode)).statusCode).toBe(200);
  });
});
