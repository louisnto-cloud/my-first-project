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

describe('demo engine — practice', () => {
  it('practice events add points and a streak', async () => {
    const bao = await loginCode('UP1482');
    await call('POST', '/practice/events', { kind: 'lesson', points: 12, detail: { lessonId: 'found_l2', pct: 90 } }, bao!);
    const ach = (await call('GET', '/my/achievements', undefined, bao!)).json as { points: number; streak: number };
    expect(ach.points).toBeGreaterThanOrEqual(26); // 14 seeded + 12
    expect(ach.streak).toBe(1);
  });
});
