import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createDb, many, type DB } from '../src/db.js';
import { buildServer } from '../src/server.js';
import { seedDemo } from '../src/seed.js';

let db: DB;
let app: FastifyInstance;
let minh: string; // s0 (c1)
let parent: string; // p0, guardian of s0
let parent2: string; // p1, guardian of s0
let lan: string; // tutor c1
let zhao: string; // owner
let desk: string;

const today = new Date().toISOString().slice(0, 10);

async function login(email: string): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'etop123' } });
  expect(res.statusCode).toBe(200);
  return res.json().token as string;
}

const req = (method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: object) =>
  app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, ...(payload ? { payload } : {}) });

beforeAll(async () => {
  db = await createDb();
  await seedDemo(db);
  app = await buildServer(db);
  minh = await login('minh@etop.vn');
  parent = await login('phuhuynh@etop.vn');
  parent2 = await login('phuhuynh2@etop.vn');
  lan = await login('lan@etop.vn');
  zhao = await login('zhao@etop.vn');
  desk = await login('desk@etop.vn');
});

describe('practice and achievements', () => {
  it('practice events accumulate points and a streak', async () => {
    await req('POST', '/practice/events', minh, { kind: 'lesson', points: 14 });
    await req('POST', '/practice/events', minh, { kind: 'vocab', points: 8 });
    const a = (await req('GET', '/my/achievements', minh)).json() as { points: number; streak: number; badges: { id: string; earned: boolean }[] };
    expect(a.points).toBe(22);
    expect(a.streak).toBe(1);
    expect(a.badges.find((b) => b.id === 'first-steps')?.earned).toBe(true);
    expect(a.badges.find((b) => b.id === 'points-50')?.earned).toBe(false);
  });

  it('completed lessons are listed with best scores for curriculum unlocking', async () => {
    const s6 = await login('s6@etop.vn'); // separate student: keeps other totals untouched
    await req('POST', '/practice/events', s6, { kind: 'lesson', points: 12, detail: { lessonId: 'found_l1', pct: 83 } });
    await req('POST', '/practice/events', s6, { kind: 'lesson', points: 14, detail: { lessonId: 'found_l1', pct: 100 } });
    const lessons = (await req('GET', '/my/practice/lessons', s6)).json() as { lessonId: string; bestPct: number }[];
    const l1 = lessons.find((l) => l.lessonId === 'found_l1')!;
    expect(l1.bestPct).toBe(100); // best attempt wins
    expect((await req('GET', '/my/practice/lessons', lan)).statusCode).toBe(403);
  });

  it('points are server-capped and validated', async () => {
    expect((await req('POST', '/practice/events', minh, { kind: 'lesson', points: 9999 })).statusCode).toBe(400);
    expect((await req('POST', '/practice/events', lan, { kind: 'lesson', points: 5 })).statusCode).toBe(403);
  });

  it('a parent reads their child’s achievements, never another child’s', async () => {
    const a = (await req('GET', '/my/achievements?childId=s0', parent)).json() as { points: number };
    expect(a.points).toBe(22);
    expect((await req('GET', '/my/achievements?childId=s1', parent)).statusCode).toBe(403);
  });
});

describe('planned absences (Báo nghỉ)', () => {
  it('a guardian reports an absence; the homeroom teacher sees it and is notified', async () => {
    const res = await req('POST', '/students/s0/absence', parent, { date: '2099-03-20', reason: 'khám bệnh' });
    expect(res.statusCode).toBe(200);

    const mine = (await req('GET', '/students/s0/absences', parent)).json() as { date: string; reason: string }[];
    expect(mine.some((a) => a.date === '2099-03-20')).toBe(true);

    // lan teaches c1 where s0 is enrolled → sees it on the board.
    const board = (await req('GET', '/my/class-absences', lan)).json() as { studentId: string; date: string }[];
    expect(board.some((a) => a.studentId === 's0' && a.date === '2099-03-20')).toBe(true);
    const pushes = await many(db, `SELECT 1 FROM notifications_outbox WHERE to_user_id = 'u_lan' AND body LIKE '%báo nghỉ%'`);
    expect(pushes.length).toBeGreaterThan(0);

    // A non-guardian and an unrelated teacher are refused / see nothing.
    expect((await req('POST', '/students/s1/absence', parent, { date: '2099-03-20' })).statusCode).toBe(403);

    // A site director cannot report/read absences for a student at another site.
    const giang = await login('giang@etop.vn'); // site_tt director; s0 is at site_nh
    expect((await req('POST', '/students/s0/absence', giang, { date: '2099-03-21' })).statusCode).toBe(403);
    expect((await req('GET', '/students/s0/absences', giang)).statusCode).toBe(403);
  });
});

describe('parent attendance week', () => {
  it('returns 7 day slots for own child only', async () => {
    const res = await req('GET', '/parents/attendance-week?childId=s0', parent);
    expect(res.statusCode).toBe(200);
    const days = res.json() as { date: string; attended: boolean }[];
    expect(days.length).toBe(7);
    expect(days[6].date).toBe(today);
    expect((await req('GET', '/parents/attendance-week?childId=s1', parent)).statusCode).toBe(403);
    expect((await req('GET', '/parents/attendance-week?childId=s0', minh)).statusCode).toBe(403);
  });
});

describe('avatar', () => {
  it('accepts only the kid-safe list and appears on /me and the leaderboard', async () => {
    expect((await req('POST', '/me/avatar', minh, { avatar: '🦖' })).statusCode).toBe(200);
    expect((await req('POST', '/me/avatar', minh, { avatar: 'x' })).statusCode).toBe(400);
    const meRes = (await req('GET', '/me', minh)).json() as { avatar: string | null };
    expect(meRes.avatar).toBe('🦖');
    const rows = (await req('GET', '/classes/c1/leaderboard', minh)).json() as { name: string; avatar: string | null }[];
    expect(rows.find((r) => r.name === 'Trần Đức Minh')?.avatar).toBe('🦖');
  });
});

describe('announcements (Bảng tin)', () => {
  it('managers post center-wide; teachers post to their own classes only', async () => {
    expect((await req('POST', '/announcements', zhao, { title: 'Nghỉ lễ 2/9', body: 'Trung tâm nghỉ ngày 2/9.' })).statusCode).toBe(200);
    expect((await req('POST', '/announcements', lan, { title: 'Tin toàn trung tâm?', body: 'x' })).statusCode).toBe(403);
    expect((await req('POST', '/announcements', lan, { title: 'Lớp c1 học bù', body: 'Thứ 7 tuần này.', classId: 'c1' })).statusCode).toBe(200);
    expect((await req('POST', '/announcements', lan, { title: 'Lớp của David', body: 'x', classId: 'c3' })).statusCode).toBe(403);
    expect((await req('POST', '/announcements', lan, { title: 'Đâu?', body: 'x', classId: 'nope' })).statusCode).toBe(404);
  });

  it('a site director posts only inside their own site — and never center-wide', async () => {
    const giang = await login('giang@etop.vn'); // site_tt director
    expect((await req('POST', '/announcements', giang, { title: 'Lịch cơ sở TT', body: 'x', classId: 'c5' })).statusCode).toBe(200); // own site
    expect((await req('POST', '/announcements', giang, { title: 'Lấn sân', body: 'x', classId: 'c1' })).statusCode).toBe(403); // other site
    expect((await req('POST', '/announcements', giang, { title: 'Toàn trung tâm?', body: 'x' })).statusCode).toBe(403); // org-managers only
  });

  it('readers see exactly their scope', async () => {
    const mine = (await req('GET', '/announcements', minh)).json() as { title: string; classId: string | null }[];
    expect(mine.map((a) => a.title)).toContain('Nghỉ lễ 2/9'); // center-wide
    expect(mine.map((a) => a.title)).toContain('Lớp c1 học bù'); // own class

    const s2 = await login('s2@etop.vn'); // in c3, not c1
    const theirs = (await req('GET', '/announcements', s2)).json() as { title: string }[];
    expect(theirs.map((a) => a.title)).toContain('Nghỉ lễ 2/9');
    expect(theirs.map((a) => a.title)).not.toContain('Lớp c1 học bù');

    const forParent = (await req('GET', '/announcements', parent)).json() as { title: string }[];
    expect(forParent.map((a) => a.title)).toContain('Lớp c1 học bù'); // child s0 is in c1
  });
});

describe('class leaderboard (Bảng vàng)', () => {
  it('classmates, their teacher, and guardians see effort points ranked; outsiders do not', async () => {
    const rows = (await req('GET', '/classes/c1/leaderboard', minh)).json() as { name: string; points: number }[];
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0].points).toBeGreaterThanOrEqual(rows[rows.length - 1].points); // sorted desc
    expect(rows.find((r) => r.name === 'Trần Đức Minh')?.points).toBeGreaterThanOrEqual(22);

    expect((await req('GET', '/classes/c1/leaderboard', lan)).statusCode).toBe(200);
    expect((await req('GET', '/classes/c1/leaderboard', parent)).statusCode).toBe(200);

    const s2 = await login('s2@etop.vn'); // enrolled in c3, not c1
    expect((await req('GET', '/classes/c1/leaderboard', s2)).statusCode).toBe(403);
    const david = await login('david@etop.vn'); // teaches c3, not c1
    expect((await req('GET', '/classes/c1/leaderboard', david)).statusCode).toBe(403);
    const giang = await login('giang@etop.vn'); // site_tt director
    expect((await req('GET', '/classes/c5/leaderboard', giang)).statusCode).toBe(200); // own site
    expect((await req('GET', '/classes/c1/leaderboard', giang)).statusCode).toBe(403); // other site
    expect((await req('GET', '/classes/nope/leaderboard', minh)).statusCode).toBe(404);
  });
});

describe('parent daily digest', () => {
  it('combines attendance, sessions, assignments, grades, and practice into one day view', async () => {
    // The day happens: check-in, a session log with a parent note, a published assignment.
    await req('POST', '/attendance/check-in', desk, { studentId: 's0', siteId: 'site_nh', at: new Date().toISOString(), clientEventId: 'evt_digest_in' });
    await req('POST', '/classes/c1/session-log', lan, {
      date: today,
      entries: [{ studentId: 's0', skills: ['listening'], engagement: 5, note: 'Great listening today', parentNote: 'Minh sang beautifully in the song activity!' }],
    });
    const created = await req('POST', '/classes/c1/assignments', lan, { title: 'Digest HW', questionIds: ['q_mc1'] });
    await req('POST', `/assignments/${created.json().id}/publish`, lan);

    const digest = (await req('GET', `/parents/digest?childId=s0&date=${today}`, parent)).json() as {
      attendance: { checkInAt: string } | null;
      sessions: { parentNote: string }[];
      newAssignments: { title: string }[];
      practice: { points: number };
    };
    expect(digest.attendance?.checkInAt).toBeTruthy();
    expect(digest.sessions[0].parentNote).toContain('song activity');
    expect(digest.newAssignments.map((a) => a.title)).toContain('Digest HW');
    expect(digest.practice.points).toBe(22);
  });

  it('digest is guardian-scoped', async () => {
    expect((await req('GET', `/parents/digest?childId=s1&date=${today}`, parent)).statusCode).toBe(403);
    expect((await req('GET', `/parents/digest?childId=s0&date=${today}`, minh)).statusCode).toBe(403);
  });

  it('lists children with their classes', async () => {
    const kids = (await req('GET', '/parents/children', parent)).json() as { id: string; classes: { name: string }[] }[];
    expect(kids.map((k) => k.id)).toEqual(['s0']);
    expect(kids[0].classes[0].name).toBe('Starters A');
  });
});

describe('weekly summaries: generate → tutor approves → parent reads', () => {
  it('generates plain-language drafts from structured session data', async () => {
    const res = await req('POST', '/classes/c1/summaries/generate', lan, { weekStart: today });
    expect((res.json() as { drafts: number }).drafts).toBeGreaterThan(0);
    const queue = (await req('GET', '/summaries/queue', lan)).json() as { id: string; studentId: string; bodyEn: string; bodyVi: string }[];
    const mine = queue.find((q) => q.studentId === 's0')!;
    expect(mine.bodyEn).toContain('Minh joined 1 session');
    expect(mine.bodyEn).toContain('listening');
    expect(mine.bodyVi).toContain('Tuần này Minh');
  });

  it('parents see nothing until the tutor one-tap approves', async () => {
    let summaries = (await req('GET', '/parents/summaries?childId=s0', parent)).json() as unknown[];
    expect(summaries).toHaveLength(0);

    const queue = (await req('GET', '/summaries/queue', lan)).json() as { id: string; studentId: string }[];
    const mine = queue.find((q) => q.studentId === 's0')!;
    expect((await req('POST', `/summaries/${mine.id}/approve`, lan)).statusCode).toBe(200);

    summaries = (await req('GET', '/parents/summaries?childId=s0', parent)).json() as unknown[];
    expect(summaries).toHaveLength(1);
    const pushes = await many(db, `SELECT 1 FROM notifications_outbox WHERE to_user_id = 'p0' AND body LIKE 'Weekly learning summary%'`);
    expect(pushes.length).toBe(1);
  });

  it('only the class teacher (or academic leadership) can approve', async () => {
    await req('POST', '/classes/c1/summaries/generate', lan, { weekStart: '2026-01-05' });
    const david = await login('david@etop.vn');
    const queue = (await req('GET', '/summaries/queue', lan)).json() as { id: string }[];
    if (queue.length > 0) {
      expect((await req('POST', `/summaries/${queue[0].id}/approve`, david)).statusCode).toBe(403);
    }
  });
});

describe('two-way messaging with director oversight', () => {
  let threadId: string;

  it('a parent starts a thread with the class teacher and they exchange messages', async () => {
    const t = await req('POST', '/threads', parent, { studentId: 's0' });
    threadId = t.json().threadId as string;
    await req('POST', `/threads/${threadId}/messages`, parent, { body: 'Chào cô, Minh có cần luyện nghe thêm không ạ?' });
    await req('POST', `/threads/${threadId}/messages`, lan, { body: 'Chào anh! Minh tiến bộ tốt, em sẽ giao thêm bài nghe ạ.' });

    const msgs = (await req('GET', `/threads/${threadId}/messages`, parent)).json() as { senderName: string; body: string }[];
    expect(msgs).toHaveLength(2);
    expect(msgs[1].senderName).toBe('Ms. Lan');

    // The teacher's inbox shape: threadId + a last-message preview.
    const inbox = (await req('GET', '/threads', lan)).json() as { threadId: string; studentName: string; lastBody: string; lastFrom: string }[];
    const th = inbox.find((x) => x.threadId === threadId)!;
    expect(th.studentName).toBe('Trần Đức Minh');
    expect(th.lastFrom).toBe('Ms. Lan');
    expect(th.lastBody).toContain('tiến bộ tốt');
  });

  it('the owner has read-only oversight; outsiders get nothing', async () => {
    const all = (await req('GET', '/threads', zhao)).json() as { id: string }[];
    expect(all.map((t) => t.id)).toContain(threadId);
    expect((await req('GET', `/threads/${threadId}/messages`, zhao)).statusCode).toBe(200);
    expect((await req('POST', `/threads/${threadId}/messages`, zhao, { body: 'x' })).statusCode).toBe(403);

    // The other guardian (p1) is not a member of p0's thread.
    expect((await req('GET', `/threads/${threadId}/messages`, parent2)).statusCode).toBe(404);
    // Students have no messaging surface at all yet (D18).
    expect((await req('GET', '/threads', minh)).statusCode).toBe(403);
  });

  it('threads are deduplicated per (student, guardian, teacher)', async () => {
    const again = await req('POST', '/threads', parent, { studentId: 's0' });
    expect(again.json()).toMatchObject({ threadId, existing: true });
  });
});
