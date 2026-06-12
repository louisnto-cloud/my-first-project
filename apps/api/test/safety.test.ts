import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createDb, many, type DB } from '../src/db.js';
import { buildServer } from '../src/server.js';
import { seedDemo } from '../src/seed.js';

// Deterministic clock: all safety endpoints accept explicit timestamps, so
// the escalation cascade is tested minute-by-minute with no fake timers.

let db: DB;
let app: FastifyInstance;
let desk: string; // front_desk @ site_nh
let director: string; // owner

const T = (hhmm: string) => {
  const d = new Date();
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

async function login(email: string): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'etop123' } });
  expect(res.statusCode).toBe(200);
  return res.json().token as string;
}

function post(url: string, token: string, payload: object) {
  return app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${token}` }, payload });
}

function get(url: string, token: string) {
  return app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
}

beforeAll(async () => {
  db = await createDb();
  await seedDemo(db);
  app = await buildServer(db);
  desk = await login('desk@etop.vn');
  director = await login('zhao@etop.vn');
});

describe('check-in and verified dismissal', () => {
  it('checks a student in and shows them present on the live roster', async () => {
    const res = await post('/attendance/check-in', desk, {
      studentId: 's6', siteId: 'site_nh', at: T('17:25'), clientEventId: 'evt_checkin_s6',
    });
    expect(res.json()).toMatchObject({ applied: true });

    const roster = (await get(`/attendance/today?siteId=site_nh&now=${T('17:40')}`, desk)).json() as { id: string; status: string }[];
    expect(roster.find((r) => r.id === 's6')?.status).toBe('present');
  });

  it('replaying the same offline event is a no-op (idempotency)', async () => {
    const res = await post('/attendance/check-in', desk, {
      studentId: 's6', siteId: 'site_nh', at: T('17:25'), clientEventId: 'evt_checkin_s6',
    });
    expect(res.json()).toMatchObject({ applied: false, reason: 'duplicate_event' });
  });

  it('dismissal requires a valid PIN from a verified pickup person', async () => {
    await post('/attendance/check-in', desk, { studentId: 's0', siteId: 'site_nh', at: T('17:26'), clientEventId: 'evt_checkin_s0' });

    const bad = await post('/attendance/dismiss', desk, {
      studentId: 's0', siteId: 'site_nh', at: T('19:00'), clientEventId: 'evt_out_bad',
      pickupPersonId: 'pk_grandma', pin: '9999',
    });
    expect(bad.statusCode).toBe(403);
    expect(bad.json().reason).toBe('pin_invalid');

    const ok = await post('/attendance/dismiss', desk, {
      studentId: 's0', siteId: 'site_nh', at: T('19:01'), clientEventId: 'evt_out_s0',
      pickupPersonId: 'pk_grandma', pin: '1234',
    });
    expect(ok.json()).toMatchObject({ applied: true });

    const events = await many<{ type: string }>(db, 'SELECT type FROM safety_events WHERE student_id = $1 ORDER BY id', ['s0']);
    expect(events.map((e) => e.type)).toContain('dismissal.pin_failed');
    expect(events.map((e) => e.type)).toContain('attendance.check_out');
  });

  it('a blocked pickup person is refused and leadership is alerted instantly', async () => {
    await post('/attendance/check-in', desk, { studentId: 's12', siteId: 'site_nh', at: T('17:27'), clientEventId: 'evt_checkin_s12' });
    await db.query(`UPDATE pickup_people SET student_id = 's12' WHERE id = 'pk_blocked'`);

    const res = await post('/attendance/dismiss', desk, {
      studentId: 's12', siteId: 'site_nh', at: T('18:00'), clientEventId: 'evt_out_blocked',
      pickupPersonId: 'pk_blocked', pin: '1234',
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ reason: 'blocked_pickup', alert: 'blocked_pickup' });

    const events = await many(db, `SELECT 1 FROM safety_events WHERE type = 'dismissal.blocked_pickup_attempt' AND student_id = 's12'`);
    expect(events.length).toBe(1);
    const alerts = await many<{ body: string }>(db, `SELECT body FROM notifications_outbox WHERE body LIKE 'BLOCKED PICKUP%'`);
    expect(alerts.length).toBeGreaterThan(0);

    // And the child is still present, not released.
    const roster = (await get(`/attendance/today?siteId=site_nh&now=${T('18:05')}`, desk)).json() as { id: string; status: string }[];
    expect(roster.find((r) => r.id === 's12')?.status).toBe('present');
  });

  it('parents cannot touch attendance endpoints', async () => {
    const parent = await login('phuhuynh@etop.vn');
    const res = await post('/attendance/check-in', parent, {
      studentId: 's0', siteId: 'site_nh', at: T('17:30'), clientEventId: 'evt_parent_attempt',
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('missing child escalation cascade (the most important test in the platform)', () => {
  // s24 is enrolled in c1 (i % 6 === 0 → s0, s6, s12, s18, s24, …); meeting m1 starts 17:30.
  // s24 gets two guardians in contact order; s18 has none (straight-to-director path).
  const STUDENT = 's24';

  it('opens an escalation and alerts staff when a child is 15+ minutes unaccounted for', async () => {
    await db.query(`INSERT INTO guardian_students (guardian_id, student_id, contact_order) VALUES ('p0', 's24', 1), ('p1', 's24', 2)`);

    const res = await post('/safety/sweep', director, { siteId: 'site_nh', now: T('17:46') });
    const { opened } = res.json() as { opened: number };
    expect(opened).toBeGreaterThan(0);

    const escalations = (await get('/escalations?siteId=site_nh', director)).json() as { studentId: string; steps: { kind: string }[] }[];
    const mine = escalations.find((e) => e.studentId === STUDENT);
    expect(mine).toBeDefined();
    expect(mine!.steps.map((s) => s.kind)).toEqual(['staff_alert']);

    const staffAlerts = await many(db, `SELECT 1 FROM notifications_outbox WHERE body LIKE 'MISSING CHECK-IN%'`);
    expect(staffAlerts.length).toBeGreaterThan(0);
  });

  it('then calls and texts guardian #1 in contact order', async () => {
    await post('/safety/sweep', director, { siteId: 'site_nh', now: T('17:56') });
    const esc = ((await get('/escalations?siteId=site_nh', director)).json() as { studentId: string; steps: { kind: string }[] }[])
      .find((e) => e.studentId === STUDENT)!;
    expect(esc.steps.map((s) => s.kind)).toEqual(['staff_alert', 'guardian_contact']);

    const calls = await many<{ to_user_id: string }>(db, `SELECT to_user_id FROM notifications_outbox WHERE channel = 'call' ORDER BY created_at`);
    expect(calls.map((c) => c.to_user_id)).toEqual(['p0']);
    const sms = await many<{ to_user_id: string }>(db, `SELECT to_user_id FROM notifications_outbox WHERE channel = 'sms'`);
    expect(sms.map((s) => s.to_user_id)).toContain('p0');
  });

  it('then guardian #2, then escalates to the director, every step timestamped', async () => {
    await post('/safety/sweep', director, { siteId: 'site_nh', now: T('18:06') });
    await post('/safety/sweep', director, { siteId: 'site_nh', now: T('18:16') });

    const esc = ((await get('/escalations?siteId=site_nh', director)).json() as { studentId: string; steps: { kind: string; at: string }[] }[])
      .find((e) => e.studentId === STUDENT)!;
    expect(esc.steps.map((s) => s.kind)).toEqual(['staff_alert', 'guardian_contact', 'guardian_contact', 'director_alert']);

    // Guardians were called strictly in contact order.
    const calls = await many<{ to_user_id: string }>(db, `SELECT to_user_id FROM notifications_outbox WHERE channel = 'call' ORDER BY created_at`);
    expect(calls.map((c) => c.to_user_id)).toEqual(['p0', 'p1']);

    // Steps strictly ordered in time.
    const times = esc.steps.map((s) => s.at);
    expect([...times].sort()).toEqual(times);
  });

  it('a child with no guardians on file escalates staff → director directly', async () => {
    const esc = ((await get('/escalations?siteId=site_nh', director)).json() as { studentId: string; steps: { kind: string }[] }[])
      .find((e) => e.studentId === 's18')!;
    expect(esc.steps.map((s) => s.kind)).toEqual(['staff_alert', 'director_alert']);
  });

  it('check-in resolves the escalation immediately', async () => {
    await post('/attendance/check-in', desk, { studentId: STUDENT, siteId: 'site_nh', at: T('18:20'), clientEventId: 'evt_late_arrival' });
    const escalations = (await get('/escalations?siteId=site_nh', director)).json() as { studentId: string }[];
    expect(escalations.find((e) => e.studentId === STUDENT)).toBeUndefined();
    const resolved = await many(db, `SELECT 1 FROM escalations WHERE student_id = $1 AND status = 'resolved' AND resolved_reason = 'checked_in'`, [STUDENT]);
    expect(resolved.length).toBe(1);
  });
});

describe('offline kiosk sync', () => {
  it('applies a queued batch idempotently and in time order, even with duplicates', async () => {
    const events = [
      { clientEventId: 'off_2_out_s30', type: 'check_out' as const, studentId: 's30', at: T('19:05'), releasedToName: 'Mẹ - logged ID check' },
      { clientEventId: 'off_1_in_s30', type: 'check_in' as const, studentId: 's30', at: T('17:20') },
      { clientEventId: 'off_1_in_s30', type: 'check_in' as const, studentId: 's30', at: T('17:20') }, // duplicate in queue
    ];
    const res = await post('/kiosk/sync', desk, { siteId: 'site_nh', events });
    const results = res.json().results as { clientEventId: string; applied: boolean }[];
    expect(results.filter((r) => r.applied).map((r) => r.clientEventId).sort()).toEqual(['off_1_in_s30', 'off_2_out_s30']);
    expect(results.filter((r) => !r.applied)).toHaveLength(1);

    // Replaying the whole batch after reconnect changes nothing.
    const replay = await post('/kiosk/sync', desk, { siteId: 'site_nh', events });
    expect((replay.json().results as { applied: boolean }[]).every((r) => !r.applied)).toBe(true);

    // Final state is correct and the event log is complete.
    const rec = await many<{ released_to_name: string }>(db, `SELECT released_to_name FROM attendance_records WHERE student_id = 's30'`);
    expect(rec[0].released_to_name).toContain('Mẹ');
    const log = await many<{ type: string }>(db, `SELECT type FROM safety_events WHERE student_id = 's30' AND type LIKE 'attendance.%' ORDER BY occurred_at`);
    expect(log.map((l) => l.type)).toEqual(['attendance.check_in', 'attendance.check_out']);
  });
});

describe('ratio dashboard and emergency mode', () => {
  it('reports present counts per running meeting with the limit', async () => {
    const rows = (await get(`/safety/ratio?siteId=site_nh&now=${T('17:45')}`, desk)).json() as { className: string; present: number; limit: number; overLimit: boolean }[];
    expect(rows.length).toBeGreaterThan(0);
    const c1 = rows.find((r) => r.className === 'Starters A')!;
    expect(c1.limit).toBe(15);
    expect(c1.overLimit).toBe(false);
  });

  it('emergency mode returns a live evacuation roster with last known room and guardian quick-dial', async () => {
    const res = await post('/emergency/start', director, { siteId: 'site_nh', now: T('17:50') });
    expect(res.statusCode).toBe(200);
    const { headcount, roster } = res.json() as { headcount: number; roster: { id: string; lastKnownRoom: string; guardianPhone: string | null }[] };
    expect(headcount).toBeGreaterThan(0);
    // s24 checked in late and was never released: must be on the evacuation
    // roster with last known room and the #1 guardian's quick-dial number.
    const row = roster.find((r) => r.id === 's24');
    expect(row).toBeDefined();
    expect(row!.lastKnownRoom).toBe('P.101');
    expect(row!.guardianPhone).toBe('+84901000001');
    // s0 was verified-dismissed earlier: must NOT appear on the live roster.
    expect(roster.find((r) => r.id === 's0')).toBeUndefined();
    const ev = await many(db, `SELECT 1 FROM safety_events WHERE type = 'emergency.started'`);
    expect(ev.length).toBe(1);
  });

  it('tutors can view but cannot start emergency mode; parents can do neither', async () => {
    const tutor = await login('lan@etop.vn');
    expect((await post('/emergency/start', tutor, { siteId: 'site_nh', now: T('17:55') })).statusCode).toBe(403);
    const parent = await login('phuhuynh@etop.vn');
    expect((await get(`/emergency/roster?siteId=site_nh&now=${T('17:55')}`, parent)).statusCode).toBe(403);
  });
});
