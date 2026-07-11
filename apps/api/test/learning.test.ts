import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createDb, many, type DB } from '../src/db.js';
import { buildServer } from '../src/server.js';
import { seedDemo } from '../src/seed.js';

let db: DB;
let app: FastifyInstance;
let lan: string;    // tutor of c1, c2 (site_nh)
let david: string;  // tutor of c3, c4
let minh: string;   // s0, enrolled in c1
let s1tok: string;  // s1, enrolled in c2 — the "Class B student"
let zhao: string;   // owner

async function login(email: string): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'etop123' } });
  expect(res.statusCode).toBe(200);
  return res.json().token as string;
}

const req = (method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: object) =>
  app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, ...(payload ? { payload } : {}) });

/** Creates a published 4-question assignment in c1 (one per broad skill). */
async function publishStandard(title: string, opts: Partial<{ dueAt: string; showResults: string; attemptsAllowed: number; fixedOrder: boolean }> = {}) {
  const create = await req('POST', '/classes/c1/assignments', lan, {
    title,
    questionIds: ['q_mc1', 'q_li1', 'q_fb1', 'q_ro1'],
    ...opts,
  });
  expect(create.statusCode).toBe(200);
  const id = create.json().id as string;
  expect((await req('POST', `/assignments/${id}/publish`, lan)).statusCode).toBe(200);
  return id;
}

beforeAll(async () => {
  db = await createDb();
  await seedDemo(db);
  app = await buildServer(db);
  lan = await login('lan@etop.vn');
  david = await login('david@etop.vn');
  minh = await login('minh@etop.vn');
  s1tok = await login('s1@etop.vn');
  zhao = await login('zhao@etop.vn');
});

describe('taxonomy', () => {
  it('serves the skills knowledge graph with prerequisite edges', async () => {
    const res = await req('GET', '/taxonomy', lan);
    const { skills, prereqs } = res.json() as { skills: unknown[]; prereqs: { skillId: string; prereqId: string }[] };
    expect(skills.length).toBe(16); // 4 strands × 4 levels
    expect(prereqs.length).toBe(12); // chain of 3 edges per strand
    expect(prereqs).toContainEqual({ skillId: 'sk_grammar_a1_movers', prereqId: 'sk_grammar_pre_a1_starters' });
  });
});

describe('class join codes', () => {
  it('a student joins with a code, teacher approves, student is enrolled', async () => {
    // s1 is in c2; joins c1 with its code.
    const join = await req('POST', '/classes/join', s1tok, { code: 'bear42' }); // case-insensitive
    expect(join.json()).toMatchObject({ status: 'pending', className: 'Starters A' });

    const requests = (await req('GET', '/classes/c1/join-requests', lan)).json() as { id: string; studentId: string }[];
    const mine = requests.find((r) => r.studentId === 's1')!;
    expect(mine).toBeDefined();

    expect((await req('POST', `/join-requests/${mine.id}/decide`, lan, { approve: true })).statusCode).toBe(200);
    const enrolled = await many(db, `SELECT 1 FROM enrollments WHERE class_id = 'c1' AND student_id = 's1'`);
    expect(enrolled.length).toBe(1);
    // Clean up: s1 must remain a pure Class-B student for the isolation tests.
    await db.query(`DELETE FROM enrollments WHERE class_id = 'c1' AND student_id = 's1'`);
  });

  it('rotating the code kills the old one instantly', async () => {
    const { code } = (await req('POST', '/classes/c1/rotate-code', lan)).json() as { code: string };
    expect(code).toMatch(/^[A-Z]{4}\d{2}$/);
    const old = await req('POST', '/classes/join', s1tok, { code: 'BEAR42' });
    expect(old.statusCode).toBe(404);
    const fresh = await req('POST', '/classes/join', s1tok, { code });
    expect(fresh.statusCode).toBe(200);
    await db.query(`DELETE FROM join_requests WHERE student_id = 's1'`);
  });

  it('teachers cannot rotate codes for classes they do not own', async () => {
    expect((await req('POST', '/classes/c1/rotate-code', david)).statusCode).toBe(403);
  });
});

describe('PART C DEFINITION OF DONE: hard class scoping', () => {
  let assignmentId: string;

  it('teacher publishes to Class A; every member is notified', async () => {
    assignmentId = await publishStandard('Unit 1 Review');
    const pushes = await many(db, `SELECT 1 FROM notifications_outbox WHERE body = 'New assignment: Unit 1 Review'`);
    expect(pushes.length).toBeGreaterThan(0);
  });

  it('a Class A student sees and can open it — without answers in the payload', async () => {
    const list = (await req('GET', '/classes/c1/assignments', minh)).json() as { id: string }[];
    expect(list.map((a) => a.id)).toContain(assignmentId);

    const detail = await req('GET', `/assignments/${assignmentId}`, minh);
    expect(detail.statusCode).toBe(200);
    const text = detail.body;
    // The serialized payload must never contain correct answers.
    expect(text).not.toContain('"answer"');
    expect(text).not.toContain('"answers"');
    const qs = detail.json().questions as { type: string; options?: string[] }[];
    expect(qs).toHaveLength(4);
  });

  it('DoD: a Class B student receives nothing and is rejected by the API on direct ID access', async () => {
    // Listing for their own class contains nothing from Class A.
    const ownList = (await req('GET', '/classes/c2/assignments', s1tok)).json() as { id: string }[];
    expect(ownList.find((a) => a.id === assignmentId)).toBeUndefined();

    // Listing Class A directly: forbidden.
    expect((await req('GET', '/classes/c1/assignments', s1tok)).statusCode).toBe(403);

    // Direct fetch by ID: forbidden, and audited.
    expect((await req('GET', `/assignments/${assignmentId}`, s1tok)).statusCode).toBe(403);

    // Attempting to start it: forbidden.
    expect((await req('POST', `/assignments/${assignmentId}/start`, s1tok)).statusCode).toBe(403);

    const denials = await many(db, `SELECT 1 FROM audit_log WHERE action = 'access.denied' AND entity = 'assignment' AND entity_id = $1 AND actor_id = 's1'`, [assignmentId]);
    expect(denials.length).toBeGreaterThan(0);
  });

  it('another tenant cannot even learn the assignment exists', async () => {
    await db.query("INSERT INTO orgs (id, name) VALUES ('org_x', 'X')");
    await db.query(
      "INSERT INTO users (id, org_id, role, name, email, password_hash) SELECT 'x_owner', 'org_x', 'owner', 'X', 'x@x.test', password_hash FROM users WHERE id = 'u_zhao'",
    );
    const xtok = await login('x@x.test');
    expect((await req('GET', `/assignments/${assignmentId}`, xtok)).statusCode).toBe(404);
  });
});

describe('assignment lifecycle: start, autosave, submit, grade', () => {
  let aid: string;
  let sid: string;

  it('student starts and answers are autosaved continuously', async () => {
    aid = await publishStandard('Lifecycle Test', { showResults: 'instant', attemptsAllowed: 1 });
    const start = await req('POST', `/assignments/${aid}/start`, minh);
    sid = start.json().submissionId as string;

    await req('PATCH', `/submissions/${sid}/answers`, minh, { answers: { q_mc1: 'am' } });
    await req('PATCH', `/submissions/${sid}/answers`, minh, { answers: { q_li1: 'Good night, teacher!' } }); // wrong
    await req('PATCH', `/submissions/${sid}/answers`, minh, { answers: { q_fb1: 'under', q_ro1: ['My', 'name', 'is', 'Mai'] } });

    const saved = await many<{ answers: Record<string, unknown> }>(db, 'SELECT answers FROM submissions WHERE id = $1', [sid]);
    expect(Object.keys(saved[0].answers)).toHaveLength(4); // merged, nothing lost
  });

  it('submit autogrades closed types and computes the ETOP-weighted overall', async () => {
    const res = await req('POST', `/submissions/${sid}/submit`, minh);
    const body = res.json() as { status: string; autoPoints: number; autoPossible: number; overall: number };
    expect(body.status).toBe('graded'); // no manual questions in this one
    expect(body.autoPoints).toBe(3); // listening wrong
    expect(body.autoPossible).toBe(4);
    // grammar 1/1, listening 0/1, reading 1/1, writing(reorder) 1/1
    // weights .3/.3/.2/.2 → (0.3 + 0 + 0.2 + 0.2) / 1.0 = 70%
    expect(body.overall).toBe(70);
  });

  it('attempt limits are enforced', async () => {
    expect((await req('POST', `/assignments/${aid}/start`, minh)).statusCode).toBe(409);
  });

  it('mastery was updated from the submission', async () => {
    const mastery = (await req('GET', '/students/s0/mastery', lan)).json() as { skill: string; score: number }[];
    const grammar = mastery.find((m) => m.skill === 'grammar')!;
    const listening = mastery.find((m) => m.skill === 'listening')!;
    expect(grammar.score).toBeGreaterThan(0.9);
    expect(listening.score).toBeLessThan(0.5);
  });

  it('late submissions are flagged but allowed', async () => {
    const lateAid = await publishStandard('Late Test', { dueAt: new Date(Date.now() - 3600_000).toISOString() });
    const sub = (await req('POST', `/assignments/${lateAid}/start`, minh)).json().submissionId as string;
    await req('PATCH', `/submissions/${sub}/answers`, minh, { answers: { q_mc1: 'am' } });
    const res = await req('POST', `/submissions/${sub}/submit`, minh);
    expect(res.json().late).toBe(true);
  });
});

describe('per-student variation engine', () => {
  it('two students see different papers; fixed mode shows identical ones', async () => {
    // s6 is also in c1.
    const s6 = await login('s6@etop.vn');
    const aid = await publishStandard('Variation Test');

    const a = (await req('GET', `/assignments/${aid}`, minh)).json().questions as { id: string; options?: string[]; words?: string[] }[];
    const b = (await req('GET', `/assignments/${aid}`, s6)).json().questions as { id: string; options?: string[]; words?: string[] }[];
    const orderA = a.map((q) => q.id).join();
    const orderB = b.map((q) => q.id).join();
    const optionsA = JSON.stringify(a.map((q) => q.options ?? q.words));
    const optionsB = JSON.stringify(b.map((q) => q.options ?? q.words));
    expect(orderA !== orderB || optionsA !== optionsB).toBe(true);

    // Deterministic per student: refetching gives the same paper.
    const a2 = (await req('GET', `/assignments/${aid}`, minh)).json().questions as { id: string }[];
    expect(a2.map((q) => q.id).join()).toBe(orderA);

    const fixedAid = await publishStandard('Fixed Test', { fixedOrder: true });
    const fa = (await req('GET', `/assignments/${fixedAid}`, minh)).json().questions as { id: string; options?: string[] }[];
    const fb = (await req('GET', `/assignments/${fixedAid}`, s6)).json().questions as { id: string; options?: string[] }[];
    expect(fa.map((q) => q.id).join()).toBe(fb.map((q) => q.id).join());
    expect(JSON.stringify(fa.map((q) => q.options))).toBe(JSON.stringify(fb.map((q) => q.options)));
  });

  it('one-tap clone produces an editable draft', async () => {
    const aid = await publishStandard('To Clone');
    const clone = await req('POST', `/assignments/${aid}/clone`, lan);
    expect(clone.json().status).toBe('draft');
  });
});

describe('grading queue and rubric', () => {
  it('open question types go to the queue; rubric taps produce the final grade', async () => {
    const create = await req('POST', '/classes/c1/assignments', lan, {
      title: 'Writing Task', questionIds: ['q_mc1', 'q_pi1'], showResults: 'after_review',
    });
    const aid = create.json().id as string;
    await req('POST', `/assignments/${aid}/publish`, lan);

    const sid = (await req('POST', `/assignments/${aid}/start`, minh)).json().submissionId as string;
    await req('PATCH', `/submissions/${sid}/answers`, minh, { answers: { q_mc1: 'am', q_pi1: 'I can see a yellow school. There is a teacher.' } });
    const submitted = (await req('POST', `/submissions/${sid}/submit`, minh)).json() as { status: string; resultsVisible?: boolean };
    expect(submitted.status).toBe('submitted'); // awaiting review
    expect(submitted.resultsVisible).toBe(false); // after_review hides scores

    const queue = (await req('GET', '/grading/queue', lan)).json() as { id: string }[];
    expect(queue.map((s) => s.id)).toContain(sid);

    const graded = await req('POST', `/submissions/${sid}/grade`, lan, {
      rubric: { accuracy: 2, vocabulary: 1, structure: 2 }, comment: 'Lovely sentences!',
    });
    expect(graded.statusCode).toBe(200);
    // grammar 1/1 → 0.3; writing (5/6)/1 → 0.8333 * 0.2; weights renormalized /0.5
    expect(graded.json().overall).toBeCloseTo(93.3, 0);

    // David cannot grade Lan's class: authorization fires before any state check.
    expect((await req('POST', `/submissions/${sid}/grade`, david, { rubric: { accuracy: 0, vocabulary: 0, structure: 0 } })).statusCode).toBe(403);

    // The persisted overall now powers teacher stats and the student's own view.
    const teacherList = (await req('GET', '/classes/c1/assignments', lan)).json() as { id: string; submittedCount: number; avgOverall: number | null }[];
    const row = teacherList.find((a) => a.id === aid)!;
    expect(row.submittedCount).toBe(1);
    expect(row.avgOverall).toBe(93);

    const myList = (await req('GET', '/classes/c1/assignments', minh)).json() as { id: string; myStatus: string; myOverall: number | null; myComment: string | null }[];
    const mine = myList.find((a) => a.id === aid)!;
    expect(mine.myStatus).toBe('graded');
    expect(mine.myOverall).toBeCloseTo(93.3, 0);
    expect(mine.myComment).toBe('Lovely sentences!');
  });
});

describe('shared question bank', () => {
  it('a teacher offers a question; others see it only after manager approval', async () => {
    const created = await req('POST', '/questions', lan, {
      type: 'mc', skill: 'grammar', prompt: 'Shared MC?', payload: { options: ['a', 'b'], answer: 'a' }, copyrightAck: true,
    });
    const qid = created.json().id as string;

    // David can't see Lan's private question, and can't share it either.
    const before = (await req('GET', '/questions', david)).json() as { id: string }[];
    expect(before.map((q) => q.id)).not.toContain(qid);
    expect((await req('POST', `/questions/${qid}/share`, david)).statusCode).toBe(403);

    // Lan offers it; still hidden until approval.
    expect((await req('POST', `/questions/${qid}/share`, lan)).json()).toMatchObject({ pendingApproval: true });
    const during = (await req('GET', '/questions', david)).json() as { id: string }[];
    expect(during.map((q) => q.id)).not.toContain(qid);

    // Manager sees it pending and approves; now David can use it.
    const pending = (await req('GET', '/questions/pending-shares', zhao)).json() as { id: string }[];
    expect(pending.map((q) => q.id)).toContain(qid);
    expect((await req('GET', '/questions/pending-shares', lan)).statusCode).toBe(403);
    expect((await req('POST', `/questions/${qid}/approve-share`, zhao)).statusCode).toBe(200);
    const after = (await req('GET', '/questions', david)).json() as { id: string }[];
    expect(after.map((q) => q.id)).toContain(qid);
  });
});

describe('gradebook, session logging, ILPs', () => {
  it('gradebook aggregates weighted overall and per-skill scores', async () => {
    const rows = (await req('GET', '/classes/c1/gradebook', lan)).json() as { studentId: string; overall: number | null; skills: Record<string, unknown> }[];
    const minhRow = rows.find((r) => r.studentId === 's0')!;
    expect(minhRow.overall).not.toBeNull();
    expect(Object.keys(minhRow.skills)).toContain('grammar');
    // Owner can read it too; David cannot.
    expect((await req('GET', '/classes/c1/gradebook', zhao)).statusCode).toBe(200);
    expect((await req('GET', '/classes/c1/gradebook', david)).statusCode).toBe(403);
  });

  it('a whole class session is logged in one request', async () => {
    const res = await req('POST', '/classes/c1/session-log', lan, {
      date: new Date().toISOString().slice(0, 10),
      entries: [
        { studentId: 's0', skills: ['grammar', 'listening'], engagement: 5, note: 'Strong on be-verbs', parentNote: 'Minh had a great class!' },
        { studentId: 's6', skills: ['grammar'], engagement: 4, note: '', parentNote: '' },
      ],
    });
    expect(res.json()).toMatchObject({ ok: true, logged: 2 });
  });

  it('ILPs are versioned living documents; parents can read, not write', async () => {
    const v1 = await req('POST', '/students/s0/ilp', lan, { goals: [{ skillKey: 'grammar.pre_a1_starters', goal: 'Use am/is/are confidently', targetDate: '2026-08-01' }] });
    expect(v1.json().version).toBe(1);
    const v2 = await req('POST', '/students/s0/ilp', lan, { goals: [{ skillKey: 'listening.pre_a1_starters', goal: 'Follow classroom instructions', targetDate: '2026-09-01' }] });
    expect(v2.json().version).toBe(2);

    const parent = await login('phuhuynh@etop.vn');
    const read = await req('GET', '/students/s0/ilp', parent);
    expect(read.statusCode).toBe(200);
    expect(read.json().version).toBe(2);
    expect((await req('POST', '/students/s0/ilp', parent, { goals: [{}] })).statusCode).toBe(403);
  });
});
