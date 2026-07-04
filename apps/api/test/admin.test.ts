import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createDb, type DB } from '../src/db.js';
import { buildServer } from '../src/server.js';
import { seedDemo } from '../src/seed.js';

let db: DB;
let app: FastifyInstance;
let zhao: string;
let lan: string;

async function login(email: string, password = 'etop123'): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
  expect(res.statusCode).toBe(200);
  return res.json().token as string;
}
const req = (method: 'GET' | 'POST' | 'PATCH', url: string, token?: string, payload?: object) =>
  app.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, ...(payload ? { payload } : {}) });

beforeAll(async () => {
  db = await createDb();
  await seedDemo(db);
  app = await buildServer(db);
  zhao = await login('zhao@etop.vn');
  lan = await login('lan@etop.vn');
});

describe('the account lifecycle — how people get into the platform', () => {
  let newTeacherId: string;
  let newTeacherCode: string;
  let newClassId: string;

  it('owner creates a teacher; a GV code is issued and works immediately', async () => {
    const res = await req('POST', '/admin/teachers', zhao, { name: 'Ms. Hương' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { id: string; loginCode: string };
    newTeacherId = body.id;
    newTeacherCode = body.loginCode;
    expect(newTeacherCode).toMatch(/^GV\d{4}$/);

    const codeLogin = await app.inject({ method: 'POST', url: '/auth/login-code', payload: { code: newTeacherCode } });
    expect(codeLogin.statusCode).toBe(200);
    expect(codeLogin.json().user.role).toBe('tutor');
  });

  it('teachers cannot create teachers; the teacher list shows codes to admins only', async () => {
    expect((await req('POST', '/admin/teachers', lan, { name: 'X' })).statusCode).toBe(403);
    expect((await req('GET', '/admin/teachers', lan)).statusCode).toBe(403);
    const list = (await req('GET', '/admin/teachers', zhao)).json() as { name: string; loginCode: string }[];
    expect(list.find((t) => t.name === 'Ms. Hương')?.loginCode).toBe(newTeacherCode);
  });

  it('owner creates a class and assigns the new teacher, who then sees it', async () => {
    const res = await req('POST', '/admin/classes', zhao, { name: 'SK3', scheduleNote: 'Ca 2-4-6 · Thứ 2, 4, 6', teacherId: newTeacherId });
    expect(res.statusCode).toBe(200);
    newClassId = res.json().id as string;

    const tok = (await app.inject({ method: 'POST', url: '/auth/login-code', payload: { code: newTeacherCode } })).json().token as string;
    const classes = (await req('GET', '/classes', tok)).json() as { id: string; name: string }[];
    expect(classes.map((c) => c.id)).toContain(newClassId);
    // …and the new teacher can immediately import students into it.
    const imported = await req('POST', `/classes/${newClassId}/students`, tok, { names: ['Bé Thử Nghiệm'] });
    expect((imported.json().created as unknown[]).length).toBe(1);
  });

  it('class reassignment moves visibility between teachers', async () => {
    expect((await req('PATCH', `/admin/classes/${newClassId}`, zhao, { teacherId: 'u_lan' })).statusCode).toBe(200);
    const lanClasses = (await req('GET', '/classes', lan)).json() as { id: string }[];
    expect(lanClasses.map((c) => c.id)).toContain(newClassId);
  });

  it('rejects classes assigned to unknown teachers', async () => {
    expect((await req('POST', '/admin/classes', zhao, { name: 'Bad', teacherId: 'nope' })).statusCode).toBe(400);
  });
});

describe('parent invite → self-registration', () => {
  let invite: string;

  it('the class teacher issues an invite code for a student', async () => {
    const res = await req('POST', '/students/s0/invite', lan);
    expect(res.statusCode).toBe(200);
    invite = res.json().inviteCode as string;
    expect(invite).toMatch(/^PH-[A-Z2-9]{6}$/);
    // A teacher who does not teach the student cannot invite.
    const david = await login('david@etop.vn');
    expect((await req('POST', '/students/s0/invite', david)).statusCode).toBe(403);
  });

  it('the parent registers with the invite, is linked to the child, and is logged in', async () => {
    const res = await req('POST', '/auth/register-parent', undefined, {
      inviteCode: invite.toLowerCase(), // case-insensitive
      name: 'Chị Thảo',
      email: 'thao.parent@gmail.com',
      password: 'matkhau-an-toan',
    });
    expect(res.statusCode).toBe(200);
    const token = res.json().token as string;

    const kids = (await req('GET', '/parents/children', token)).json() as { id: string }[];
    expect(kids.map((k) => k.id)).toContain('s0');
    // Real login with the chosen password works.
    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'thao.parent@gmail.com', password: 'matkhau-an-toan' } })).statusCode).toBe(200);
  });

  it('an invite is single-use and unknown invites are rejected', async () => {
    const reuse = await req('POST', '/auth/register-parent', undefined, {
      inviteCode: invite, name: 'Ai Đó', email: 'aido@gmail.com', password: 'whatever1',
    });
    expect(reuse.statusCode).toBe(409);
    const bad = await req('POST', '/auth/register-parent', undefined, {
      inviteCode: 'PH-ZZZZZZ', name: 'Ai Đó', email: 'aido@gmail.com', password: 'whatever1',
    });
    expect(bad.statusCode).toBe(404);
  });

  it('duplicate emails are rejected', async () => {
    const inv2 = (await req('POST', '/students/s0/invite', zhao)).json().inviteCode as string;
    const res = await req('POST', '/auth/register-parent', undefined, {
      inviteCode: inv2, name: 'Trùng Email', email: 'thao.parent@gmail.com', password: 'whatever1',
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('password change', () => {
  it('requires the current password, then the old one stops working', async () => {
    const token = await login('phuhuynh@etop.vn');
    expect((await req('POST', '/auth/change-password', token, { current: 'sai-roi', next: 'mat-khau-moi' })).statusCode).toBe(403);
    expect((await req('POST', '/auth/change-password', token, { current: 'etop123', next: 'mat-khau-moi' })).statusCode).toBe(200);

    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'phuhuynh@etop.vn', password: 'etop123' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'phuhuynh@etop.vn', password: 'mat-khau-moi' } })).statusCode).toBe(200);
  });
});
