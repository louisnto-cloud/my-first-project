import { beforeEach, describe, expect, it } from 'vitest';
import { demoDispatch, resetDemo } from '../src/demo';

async function call(method: string, path: string, body?: unknown, token?: string) {
  return demoDispatch(method, path, body ?? undefined, token ?? null);
}
async function loginCode(code: string) {
  const r = await call('POST', '/auth/login-code', { code });
  return (r.json as { token?: string }).token ?? null;
}

beforeEach(() => resetDemo());

describe('demo engine — auth', () => {
  it('a student logs in with a UP code, a teacher with a GV code', async () => {
    const s = await call('POST', '/auth/login-code', { code: 'up1482' });
    expect(s.status).toBe(200);
    expect((s.json as { user: { role: string } }).user.role).toBe('student');
    const t = await call('POST', '/auth/login-code', { code: 'GV0001' });
    expect((t.json as { user: { role: string } }).user.role).toBe('tutor');
  });

  it('rejects unknown codes and unauthenticated calls', async () => {
    expect((await call('POST', '/auth/login-code', { code: 'NOPE99' })).status).toBe(401);
    expect((await call('GET', '/classes')).status).toBe(401);
  });
});

describe('demo engine — class isolation (the real @etop/domain policy)', () => {
  it('a student sees only their class, with teacher name and schedule', async () => {
    const tok = await loginCode('UP1482');
    const classes = (await call('GET', '/classes', undefined, tok!)).json as { id: string; teacherName: string; scheduleNote: string }[];
    expect(classes).toHaveLength(1);
    expect(classes[0]).toMatchObject({ id: 'up1', teacherName: 'Ms. Ha' });
    expect(classes[0].scheduleNote).toContain('Thứ 2');
  });

  it('a student from Up 3 cannot open an Up 1 assignment by ID (403)', async () => {
    const up1 = await loginCode('UP1482');
    const a = (await call('GET', '/classes/up1/assignments', undefined, up1!)).json as { id: string }[];
    const assignmentId = a[0].id;
    expect((await call('GET', `/assignments/${assignmentId}`, undefined, up1!)).status).toBe(200);

    const up3 = await loginCode('UP3171');
    expect((await call('GET', `/assignments/${assignmentId}`, undefined, up3!)).status).toBe(403);
    expect((await call('GET', '/classes/up1', undefined, up3!)).status).toBe(403);
  });

  it('a teacher sees only their own classes', async () => {
    const lyTok = await loginCode('GV0006'); // Ms. Ly
    const classes = (await call('GET', '/classes', undefined, lyTok!)).json as { name: string }[];
    expect(classes.map((c) => c.name).sort()).toEqual(['SJ5', 'SK1', 'Up 3']);
  });
});

describe('demo engine — full teaching loop', () => {
  it('teacher assigns from the bank, publishes, student does it and is graded', async () => {
    const ha = await loginCode('GV0004'); // teaches Up 1
    const created = await call('POST', '/classes/up1/assignments', { title: 'Demo Quiz', questionIds: ['q1', 'q2'] }, ha!);
    const aid = (created.json as { id: string }).id;
    expect((await call('POST', `/assignments/${aid}/publish`, {}, ha!)).status).toBe(200);

    const bao = await loginCode('UP1482');
    const sid = (await call('POST', `/assignments/${aid}/start`, {}, bao!)).json as { submissionId: string };
    await call('PATCH', `/submissions/${sid.submissionId}/answers`, { answers: { q1: 'am', q2: 'is' } }, bao!);
    const res = (await call('POST', `/submissions/${sid.submissionId}/submit`, {}, bao!)).json as { overall: number };
    expect(res.overall).toBe(100);
  });

  it('answers are never serialized to students', async () => {
    const bao = await loginCode('UP1482');
    const a = (await call('GET', '/classes/up1/assignments', undefined, bao!)).json as { id: string }[];
    const detail = await call('GET', `/assignments/${a[0].id}`, undefined, bao!);
    expect(JSON.stringify(detail.json)).not.toContain('"answer"');
  });

  it('teacher imports a student list and gets login codes; new student logs in to that class only', async () => {
    const ha = await loginCode('GV0004');
    const created = (await call('POST', '/classes/up1/students', { students: [{ name: 'Bé Mới', code: 'UP1900' }] }, ha!)).json as { created: { loginCode: string }[] };
    expect(created.created[0].loginCode).toBe('UP1900');
    const tok = await loginCode('UP1900');
    const classes = (await call('GET', '/classes', undefined, tok!)).json as { id: string }[];
    expect(classes.map((c) => c.id)).toEqual(['up1']);
  });
});

describe('demo engine — account lifecycle', () => {
  async function loginEmail(email: string) {
    const r = await call('POST', '/auth/login', { email, password: 'x' });
    return (r.json as { token?: string }).token ?? null;
  }

  it('owner creates a teacher; the GV code logs in; teachers cannot', async () => {
    const zhao = await loginEmail('zhao@etop.vn');
    const res = await call('POST', '/admin/teachers', { name: 'Ms. Hương' }, zhao!);
    expect(res.status).toBe(200);
    const issued = (res.json as { loginCode: string }).loginCode;
    expect(issued).toMatch(/^GV\d{4}$/);
    expect((await call('POST', '/auth/login-code', { code: issued })).status).toBe(200);

    const ha = await loginCode('GV0004');
    expect((await call('POST', '/admin/teachers', { name: 'X' }, ha!)).status).toBe(403);
    expect((await call('GET', '/admin/teachers', undefined, ha!)).status).toBe(403);
  });

  it('owner creates a class assigned to a teacher, who then sees it; reassignment moves it', async () => {
    const zhao = await loginEmail('zhao@etop.vn');
    const teachers = (await call('GET', '/admin/teachers', undefined, zhao!)).json as { id: string; name: string }[];
    const ha = teachers.find((t) => t.name === 'Ms. Ha')!;
    const ly = teachers.find((t) => t.name === 'Ms. Ly')!;

    const created = await call('POST', '/admin/classes', { name: 'SK9', scheduleNote: 'Ca 2-4', teacherId: ha.id }, zhao!);
    expect(created.status).toBe(200);
    const clsId = (created.json as { id: string }).id;

    const haTok = await loginCode('GV0004');
    let classes = (await call('GET', '/classes', undefined, haTok!)).json as { id: string }[];
    expect(classes.map((c) => c.id)).toContain(clsId);

    expect((await call('PATCH', `/admin/classes/${clsId}`, { teacherId: ly.id }, zhao!)).status).toBe(200);
    classes = (await call('GET', '/classes', undefined, haTok!)).json as { id: string }[];
    expect(classes.map((c) => c.id)).not.toContain(clsId);
    const lyTok = await loginCode('GV0006');
    const lyClasses = (await call('GET', '/classes', undefined, lyTok!)).json as { id: string }[];
    expect(lyClasses.map((c) => c.id)).toContain(clsId);
  });

  it('a teacher authors an API-shaped question; it lands in the bank; answers stay hidden', async () => {
    const ha = await loginCode('GV0004');
    const res = await call('POST', '/questions', {
      type: 'fill_blank', skill: 'grammar', unit: 'Unit 2',
      prompt: 'He ___ football.', payload: { sentence: 'He ___ football.', choices: ['plays', 'play'], answer: 'plays' },
    }, ha!);
    expect(res.status).toBe(200);
    const qid = (res.json as { id: string }).id;

    const bank = (await call('GET', '/questions', undefined, ha!)).json as { id: string }[];
    expect(bank.map((x) => x.id)).toContain(qid);

    // Assign it and confirm the student's serialization has no answer.
    const created = await call('POST', '/classes/up1/assignments', { title: 'Authored', questionIds: [qid] }, ha!);
    const aid = (created.json as { id: string }).id;
    await call('POST', `/assignments/${aid}/publish`, {}, ha!);
    const bao = await loginCode('UP1482');
    const detail = await call('GET', `/assignments/${aid}`, undefined, bao!);
    expect(JSON.stringify(detail.json)).not.toContain('"answer"');

    // Students cannot author.
    expect((await call('POST', '/questions', { type: 'mc', skill: 'grammar', payload: {} }, bao!)).status).toBe(403);
  });

  it('invite → parent registers → sees the child; invite is single-use', async () => {
    const ha = await loginCode('GV0004'); // teaches Up 1 (bao = UP1482 student s_up1_0? use roster)
    const roster = ((await call('GET', '/classes/up1', undefined, ha!)).json as { roster: { id: string; name: string }[] }).roster;
    const stu = roster[0];
    const inv = await call('POST', `/students/${stu.id}/invite`, {}, ha!);
    expect(inv.status).toBe(200);
    const { inviteCode } = inv.json as { inviteCode: string };
    expect(inviteCode).toMatch(/^PH-[A-Z2-9]{6}$/);

    // A teacher who doesn't teach the student cannot invite.
    const ly = await loginCode('GV0006');
    expect((await call('POST', `/students/${stu.id}/invite`, {}, ly!)).status).toBe(403);

    const reg = await call('POST', '/auth/register-parent', {
      inviteCode: inviteCode.toLowerCase(), name: 'Chị Thảo', email: 'thao.parent@gmail.com', password: 'matkhau1',
    });
    expect(reg.status).toBe(200);
    const tok = (reg.json as { token: string }).token;
    const kids = (await call('GET', '/parents/children', undefined, tok)).json as { id: string }[];
    expect(kids.map((k) => k.id)).toContain(stu.id);

    // Single-use + unknown invites rejected.
    expect((await call('POST', '/auth/register-parent', { inviteCode, name: 'Ai Đó', email: 'aido@gmail.com', password: 'whatever1' })).status).toBe(409);
    expect((await call('POST', '/auth/register-parent', { inviteCode: 'PH-ZZZZZZ', name: 'Ai Đó', email: 'aido@gmail.com', password: 'whatever1' })).status).toBe(404);
  });
});

describe('demo engine — practice', () => {
  it('practice events add points and a streak', async () => {
    const bao = await loginCode('UP1482');
    await call('POST', '/practice/events', { kind: 'lesson', points: 12, detail: { lessonId: 'found_l2', pct: 90 } }, bao!);
    const ach = (await call('GET', '/my/achievements', undefined, bao!)).json as { points: number; streak: number };
    expect(ach.points).toBeGreaterThanOrEqual(26); // 14 seeded + 12
    expect(ach.streak).toBe(1);
  });
});
