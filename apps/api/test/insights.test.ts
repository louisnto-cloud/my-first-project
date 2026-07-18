import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createDb, many, type DB } from '../src/db.js';
import { buildServer } from '../src/server.js';
import { seedDemo } from '../src/seed.js';
import { hashPassword } from '../src/auth.js';
import { decayedScore, masteryLabel, pearson } from '../src/insights.js';

let db: DB;
let app: FastifyInstance;
let zhao: string;
let hoa: string; // academic director
let lan: string;
let parent: string;
let bill: string;

async function login(email: string): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'etop123' } });
  expect(res.statusCode).toBe(200);
  return res.json().token as string;
}

const req = (method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: object) =>
  app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, ...(payload ? { payload } : {}) });

/** Seed mastery history directly with controlled timestamps. */
async function history(studentId: string, skill: string, score: number, daysAgo: number) {
  const at = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  await db.query('INSERT INTO mastery_history (id, student_id, skill, score, recorded_at) VALUES ($1, $2, $3, $4, $5)', [
    `mh_${studentId}_${skill}_${daysAgo}`, studentId, skill, score, at,
  ]);
}

beforeAll(async () => {
  db = await createDb();
  await seedDemo(db);
  app = await buildServer(db);
  zhao = await login('zhao@etop.vn');
  hoa = await login('hoa@etop.vn');
  lan = await login('lan@etop.vn');
  parent = await login('phuhuynh@etop.vn');
  bill = await login('bill@etop.vn');
});

describe('outcome math (pure)', () => {
  it('mastery decays only after 30 idle days, ×0.9 per further 30 days', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const fresh = new Date('2026-05-15T00:00:00Z'); // 17 idle days
    expect(decayedScore(0.9, fresh, now)).toBe(0.9);
    const idle90 = new Date(now.getTime() - 90 * 86_400_000); // 60 days past grace = 2 periods
    expect(decayedScore(0.9, idle90, now)).toBeCloseTo(0.9 * 0.81, 5);
  });

  it('labels mastery bands', () => {
    expect(masteryLabel(0.85)).toBe('mastered');
    expect(masteryLabel(0.6)).toBe('developing');
    expect(masteryLabel(0.3)).toBe('review');
  });

  it('pearson correlation: perfect, inverse, and insufficient data', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBe(1);
    expect(pearson([1, 2, 3], [6, 4, 2])).toBe(-1);
    expect(pearson([1, 2], [2, 4])).toBeNull();
    expect(pearson([1, 1, 1], [2, 4, 6])).toBeNull(); // zero variance
  });
});

describe('report card (Học bạ)', () => {
  it('a guardian reads a consolidated report; a non-guardian parent is refused', async () => {
    const r = (await req('GET', '/students/s0/report', parent)).json() as { studentName: string; classes: unknown[]; attendance: { present: number; total: number }; assignments: unknown[] };
    expect(r.studentName).toBe('Trần Đức Minh');
    expect(Array.isArray(r.classes)).toBe(true);
    expect(Array.isArray(r.assignments)).toBe(true);

    const otherParent = await login('phuhuynh2@etop.vn'); // guardian of s0 too in seed? use a truly unrelated child
    // s1 is not this parent's child.
    expect((await req('GET', '/students/s1/report', parent)).statusCode).toBe(403);
  });
});

describe('growth and decayed mastery', () => {
  it('serves history plus decay-adjusted current mastery with labels', async () => {
    await db.query(`INSERT INTO mastery (student_id, skill, score, updated_at) VALUES ('s0', 'grammar', 0.9, $1)`, [
      new Date(Date.now() - 90 * 86_400_000).toISOString(), // long idle → decays
    ]);
    await history('s0', 'grammar', 0.5, 50);
    await history('s0', 'grammar', 0.9, 10);

    const g = (await req('GET', '/students/s0/growth', lan)).json() as { history: unknown[]; current: { skill: string; raw: number; effective: number; label: string }[] };
    expect(g.history.length).toBe(2);
    const grammar = g.current.find((c) => c.skill === 'grammar')!;
    expect(grammar.raw).toBe(0.9);
    expect(grammar.effective).toBeLessThan(0.9); // decay applied
    expect(grammar.effective).toBeCloseTo(0.9 * 0.81, 2);
  });

  it('parents can see growth; strangers cannot', async () => {
    expect((await req('GET', '/students/s0/growth', parent)).statusCode).toBe(200);
    const otherParent = await login('phuhuynh2@etop.vn');
    expect((await req('GET', '/students/s1/growth', otherParent)).statusCode).toBe(403);
  });
});

describe('school grade correlation', () => {
  it('pairs each term grade with platform mastery at that time and correlates', async () => {
    // Rising mastery history at three points in time…
    await history('s6', 'grammar', 0.4, 200);
    await history('s6', 'grammar', 0.6, 120);
    await history('s6', 'grammar', 0.85, 30);
    // …and rising school grades recorded just after each.
    for (const [term, grade, daysAgo] of [['2025-T1', 6.0, 199], ['2025-T2', 7.0, 119], ['2026-T1', 8.5, 29]] as const) {
      await db.query(
        `INSERT INTO school_grades (id, org_id, student_id, term, subject, grade, recorded_by, created_at) VALUES ($1, 'org_etop', 's6', $2, 'english', $3, 'u_lan', $4)`,
        [`sg_${term}`, term, grade, new Date(Date.now() - daysAgo * 86_400_000).toISOString()],
      );
    }
    const c = (await req('GET', '/students/s6/correlation', lan)).json() as { pairs: unknown[]; correlation: number };
    expect(c.pairs).toHaveLength(3);
    expect(c.correlation).toBeGreaterThan(0.9); // the renewal-conversation chart
  });

  it('staff can record grades via the endpoint', async () => {
    expect((await req('POST', '/students/s0/school-grades', lan, { term: '2026-T1', grade: 7.5 })).statusCode).toBe(200);
  });
});

describe('academic quality dashboard', () => {
  it('reports mastery velocity per tutor and flags stalled students', async () => {
    const d = (await req('GET', '/academic/dashboard', hoa)).json() as {
      velocity: { tutorId: string; avgDelta: string | number }[];
      stalled: { id: string }[];
    };
    // Lan teaches s0/s6 whose history rose within the window.
    const lanRow = d.velocity.find((v) => v.tutorId === 'u_lan');
    expect(lanRow).toBeDefined();
    expect(Number(lanRow!.avgDelta)).toBeGreaterThan(0);
    // Students with no recent movement are flagged.
    expect(d.stalled.length).toBeGreaterThan(0);

    // Tutors cannot read the org-wide dashboard.
    expect((await req('GET', '/academic/dashboard', lan)).statusCode).toBe(403);
  });

  it('interventions open and resolve, and flagged students drop off the list', async () => {
    const before = (await req('GET', '/academic/dashboard', hoa)).json() as { stalled: { id: string }[] };
    const target = before.stalled[0].id;
    const iv = await req('POST', `/students/${target}/interventions`, hoa, { note: 'Schedule a 1:1 diagnostic re-check' });
    expect(iv.json().status).toBe('open');

    const after = (await req('GET', '/academic/dashboard', hoa)).json() as { stalled: { id: string }[] };
    expect(after.stalled.find((s) => s.id === target)).toBeUndefined();

    const ivId = iv.json().id as string;
    expect((await req('PATCH', `/interventions/${ivId}/resolve`, hoa)).statusCode).toBe(200);
    expect((await req('PATCH', `/interventions/${ivId}/resolve`, hoa)).statusCode).toBe(409);
  });
});

describe('NPS', () => {
  it('one response per parent per term; summary computes promoters minus detractors', async () => {
    expect((await req('POST', '/nps', parent, { term: '2026-T2', score: 10, comment: 'Tuyệt vời!' })).statusCode).toBe(200);
    expect((await req('POST', '/nps', parent, { term: '2026-T2', score: 9 })).statusCode).toBe(409);
    const p2 = await login('phuhuynh2@etop.vn');
    await req('POST', '/nps', p2, { term: '2026-T2', score: 6, comment: 'Muốn thêm lớp cuối tuần' });

    const s = (await req('GET', '/nps/summary?term=2026-T2', zhao)).json() as { responses: number; nps: number; comments: string[] };
    expect(s.responses).toBe(2);
    expect(s.nps).toBe(0); // 1 promoter, 1 detractor
    expect(s.comments).toContain('Tuyệt vời!');
    expect((await req('GET', '/nps/summary', lan)).statusCode).toBe(403);
  });
});

describe('referral program → account credit → next invoice', () => {
  it('referred enrollment credits the referrer and the credit auto-applies on billing', async () => {
    const code = ((await req('GET', '/my/referral', parent)).json() as { code: string }).code;
    expect(code).toMatch(/^ETOP-/);

    const lead = await req('POST', '/leads', zhao, { parentName: 'Anh Tuấn', contact: '+84907777777', childName: 'Bé Bin', referralCode: code });
    const leadId = lead.json().id as string;
    await req('PATCH', `/leads/${leadId}/stage`, zhao, { stage: 'enrolled' });

    const credits = await many<{ amount_vnd: string | number; invoice_id: string | null }>(db, `SELECT amount_vnd, invoice_id FROM account_credits WHERE parent_id = 'p0'`);
    expect(credits).toHaveLength(1);
    expect(Number(credits[0].amount_vnd)).toBe(200_000);
    expect(credits[0].invoice_id).toBeNull();

    // Next billing run: s0's invoice is reduced by the credit.
    await req('POST', '/billing/run', bill, { period: '2026-09', dueOn: '2026-09-10' });
    const mine = (await req('GET', '/my/invoices', parent)).json() as { period: string; totalVnd: number; lineItems: { label: string }[] }[];
    const sept = mine.find((i) => i.period === '2026-09')!;
    expect(sept.totalVnd).toBe(1_350_000 - 200_000);
    expect(sept.lineItems.some((l) => l.label.startsWith('Credit'))).toBe(true);

    // Credit is consumed exactly once.
    const after = await many<{ invoice_id: string | null }>(db, `SELECT invoice_id FROM account_credits WHERE parent_id = 'p0'`);
    expect(after[0].invoice_id).not.toBeNull();
  });
});

describe('compliance exports and tutor suggestion', () => {
  it('owner and auditor export CSVs; tutors cannot; the export itself is audited', async () => {
    await db.query(
      `INSERT INTO users (id, org_id, role, name, email, password_hash) VALUES ('u_aud', 'org_etop', 'auditor', 'External Auditor', 'aud@etop.vn', $1)`,
      [hashPassword('etop123')],
    );
    const aud = await login('aud@etop.vn');
    const csv = await req('GET', '/export/audit.csv', aud);
    expect(csv.statusCode).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.body.split('\n')[0]).toBe('id,actor_id,action,entity,entity_id,created_at');
    expect((await req('GET', '/export/audit.csv', lan)).statusCode).toBe(403);

    const trail = await many(db, `SELECT 1 FROM audit_log WHERE action = 'export.audit_csv'`);
    expect(trail.length).toBe(1);

    expect((await req('GET', '/export/safety-events.csv', zhao)).statusCode).toBe(200);
  });

  it('suggests tutors ranked by site, level experience, and load — with a reason', async () => {
    const rows = (await req('GET', '/tutors/suggest?siteId=site_nh&level=pre_a1_starters', hoa)).json() as { id: string; reason?: string }[];
    expect(rows[0].id).toBe('u_lan'); // at site, teaches Starters, light load
    expect(rows[0].reason).toContain('Best match');
  });
});
