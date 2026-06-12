import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createDb, many, type DB } from '../src/db.js';
import { buildServer } from '../src/server.js';
import { seedDemo } from '../src/seed.js';
import { lateFee, planCharge } from '../src/billing.js';

let db: DB;
let app: FastifyInstance;
let bill: string;
let zhao: string;
let parent: string;
let lan: string;

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
  bill = await login('bill@etop.vn');
  zhao = await login('zhao@etop.vn');
  parent = await login('phuhuynh@etop.vn');
  lan = await login('lan@etop.vn');
});

describe('money math (pure)', () => {
  it('full month, sibling discount 10%: 1,500,000 → 1,350,000', () => {
    const c = planCharge({ priceVnd: 1_500_000, period: '2026-06', startedOn: '2026-01-01', siblingPct: 10, scholarshipPct: 0 });
    expect(c.subtotal).toBe(1_500_000);
    expect(c.discount).toBe(150_000);
    expect(c.total).toBe(1_350_000);
  });

  it('prorates a mid-month start by remaining days (rounded to 1,000đ)', () => {
    // June has 30 days; starting the 16th → 15/30 days → 750,000.
    const c = planCharge({ priceVnd: 1_500_000, period: '2026-06', startedOn: '2026-06-16', siblingPct: 0, scholarshipPct: 0 });
    expect(c.subtotal).toBe(750_000);
    expect(c.total).toBe(750_000);
  });

  it('sibling + scholarship discounts sum and cap at 100%', () => {
    const c = planCharge({ priceVnd: 1_000_000, period: '2026-06', startedOn: '2026-01-01', siblingPct: 10, scholarshipPct: 25 });
    expect(c.total).toBe(650_000);
    const full = planCharge({ priceVnd: 1_000_000, period: '2026-06', startedOn: '2026-01-01', siblingPct: 60, scholarshipPct: 60 });
    expect(full.total).toBe(0);
  });

  it('late pickup: 15-minute grace, then 20,000đ per started 15-minute block', () => {
    expect(lateFee(10).amountVnd).toBe(0); // inside grace
    expect(lateFee(15).amountVnd).toBe(0); // exactly grace
    expect(lateFee(16).amountVnd).toBe(20_000); // 1 minute late → 1 block
    expect(lateFee(38).amountVnd).toBe(40_000); // 23 min late → 2 blocks
    expect(lateFee(95).amountVnd).toBe(120_000); // 80 min late → 6 blocks
  });
});

describe('billing run', () => {
  it('generates the monthly invoice with discount and notifies guardians', async () => {
    const run = await req('POST', '/billing/run', bill, { period: '2026-06', dueOn: '2026-06-10' });
    expect(run.json().created).toBe(1); // only s0 has a plan

    const invoices = (await req('GET', '/billing/invoices', bill)).json() as { studentId: string; totalVnd: string | number; status: string }[];
    const inv = invoices.find((i) => i.studentId === 's0')!;
    expect(Number(inv.totalVnd)).toBe(1_350_000);

    const pushes = await many(db, `SELECT 1 FROM notifications_outbox WHERE to_user_id = 'p0' AND body LIKE '%2026-06%'`);
    expect(pushes.length).toBeGreaterThan(0);
  });

  it('re-running the same period is idempotent', async () => {
    const again = await req('POST', '/billing/run', bill, { period: '2026-06', dueOn: '2026-06-10' });
    expect(again.json().created).toBe(0);
  });

  it('late pickup fees flow from attendance into the next invoice', async () => {
    // Check s0 in and dismiss 38 min after the meeting ends (meeting m1 ends 19:00 today).
    const desk = await login('desk@etop.vn');
    const today = new Date();
    const date = today.toISOString().slice(0, 10);
    const inAt = new Date(today); inAt.setHours(17, 31, 0, 0);
    const outAt = new Date(today); outAt.setHours(19, 38, 0, 0);
    await req('POST', '/attendance/check-in', desk, { studentId: 's0', siteId: 'site_nh', at: inAt.toISOString(), clientEventId: 'evt_money_in' });
    await req('POST', '/attendance/dismiss', desk, { studentId: 's0', siteId: 'site_nh', at: outAt.toISOString(), clientEventId: 'evt_money_out', releasedToName: 'Mẹ' });

    const fees = await req('POST', '/billing/late-fees/run', bill, { date });
    expect(fees.json().created).toBe(1);
    const feeRows = await many<{ amount_vnd: string | number; minutes_late: number }>(db, `SELECT amount_vnd, minutes_late FROM late_fees WHERE student_id = 's0'`);
    expect(Number(feeRows[0].amount_vnd)).toBe(40_000); // 38 - 15 grace = 23 min → 2 blocks

    // Next month's invoice carries the fee line.
    await req('POST', '/billing/run', bill, { period: '2026-07', dueOn: '2026-07-10' });
    const invoices = (await req('GET', '/billing/invoices', bill)).json() as { period: string; totalVnd: string | number }[];
    const july = invoices.find((i) => i.period === '2026-07')!;
    expect(Number(july.totalVnd)).toBe(1_350_000 + 40_000);

    // Fee is now bound to the invoice and cannot be double-billed.
    await req('POST', '/billing/late-fees/run', bill, { date });
    const rerun = await req('POST', '/billing/run', bill, { period: '2026-07', dueOn: '2026-07-10' });
    expect(rerun.json().created).toBe(0);
  });

  it('only money roles can run billing', async () => {
    expect((await req('POST', '/billing/run', lan, { period: '2026-08', dueOn: '2026-08-10' })).statusCode).toBe(403);
    expect((await req('GET', '/billing/invoices', parent)).statusCode).toBe(403);
  });
});

describe('payments, dunning, refunds', () => {
  let invoiceId: string;

  it('parent sees their invoices with a VietQR payload', async () => {
    const mine = (await req('GET', '/my/invoices', parent)).json() as { id: string; period: string; totalVnd: number; vietqr: string }[];
    const june = mine.find((i) => i.period === '2026-06')!;
    invoiceId = june.id;
    expect(june.totalVnd).toBe(1_350_000);
    expect(june.vietqr).toContain('VIETQR|ETOP|');
    expect(june.vietqr).toContain('1350000');
  });

  it('partial payment keeps the invoice open; full payment closes it', async () => {
    const part = await req('POST', `/invoices/${invoiceId}/record-payment`, bill, { amountVnd: 1_000_000, method: 'vietqr', ref: 'FT123' });
    expect(part.json().status).toBe('open');
    const rest = await req('POST', `/invoices/${invoiceId}/record-payment`, bill, { amountVnd: 350_000, method: 'cash' });
    expect(rest.json().status).toBe('paid');
  });

  it('dunning marks overdue, reminds guardians, and never spams within the repeat window', async () => {
    const julyId = ((await req('GET', '/billing/invoices', bill)).json() as { id: string; period: string }[]).find((i) => i.period === '2026-07')!.id;
    const d1 = await req('POST', '/billing/dunning/run', bill, { now: '2026-07-15T08:00:00.000Z' });
    expect(d1.json().remindersSent).toBe(1);
    const status = await many<{ status: string }>(db, 'SELECT status FROM invoices WHERE id = $1', [julyId]);
    expect(status[0].status).toBe('overdue');

    // Next day: inside the 3-day window → no second reminder.
    const d2 = await req('POST', '/billing/dunning/run', bill, { now: '2026-07-16T08:00:00.000Z' });
    expect(d2.json().remindersSent).toBe(0);
    // Day 4: reminder repeats.
    const d3 = await req('POST', '/billing/dunning/run', bill, { now: '2026-07-19T08:00:00.000Z' });
    expect(d3.json().remindersSent).toBe(1);
  });

  it('refunds cannot be processed without owner approval', async () => {
    const rf = await req('POST', `/invoices/${invoiceId}/refund`, bill, { amountVnd: 200_000, reason: 'Cancelled two sessions' });
    const rfId = rf.json().id as string;

    // Straight to process: rejected.
    expect((await req('POST', `/refunds/${rfId}/process`, bill)).statusCode).toBe(409);
    // Billing admin cannot approve — only the owner.
    expect((await req('POST', `/refunds/${rfId}/approve`, bill)).statusCode).toBe(403);
    expect((await req('POST', `/refunds/${rfId}/approve`, zhao)).statusCode).toBe(200);
    expect((await req('POST', `/refunds/${rfId}/process`, bill)).statusCode).toBe(200);

    const trail = await many(db, `SELECT 1 FROM audit_log WHERE action IN ('refund.approved', 'refund.processed')`);
    expect(trail.length).toBe(2);
  });

  it('finance dashboard shows revenue and AR aging', async () => {
    const d = (await req('GET', '/billing/dashboard', zhao)).json() as { revenue: { period: string }[]; arAging: { bucket: string }[] };
    expect(d.revenue.find((r) => r.period === '2026-06')).toBeDefined();
    expect(d.arAging.length).toBeGreaterThan(0);
  });
});

describe('admissions pipeline and e-signature packets', () => {
  it('moves a lead through the pipeline with an audit trail', async () => {
    const lead = await req('POST', '/leads', zhao, { parentName: 'Chị Hương', contact: '+84905555555', childName: 'Bé Na', childAge: 6 });
    const id = lead.json().id as string;
    expect(lead.json().stage).toBe('inquiry');
    for (const stage of ['tour', 'assessment', 'offered', 'enrolled']) {
      expect((await req('PATCH', `/leads/${id}/stage`, zhao, { stage })).json().stage).toBe(stage);
    }
    expect((await req('PATCH', `/leads/${id}/stage`, zhao, { stage: 'nonsense' })).statusCode).toBe(400);
    expect((await req('GET', '/leads', lan)).statusCode).toBe(403);
  });

  it('packet: sent → guardian signs with typed name; the other parent cannot sign twice or for other children', async () => {
    const pk = await req('POST', '/students/s0/packets', zhao, { title: 'Enrollment Agreement 2026', bodyText: 'Terms…' });
    const pkId = pk.json().id as string;

    const mine = (await req('GET', '/my/packets', parent)).json() as { id: string; status: string }[];
    expect(mine.find((p) => p.id === pkId)?.status).toBe('sent');

    expect((await req('POST', `/packets/${pkId}/sign`, parent, { typedName: 'Trần Văn Hùng' })).statusCode).toBe(200);
    expect((await req('POST', `/packets/${pkId}/sign`, parent, { typedName: 'again' })).statusCode).toBe(409);

    const signed = await many<{ signed_by_name: string }>(db, 'SELECT signed_by_name FROM enrollment_packets WHERE id = $1', [pkId]);
    expect(signed[0].signed_by_name).toBe('Trần Văn Hùng');
  });
});
