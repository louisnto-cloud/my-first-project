import { randomBytes } from 'node:crypto';
import { SAFETY_DEFAULTS } from '@etop/domain';
import { type DB, many, one } from './db.js';
import { verifyPassword } from './auth.js';
import { notify } from './notify.js';

// The missing-child system is the most important workflow in the platform.
// Every function here is deterministic: time is always passed in, never
// read from the clock, so the cascade is fully testable.

const rid = (p: string) => `${p}_${randomBytes(8).toString('hex')}`;
const dateOf = (d: Date) => d.toISOString().slice(0, 10);

export async function safetyEvent(
  db: DB,
  e: { orgId: string; siteId?: string | null; type: string; studentId?: string | null; actorId?: string | null; detail?: Record<string, unknown>; at: Date },
): Promise<void> {
  await db.query(
    `INSERT INTO safety_events (org_id, site_id, type, student_id, actor_id, detail, occurred_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [e.orgId, e.siteId ?? null, e.type, e.studentId ?? null, e.actorId ?? null, e.detail ? JSON.stringify(e.detail) : null, e.at.toISOString()],
  );
}

export interface ApplyResult {
  applied: boolean;
  reason: string;
}

export async function checkIn(
  db: DB,
  p: { orgId: string; siteId: string; studentId: string; by: string; at: Date; clientEventId: string },
): Promise<ApplyResult> {
  // Idempotent: replaying the same offline event is a no-op.
  const dup = await one(db, 'SELECT 1 AS x FROM attendance_records WHERE check_in_event_id = $1', [p.clientEventId]);
  if (dup) return { applied: false, reason: 'duplicate_event' };

  const date = dateOf(p.at);
  const existing = await one<{ id: string; check_in_at: string | null }>(
    db,
    'SELECT id, check_in_at FROM attendance_records WHERE student_id = $1 AND date = $2',
    [p.studentId, date],
  );
  if (existing?.check_in_at) return { applied: false, reason: 'already_checked_in' };

  if (existing) {
    await db.query(
      'UPDATE attendance_records SET check_in_at = $2, check_in_by = $3, check_in_event_id = $4, site_id = $5 WHERE id = $1',
      [existing.id, p.at.toISOString(), p.by, p.clientEventId, p.siteId],
    );
  } else {
    await db.query(
      `INSERT INTO attendance_records (id, org_id, site_id, student_id, date, check_in_at, check_in_by, check_in_event_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [rid('att'), p.orgId, p.siteId, p.studentId, date, p.at.toISOString(), p.by, p.clientEventId],
    );
  }
  await safetyEvent(db, { orgId: p.orgId, siteId: p.siteId, type: 'attendance.check_in', studentId: p.studentId, actorId: p.by, at: p.at });

  // Arrival resolves any open missing-child escalation immediately.
  const open = await one<{ id: string }>(
    db,
    `SELECT id FROM escalations WHERE student_id = $1 AND date = $2 AND status = 'open'`,
    [p.studentId, date],
  );
  if (open) {
    await db.query(
      `UPDATE escalations SET status = 'resolved', resolved_at = $2, resolved_by = $3, resolved_reason = 'checked_in' WHERE id = $1`,
      [open.id, p.at.toISOString(), p.by],
    );
    await safetyEvent(db, { orgId: p.orgId, siteId: p.siteId, type: 'escalation.resolved', studentId: p.studentId, actorId: p.by, detail: { reason: 'checked_in' }, at: p.at });
  }
  return { applied: true, reason: 'ok' };
}

export type DismissResult = ApplyResult & { alert?: 'blocked_pickup' };

export async function dismiss(
  db: DB,
  p: {
    orgId: string;
    siteId: string;
    studentId: string;
    by: string;
    at: Date;
    clientEventId: string;
    pickupPersonId?: string;
    pin?: string;
    releasedToName?: string;
  },
): Promise<DismissResult> {
  const dup = await one(db, 'SELECT 1 AS x FROM attendance_records WHERE check_out_event_id = $1', [p.clientEventId]);
  if (dup) return { applied: false, reason: 'duplicate_event' };

  const date = dateOf(p.at);
  const rec = await one<{ id: string; check_in_at: string | null; check_out_at: string | null }>(
    db,
    'SELECT id, check_in_at, check_out_at FROM attendance_records WHERE student_id = $1 AND date = $2',
    [p.studentId, date],
  );
  if (!rec?.check_in_at) return { applied: false, reason: 'not_checked_in' };
  if (rec.check_out_at) return { applied: false, reason: 'already_checked_out' };

  let releasedTo = p.releasedToName ?? '';
  if (p.pickupPersonId) {
    const person = await one<{ id: string; name: string; pin_hash: string; blocked: boolean; student_id: string }>(
      db,
      'SELECT id, name, pin_hash, blocked, student_id FROM pickup_people WHERE id = $1 AND org_id = $2',
      [p.pickupPersonId, p.orgId],
    );
    if (!person || person.student_id !== p.studentId) return { applied: false, reason: 'unknown_pickup_person' };

    if (person.blocked) {
      // Hard stop: blocked pickup attempt → event + instant alerts to site
      // leadership and guardians. The child is NOT released.
      await safetyEvent(db, {
        orgId: p.orgId, siteId: p.siteId, type: 'dismissal.blocked_pickup_attempt',
        studentId: p.studentId, actorId: p.by, detail: { pickupPersonId: person.id, name: person.name }, at: p.at,
      });
      const targets = await many<{ id: string; phone: string | null }>(
        db,
        `SELECT id, phone FROM users WHERE org_id = $1 AND ((role = 'site_director' AND site_id = $2) OR role = 'owner')`,
        [p.orgId, p.siteId],
      );
      for (const t of targets) {
        await notify(db, { orgId: p.orgId, channel: 'push', toUserId: t.id, body: `BLOCKED PICKUP ATTEMPT: ${person.name} attempted to collect a student. Do not release.`, at: p.at });
      }
      return { applied: false, reason: 'blocked_pickup', alert: 'blocked_pickup' };
    }
    if (!p.pin || !verifyPassword(p.pin, person.pin_hash)) {
      await safetyEvent(db, { orgId: p.orgId, siteId: p.siteId, type: 'dismissal.pin_failed', studentId: p.studentId, actorId: p.by, detail: { pickupPersonId: person.id }, at: p.at });
      return { applied: false, reason: 'pin_invalid' };
    }
    releasedTo = person.name;
  }
  if (!releasedTo) return { applied: false, reason: 'released_to_required' };

  await db.query(
    `UPDATE attendance_records SET check_out_at = $2, check_out_by = $3, check_out_event_id = $4,
            released_to_name = $5, released_to_pickup_id = $6 WHERE id = $1`,
    [rec.id, p.at.toISOString(), p.by, p.clientEventId, releasedTo, p.pickupPersonId ?? null],
  );
  await safetyEvent(db, {
    orgId: p.orgId, siteId: p.siteId, type: 'attendance.check_out', studentId: p.studentId, actorId: p.by,
    detail: { releasedTo, pickupPersonId: p.pickupPersonId ?? null }, at: p.at,
  });
  return { applied: true, reason: 'ok' };
}

/** Expected-but-absent reconciliation + escalation cascade. Run by the job
 * runner every minute in production; callable and deterministic for tests. */
export async function runMissingSweep(db: DB, p: { orgId: string; siteId: string; now: Date }): Promise<{ opened: number; advanced: number }> {
  const cfg = SAFETY_DEFAULTS;
  const date = dateOf(p.now);
  const nowIso = p.now.toISOString();
  let opened = 0;
  let advanced = 0;

  // 1) Expected students: meeting started > missingAfterMinutes ago, still running.
  const missing = await many<{ student_id: string }>(
    db,
    `SELECT DISTINCT e.student_id
       FROM class_meetings m
       JOIN enrollments e ON e.class_id = m.class_id
      WHERE m.org_id = $1 AND m.site_id = $2
        AND m.starts_at + ($3 || ' minutes')::interval <= $4::timestamptz
        AND m.ends_at > $4::timestamptz
        AND NOT EXISTS (SELECT 1 FROM attendance_records a
                         WHERE a.student_id = e.student_id AND a.date = $5 AND a.check_in_at IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM escalations x
                         WHERE x.student_id = e.student_id AND x.date = $5)`,
    [p.orgId, p.siteId, String(cfg.missingAfterMinutes), nowIso, date],
  );

  for (const m of missing) {
    const escId = rid('esc');
    await db.query(
      `INSERT INTO escalations (id, org_id, site_id, student_id, date, status, opened_at) VALUES ($1, $2, $3, $4, $5, 'open', $6)`,
      [escId, p.orgId, p.siteId, m.student_id, date, nowIso],
    );
    await addStep(db, p.orgId, escId, 1, 'staff_alert', null, null, p.now);
    const staff = await many<{ id: string }>(
      db,
      `SELECT id FROM users WHERE org_id = $1 AND site_id = $2 AND role IN ('front_desk', 'staff', 'site_director') AND archived = false`,
      [p.orgId, p.siteId],
    );
    const student = await one<{ name: string }>(db, 'SELECT name FROM users WHERE id = $1', [m.student_id]);
    for (const s of staff) {
      await notify(db, { orgId: p.orgId, channel: 'push', toUserId: s.id, body: `MISSING CHECK-IN: ${student?.name} was expected and has not arrived. Please verify now.`, at: p.now });
    }
    await safetyEvent(db, { orgId: p.orgId, siteId: p.siteId, type: 'escalation.opened', studentId: m.student_id, at: p.now });
    opened++;
  }

  // 2) Advance open escalations whose last step has aged past the interval.
  const stale = await many<{ id: string; student_id: string; last_seq: number; last_kind: string; last_at: string }>(
    db,
    `SELECT x.id, x.student_id, s.seq AS last_seq, s.kind AS last_kind, s.created_at AS last_at
       FROM escalations x
       JOIN LATERAL (SELECT seq, kind, created_at FROM escalation_steps WHERE escalation_id = x.id ORDER BY seq DESC LIMIT 1) s ON true
      WHERE x.org_id = $1 AND x.site_id = $2 AND x.status = 'open'
        AND s.created_at + ($3 || ' minutes')::interval <= $4::timestamptz`,
    [p.orgId, p.siteId, String(cfg.stepIntervalMinutes), nowIso],
  );

  for (const esc of stale) {
    const student = await one<{ name: string }>(db, 'SELECT name FROM users WHERE id = $1', [esc.student_id]);
    if (esc.last_kind === 'director_alert') continue; // cascade complete; stays open until resolved

    // Guardian cascade in contact order: one guardian per interval.
    const guardiansContacted = await one<{ n: string }>(
      db,
      `SELECT COUNT(*)::text AS n FROM escalation_steps WHERE escalation_id = $1 AND kind = 'guardian_contact'`,
      [esc.id],
    );
    const nextGuardian = await one<{ guardian_id: string; phone: string | null; name: string }>(
      db,
      `SELECT g.guardian_id, u.phone, u.name FROM guardian_students g JOIN users u ON u.id = g.guardian_id
        WHERE g.student_id = $1 ORDER BY g.contact_order OFFSET $2 LIMIT 1`,
      [esc.student_id, Number(guardiansContacted?.n ?? 0)],
    );

    if (nextGuardian) {
      await addStep(db, p.orgId, esc.id, esc.last_seq + 1, 'guardian_contact', nextGuardian.guardian_id, nextGuardian.phone, p.now);
      const body = `${student?.name} has not arrived at E'TOP. Please contact the center immediately: 089 949 0222.`;
      await notify(db, { orgId: p.orgId, channel: 'call', toUserId: nextGuardian.guardian_id, toContact: nextGuardian.phone, body, at: p.now });
      await notify(db, { orgId: p.orgId, channel: 'sms', toUserId: nextGuardian.guardian_id, toContact: nextGuardian.phone, body, at: p.now });
    } else {
      await addStep(db, p.orgId, esc.id, esc.last_seq + 1, 'director_alert', null, null, p.now);
      const directors = await many<{ id: string }>(
        db,
        `SELECT id FROM users WHERE org_id = $1 AND (role = 'owner' OR (role = 'site_director' AND site_id = $2))`,
        [p.orgId, p.siteId],
      );
      for (const d of directors) {
        await notify(db, { orgId: p.orgId, channel: 'push', toUserId: d.id, body: `ESCALATION: ${student?.name} still unaccounted for and guardians unreachable. Director action required.`, at: p.now });
      }
    }
    await safetyEvent(db, { orgId: p.orgId, siteId: p.siteId, type: 'escalation.advanced', studentId: esc.student_id, detail: { seq: esc.last_seq + 1 }, at: p.now });
    advanced++;
  }

  return { opened, advanced };
}

async function addStep(db: DB, _orgId: string, escId: string, seq: number, kind: string, targetUserId: string | null, targetContact: string | null, at: Date): Promise<void> {
  await db.query(
    `INSERT INTO escalation_steps (id, escalation_id, seq, kind, target_user_id, target_contact, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [rid('step'), escId, seq, kind, targetUserId, targetContact, at.toISOString()],
  );
}

/** Live reconciliation roster for a site: expected vs present vs released. */
export async function todayRoster(db: DB, p: { orgId: string; siteId: string; now: Date }) {
  const date = dateOf(p.now);
  return many(
    db,
    `SELECT u.id, u.name, c.name AS "className", m.room,
            a.check_in_at AS "checkInAt", a.check_out_at AS "checkOutAt", a.released_to_name AS "releasedTo",
            CASE WHEN a.check_out_at IS NOT NULL THEN 'released'
                 WHEN a.check_in_at IS NOT NULL THEN 'present'
                 ELSE 'expected' END AS status
       FROM class_meetings m
       JOIN enrollments e ON e.class_id = m.class_id
       JOIN users u ON u.id = e.student_id
       JOIN classes c ON c.id = m.class_id
       LEFT JOIN attendance_records a ON a.student_id = u.id AND a.date = $3
      WHERE m.org_id = $1 AND m.site_id = $2
        AND m.starts_at::date = $3
      ORDER BY c.name, u.name`,
    [p.orgId, p.siteId, date],
  );
}

/** Ratio dashboard: present students per running meeting vs the limit. */
export async function ratio(db: DB, p: { orgId: string; siteId: string; now: Date }) {
  const date = dateOf(p.now);
  const rows = await many<{ classId: string; className: string; room: string; present: string }>(
    db,
    `SELECT m.class_id AS "classId", c.name AS "className", m.room,
            COUNT(a.id) FILTER (WHERE a.check_in_at IS NOT NULL AND a.check_out_at IS NULL)::text AS present
       FROM class_meetings m
       JOIN classes c ON c.id = m.class_id
       LEFT JOIN enrollments e ON e.class_id = m.class_id
       LEFT JOIN attendance_records a ON a.student_id = e.student_id AND a.date = $3
      WHERE m.org_id = $1 AND m.site_id = $2 AND m.starts_at <= $4::timestamptz AND m.ends_at > $4::timestamptz
      GROUP BY m.class_id, c.name, m.room`,
    [p.orgId, p.siteId, date, p.now.toISOString()],
  );
  const limit = SAFETY_DEFAULTS.ratioLimit;
  return rows.map((r) => ({ ...r, present: Number(r.present), limit, overLimit: Number(r.present) > limit }));
}

/** Emergency mode roster: every present child, last known room, guardian quick-dial. */
export async function emergencyRoster(db: DB, p: { orgId: string; siteId: string; now: Date }) {
  const date = dateOf(p.now);
  return many(
    db,
    `SELECT u.id, u.name,
            COALESCE(m.room, 'unknown') AS "lastKnownRoom",
            g.phone AS "guardianPhone", g.name AS "guardianName"
       FROM attendance_records a
       JOIN users u ON u.id = a.student_id
       LEFT JOIN enrollments e ON e.student_id = u.id
       LEFT JOIN class_meetings m ON m.class_id = e.class_id AND m.site_id = a.site_id
            AND m.starts_at <= $4::timestamptz AND m.ends_at > $4::timestamptz
       LEFT JOIN LATERAL (
         SELECT us.phone, us.name FROM guardian_students gs JOIN users us ON us.id = gs.guardian_id
          WHERE gs.student_id = u.id ORDER BY gs.contact_order LIMIT 1
       ) g ON true
      WHERE a.org_id = $1 AND a.site_id = $2 AND a.date = $3
        AND a.check_in_at IS NOT NULL AND a.check_out_at IS NULL
      ORDER BY u.name`,
    [p.orgId, p.siteId, date, p.now.toISOString()],
  );
}
