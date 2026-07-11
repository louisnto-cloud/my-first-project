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

  it('per-student assignment status is teacher-only and includes scores', async () => {
    const ha = await loginCode('GV0004');
    const rows = (await call('GET', '/assignments/a_demo1/status', undefined, ha!)).json as { name: string; status: string; overall: number | null }[];
    expect(rows.length).toBe(3);
    expect(rows.find((r) => r.name === 'Trần Khánh Vy')).toMatchObject({ status: 'graded', overall: 100 });
    expect(rows.find((r) => r.name === 'Nguyễn Gia Bảo')?.status).toBe('not_started');

    // Not the class teacher → 403; students → 403.
    const ly = await loginCode('GV0006');
    expect((await call('GET', '/assignments/a_demo1/status', undefined, ly!)).status).toBe(403);
    const bao = await loginCode('UP1482');
    expect((await call('GET', '/assignments/a_demo1/status', undefined, bao!)).status).toBe(403);
  });

  it('the gradebook aggregates graded work with real ETOP skill weights', async () => {
    const ha = await loginCode('GV0004');
    const rows = (await call('GET', '/classes/up1/gradebook', undefined, ha!)).json as { name: string; overall: number | null; skills: Record<string, { earned: number; possible: number }> }[];
    const vy = rows.find((r) => r.name === 'Trần Khánh Vy')!; // seeded 100/100 quiz
    expect(vy.overall).toBeGreaterThan(90);
    expect(vy.skills.grammar?.possible).toBeGreaterThan(0);
    const bao = rows.find((r) => r.name === 'Nguyễn Gia Bảo')!;
    expect(bao.overall).toBeNull(); // nothing graded yet

    const ly = await loginCode('GV0006');
    expect((await call('GET', '/classes/up1/gradebook', undefined, ly!)).status).toBe(403);
  });

  it('teacher assignment list shows live results (submitted count + average)', async () => {
    const ha = await loginCode('GV0004');
    const list = (await call('GET', '/classes/up1/assignments', undefined, ha!)).json as { id: string; submittedCount: number; rosterCount: number; avgOverall: number | null }[];
    const seeded = list.find((a) => a.id === 'a_demo1')!;
    expect(seeded.submittedCount).toBe(2); // two classmates seeded as graded
    expect(seeded.rosterCount).toBe(3);
    expect(seeded.avgOverall).toBe(88); // (100 + 75) / 2 rounded
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

describe('demo engine — writing & the grading queue', () => {
  it('students receive API-shaped type names so the shared Player renders everything', async () => {
    const bao = await loginCode('UP1482');
    const detail = (await call('GET', '/assignments/a_demo1', undefined, bao!)).json as { questions: { type: string }[] };
    const types = detail.questions.map((x) => x.type).sort();
    expect(types).toEqual(['listen_mc', 'mc', 'mc', 'reorder']); // not 'listen'/'order'
  });

  it('a writing submission goes to the teacher, who grades it with the rubric', async () => {
    const ha = await loginCode('GV0004');
    // Seeded: one classmate's writing is already waiting.
    let queue = (await call('GET', '/grading/queue', undefined, ha!)).json as { id: string; studentName: string; answerText: string }[];
    expect(queue.length).toBe(1);
    expect(queue[0].answerText).toContain('My family');

    // A second student submits writing → pendingReview, no instant score.
    const bao = await loginCode('UP1482');
    const start = (await call('POST', '/assignments/a_demo2/start', {}, bao!)).json as { submissionId: string };
    await call('PATCH', `/submissions/${start.submissionId}/answers`, { answers: { q9: 'I love my family. We are happy.' } }, bao!);
    const res = (await call('POST', `/submissions/${start.submissionId}/submit`, {}, bao!)).json as { pendingReview: boolean; overall?: number };
    expect(res.pendingReview).toBe(true);
    expect(res.overall).toBeUndefined();

    queue = (await call('GET', '/grading/queue', undefined, ha!)).json as typeof queue;
    expect(queue.length).toBe(2);

    // Rubric 2+2+2 → 100 for a one-question assignment.
    const graded = (await call('POST', `/submissions/${start.submissionId}/grade`, { rubric: { accuracy: 2, vocabulary: 2, structure: 2 }, comment: 'Tuyệt vời!' }, ha!)).json as { overall: number };
    expect(graded.overall).toBe(100);
    queue = (await call('GET', '/grading/queue', undefined, ha!)).json as typeof queue;
    expect(queue.length).toBe(1);

    // A teacher who doesn't run Up 1 sees none of it and cannot grade.
    const ly = await loginCode('GV0006');
    expect(((await call('GET', '/grading/queue', undefined, ly!)).json as unknown[]).length).toBe(0);
    expect((await call('POST', `/submissions/${queue[0].id}/grade`, { rubric: { accuracy: 2, vocabulary: 2, structure: 2 } }, ly!)).status).toBe(403);
  });
});

describe('demo engine — announcements', () => {
  it('scoping: center posts reach everyone, class posts stay in class; teachers cannot go center-wide', async () => {
    const bao = await loginCode('UP1482'); // Up 1
    const mine = (await call('GET', '/announcements', undefined, bao!)).json as { title: string }[];
    expect(mine.map((a) => a.title)).toContain('📣 Nghỉ lễ Quốc khánh 2/9');
    expect(mine.map((a) => a.title)).toContain('Tuần này học Unit 2 🎈');

    const long = await loginCode('UP3171'); // Up 3
    const theirs = (await call('GET', '/announcements', undefined, long!)).json as { title: string }[];
    expect(theirs.map((a) => a.title)).toContain('📣 Nghỉ lễ Quốc khánh 2/9');
    expect(theirs.map((a) => a.title)).not.toContain('Tuần này học Unit 2 🎈');

    const ha = await loginCode('GV0004');
    expect((await call('POST', '/announcements', { title: 'Toàn trung tâm?' }, ha!)).status).toBe(403);
    expect((await call('POST', '/announcements', { title: 'Nhắc lớp Up 1', body: 'Mai kiểm tra từ vựng.', classId: 'up1' }, ha!)).status).toBe(200);
    const after = (await call('GET', '/announcements', undefined, bao!)).json as { title: string }[];
    expect(after.map((a) => a.title)).toContain('Nhắc lớp Up 1');
  });
});

describe('demo engine — two-way messaging', () => {
  it('parent writes, the class teacher sees it in the inbox and replies; others are locked out', async () => {
    const parent = (await call('POST', '/auth/login', { email: 'phuhuynh@etop.vn', password: 'x' })).json as { token: string };
    const th = (await call('POST', '/threads', { studentId: 's_UP1482' }, parent.token)).json as { threadId: string };
    await call('POST', `/threads/${th.threadId}/messages`, { body: 'Bé hơi sốt, mai xin nghỉ ạ.' }, parent.token);

    const ha = await loginCode('GV0004');
    const inbox = (await call('GET', '/threads', undefined, ha!)).json as { threadId: string; studentName: string; lastBody: string }[];
    expect(inbox.length).toBe(1);
    expect(inbox[0].lastBody).toContain('xin nghỉ');
    await call('POST', `/threads/${inbox[0].threadId}/messages`, { body: 'Dạ vâng, chúc bé mau khỏe!' }, ha!);

    const msgs = (await call('GET', `/threads/${th.threadId}/messages`, undefined, parent.token)).json as { senderName: string; body: string }[];
    expect(msgs.map((m) => m.body)).toContain('Dạ vâng, chúc bé mau khỏe!');

    // A teacher who doesn't teach the child cannot read the thread.
    const ly = await loginCode('GV0006');
    expect((await call('GET', `/threads/${th.threadId}/messages`, undefined, ly!)).status).toBe(403);
    // A parent cannot open another child's thread.
    expect((await call('POST', '/threads', { studentId: 's_UP2614' }, parent.token)).status).toBe(403);
  });
});

describe('demo engine — weekly summary approval loop', () => {
  it('teacher approves a draft; the parent then sees it; other teachers see nothing', async () => {
    const parent = (await call('POST', '/auth/login', { email: 'phuhuynh@etop.vn', password: 'x' })).json as { token: string };
    let sums = (await call('GET', '/parents/summaries?childId=s_UP1482', undefined, parent.token)).json as { bodyVi: string }[];
    expect(sums.length).toBe(1); // only last week's approved one

    const ha = await loginCode('GV0004');
    const queue = (await call('GET', '/summaries/queue', undefined, ha!)).json as { id: string; studentName: string }[];
    expect(queue.length).toBe(1);
    expect(queue[0].studentName).toBe('Nguyễn Gia Bảo');
    expect((await call('POST', `/summaries/${queue[0].id}/approve`, {}, ha!)).status).toBe(200);

    sums = (await call('GET', '/parents/summaries?childId=s_UP1482', undefined, parent.token)).json as { bodyVi: string }[];
    expect(sums.length).toBe(2);

    const ly = await loginCode('GV0006');
    expect(((await call('GET', '/summaries/queue', undefined, ly!)).json as unknown[]).length).toBe(0);
  });
});

describe('demo engine — parent attendance week', () => {
  it('shows the seeded class-day pattern for the own child only', async () => {
    const parent = (await call('POST', '/auth/login', { email: 'phuhuynh@etop.vn', password: 'x' })).json as { token: string };
    const days = (await call('GET', '/parents/attendance-week?childId=s_UP1482', undefined, parent.token)).json as { attended: boolean }[];
    expect(days.length).toBe(7);
    expect(days.some((d) => d.attended)).toBe(true); // seeded history
    expect((await call('GET', '/parents/attendance-week?childId=s_UP2614', undefined, parent.token)).status).toBe(403);
  });
});

describe('demo engine — after-class notes', () => {
  it("the teacher's note lands in the parent's daily digest; outsiders cannot log", async () => {
    const ha = await loginCode('GV0004');
    const res = await call('POST', '/classes/up1/session-log', {
      date: new Date().toISOString().slice(0, 10),
      entries: [{ studentId: 's_UP1482', parentNote: 'Bé làm bài nhóm rất tốt hôm nay!' }],
    }, ha!);
    expect(res.status).toBe(200);

    const parent = (await call('POST', '/auth/login', { email: 'phuhuynh@etop.vn', password: 'x' })).json as { token: string };
    const digest = (await call('GET', '/parents/digest?childId=s_UP1482', undefined, parent.token)).json as { sessions: { parentNote: string }[] };
    expect(digest.sessions.map((s) => s.parentNote)).toContain('Bé làm bài nhóm rất tốt hôm nay!');

    const ly = await loginCode('GV0006'); // does not teach Up 1
    expect((await call('POST', '/classes/up1/session-log', { date: '2026-07-11', entries: [{ studentId: 's_UP1482', parentNote: 'x' }] }, ly!)).status).toBe(403);
  });
});

describe('demo engine — parent feedback (NPS)', () => {
  it('a parent scores once per term; the owner sees the score move and reads comments', async () => {
    const parent = (await call('POST', '/auth/login', { email: 'phuhuynh@etop.vn', password: 'x' })).json as { token: string };
    expect((await call('POST', '/nps', { term: '2026-07', score: 10, comment: 'Rất hài lòng!' }, parent.token)).status).toBe(200);
    expect((await call('POST', '/nps', { term: '2026-07', score: 3 }, parent.token)).status).toBe(409); // once per term

    const zhao = (await call('POST', '/auth/login', { email: 'zhao@etop.vn', password: 'x' })).json as { token: string };
    const sum = (await call('GET', '/nps/summary', undefined, zhao.token)).json as { responses: number; nps: number; comments: string[] };
    expect(sum.responses).toBe(4); // 3 seeded + 1
    expect(sum.comments).toContain('Rất hài lòng!');

    // Students cannot post NPS.
    const bao = await loginCode('UP1482');
    expect((await call('POST', '/nps', { term: '2026-07', score: 10 }, bao!)).status).toBe(403);
  });
});

describe('demo engine — kiosk (front desk)', () => {
  async function loginEmail(email: string) {
    const r = await call('POST', '/auth/login', { email, password: 'x' });
    return (r.json as { token?: string }).token ?? null;
  }

  it('front desk sees the roster; students cannot', async () => {
    const fd = await loginEmail('letan@etop.vn');
    const roster = (await call('GET', '/attendance/today?siteId=site_nh', undefined, fd!)).json as { id: string; status: string; className: string }[];
    expect(roster.length).toBe(10);
    expect(roster.every((r) => r.status === 'expected')).toBe(true);

    const bao = await loginCode('UP1482');
    expect((await call('GET', '/attendance/today?siteId=site_nh', undefined, bao!)).status).toBe(403);
  });

  it('offline queue sync is idempotent, and the parent sees the check-in live', async () => {
    const fd = await loginEmail('letan@etop.vn');
    const ev = { clientEventId: 'kio_t1', type: 'check_in', studentId: 's_UP1482', at: new Date().toISOString() };
    await call('POST', '/kiosk/sync', { siteId: 'site_nh', events: [ev] }, fd!);
    await call('POST', '/kiosk/sync', { siteId: 'site_nh', events: [ev] }, fd!); // replay must not duplicate

    const roster = (await call('GET', '/attendance/today?siteId=site_nh', undefined, fd!)).json as { id: string; status: string }[];
    expect(roster.find((r) => r.id === 's_UP1482')?.status).toBe('present');

    const parent = await loginEmail('phuhuynh@etop.vn');
    const digest = (await call('GET', '/parents/digest?childId=s_UP1482', undefined, parent!)).json as { attendance: { checkInAt: string | null } | null };
    expect(digest.attendance?.checkInAt).toBeTruthy();
  });

  it('PIN dismissal works; blocked pickup hard-stops; wrong PIN rejected', async () => {
    const fd = await loginEmail('letan@etop.vn');
    await call('POST', '/kiosk/sync', { siteId: 'site_nh', events: [{ clientEventId: 'kio_t2', type: 'check_in', studentId: 's_UP1482', at: new Date().toISOString() }] }, fd!);
    const pickups = (await call('GET', '/students/s_UP1482/pickups', undefined, fd!)).json as { id: string; blocked: boolean }[];
    const mom = pickups.find((p) => !p.blocked)!;
    const blocked = pickups.find((p) => p.blocked)!;

    const denied = await call('POST', '/attendance/dismiss', { studentId: 's_UP1482', pickupPersonId: blocked.id, pin: '0000' }, fd!);
    expect(denied.status).toBe(403);
    expect((denied.json as { reason: string }).reason).toBe('blocked_pickup');

    const badPin = await call('POST', '/attendance/dismiss', { studentId: 's_UP1482', pickupPersonId: mom.id, pin: '9999' }, fd!);
    expect((badPin.json as { reason: string }).reason).toBe('pin_invalid');

    expect((await call('POST', '/attendance/dismiss', { studentId: 's_UP1482', pickupPersonId: mom.id, pin: '1234' }, fd!)).status).toBe(200);
    const roster = (await call('GET', '/attendance/today?siteId=site_nh', undefined, fd!)).json as { id: string; status: string }[];
    expect(roster.find((r) => r.id === 's_UP1482')?.status).toBe('released');
  });
});

describe('demo engine — hardening regressions', () => {
  it('rotate-code is teacher-of-student/manager only (response contains the new code)', async () => {
    const bao = await loginCode('UP1482');
    expect((await call('POST', '/students/s_UP1739/rotate-code', {}, bao!)).status).toBe(403); // classmate cannot take over
    const ly = await loginCode('GV0006'); // does not teach Up 1
    expect((await call('POST', '/students/s_UP1739/rotate-code', {}, ly!)).status).toBe(403);
    const ha = await loginCode('GV0004');
    expect((await call('POST', '/students/s_UP1739/rotate-code', {}, ha!)).status).toBe(200);
  });

  it('a parent cannot read another family via digest; students cannot list the question bank', async () => {
    const parent = (await call('POST', '/auth/login', { email: 'phuhuynh@etop.vn', password: 'x' })).json as { token: string };
    expect((await call('GET', '/parents/digest?childId=s_UP2614', undefined, parent.token)).status).toBe(403);
    const bao = await loginCode('UP1482');
    expect((await call('GET', '/questions', undefined, bao!)).status).toBe(403);
  });

  it('replaying a finished assignment does not duplicate submissions or change stats', async () => {
    const bao = await loginCode('UP1482');
    const s1 = (await call('POST', '/assignments/a_demo1/start', {}, bao!)).json as { submissionId: string };
    await call('PATCH', `/submissions/${s1.submissionId}/answers`, { answers: { q1: 'am', q3: 'Under the table', q4: 'Good morning, teacher!', q5: ['My', 'name', 'is', 'Mai'] } }, bao!);
    const first = (await call('POST', `/submissions/${s1.submissionId}/submit`, {}, bao!)).json as { overall: number };
    expect(first.overall).toBe(100);

    // Re-open: same submission, idempotent submit, same score.
    const s2 = (await call('POST', '/assignments/a_demo1/start', {}, bao!)).json as { submissionId: string; resumed: boolean };
    expect(s2.submissionId).toBe(s1.submissionId);
    await call('PATCH', `/submissions/${s2.submissionId}/answers`, { answers: { q1: 'is' } }, bao!); // ignored
    const again = (await call('POST', `/submissions/${s2.submissionId}/submit`, {}, bao!)).json as { overall: number };
    expect(again.overall).toBe(100);

    const ha = await loginCode('GV0004');
    const list = (await call('GET', '/classes/up1/assignments', undefined, ha!)).json as { id: string; submittedCount: number; rosterCount: number }[];
    const row = list.find((a) => a.id === 'a_demo1')!;
    expect(row.submittedCount).toBe(3); // 2 seeded + bao, never more than the roster
    expect(row.submittedCount).toBeLessThanOrEqual(row.rosterCount);
  });
});

describe('demo engine — practice', () => {
  it('practice events add points and a streak', async () => {
    const bao = await loginCode('UP1482');
    await call('POST', '/practice/events', { kind: 'lesson', points: 12, detail: { lessonId: 'found_l2', pct: 90 } }, bao!);
    const ach = (await call('GET', '/my/achievements', undefined, bao!)).json as { points: number; streak: number; badges: { id: string; earned: boolean }[] };
    expect(ach.points).toBeGreaterThanOrEqual(26); // 14 seeded + 12
    expect(ach.streak).toBe(1);
    expect(ach.badges.find((b) => b.id === 'first-steps')?.earned).toBe(true);
    expect(ach.badges.find((b) => b.id === 'points-200')?.earned).toBe(false);
  });

  it('the class leaderboard ranks effort points; other classes cannot peek', async () => {
    const bao = await loginCode('UP1482');
    const rows = (await call('GET', '/classes/up1/leaderboard', undefined, bao!)).json as { name: string; points: number; avatar: string | null }[];
    expect(rows.length).toBe(3);
    expect(rows[0].name).toBe('Trần Khánh Vy'); // 22 seeded points
    expect(rows[0].points).toBe(22);
    expect(rows[0].avatar).toBeTruthy();

    const up3 = await loginCode('UP3171');
    expect((await call('GET', '/classes/up1/leaderboard', undefined, up3!)).status).toBe(403);
  });

  it('a student picks an avatar from the safe list; it shows on /me', async () => {
    const bao = await loginCode('UP1482');
    expect((await call('POST', '/me/avatar', { avatar: '🦖' }, bao!)).status).toBe(200);
    expect((await call('POST', '/me/avatar', { avatar: '💀' }, bao!)).status).toBe(400); // not in the kid-safe list
    const meRes = (await call('GET', '/me', undefined, bao!)).json as { avatar: string | null };
    expect(meRes.avatar).toBe('🦖');
  });
});
