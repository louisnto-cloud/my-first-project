import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { canManageSafety, canRecordAttendance } from '@etop/domain';
import type { DB } from './db.js';
import { many, one } from './db.js';
import type { ActorRow } from './auth.js';
import { audit } from './audit.js';
import {
  checkIn, dismiss, emergencyRoster, ratio, runMissingSweep, safetyEvent, todayRoster,
} from './safety.js';

const checkInSchema = z.object({
  studentId: z.string(),
  siteId: z.string(),
  at: z.string().datetime().optional(),
  clientEventId: z.string().min(8).max(80),
});

const dismissSchema = checkInSchema.extend({
  pickupPersonId: z.string().optional(),
  pin: z.string().max(20).optional(),
  releasedToName: z.string().max(120).optional(),
});

const syncSchema = z.object({
  siteId: z.string(),
  events: z
    .array(
      z.object({
        clientEventId: z.string().min(8).max(80),
        type: z.enum(['check_in', 'check_out']),
        studentId: z.string(),
        at: z.string().datetime(),
        pickupPersonId: z.string().optional(),
        pin: z.string().max(20).optional(),
        releasedToName: z.string().max(120).optional(),
      }),
    )
    .max(500),
});

function nowOf(at?: string): Date {
  return at ? new Date(at) : new Date();
}

async function requireStaff(req: FastifyRequest, reply: FastifyReply, siteId: string, manage = false): Promise<ActorRow | null> {
  const actor = req.actor;
  if (!actor) {
    await reply.code(401).send({ error: 'unauthenticated' });
    return null;
  }
  const ok = manage ? canManageSafety(actor, siteId) : canRecordAttendance(actor, siteId);
  if (!ok) {
    await reply.code(403).send({ error: 'forbidden' });
    return null;
  }
  return actor;
}

export function registerSafetyRoutes(app: FastifyInstance, db: DB): void {
  app.post('/attendance/check-in', async (req, reply) => {
    const parsed = checkInSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const actor = await requireStaff(req, reply, parsed.data.siteId);
    if (!actor) return;
    if (parsed.data.siteId && actor.orgId) {
      const student = await one(db, "SELECT 1 AS x FROM users WHERE id = $1 AND org_id = $2 AND role = 'student'", [parsed.data.studentId, actor.orgId]);
      if (!student) return reply.code(404).send({ error: 'not_found' });
    }
    return checkIn(db, { orgId: actor.orgId, siteId: parsed.data.siteId, studentId: parsed.data.studentId, by: actor.id, at: nowOf(parsed.data.at), clientEventId: parsed.data.clientEventId });
  });

  app.post('/attendance/dismiss', async (req, reply) => {
    const parsed = dismissSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const actor = await requireStaff(req, reply, parsed.data.siteId);
    if (!actor) return;
    const result = await dismiss(db, {
      orgId: actor.orgId, siteId: parsed.data.siteId, studentId: parsed.data.studentId, by: actor.id,
      at: nowOf(parsed.data.at), clientEventId: parsed.data.clientEventId,
      pickupPersonId: parsed.data.pickupPersonId, pin: parsed.data.pin, releasedToName: parsed.data.releasedToName,
    });
    if (!result.applied && (result.reason === 'blocked_pickup' || result.reason === 'pin_invalid')) {
      return reply.code(403).send(result);
    }
    return result;
  });

  // Offline kiosk replay: applies a queued batch idempotently, in time order.
  app.post('/kiosk/sync', async (req, reply) => {
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const actor = await requireStaff(req, reply, parsed.data.siteId);
    if (!actor) return;

    const sorted = [...parsed.data.events].sort((a, b) => a.at.localeCompare(b.at));
    const results = [];
    for (const ev of sorted) {
      const base = { orgId: actor.orgId, siteId: parsed.data.siteId, studentId: ev.studentId, by: actor.id, at: new Date(ev.at), clientEventId: ev.clientEventId };
      const r =
        ev.type === 'check_in'
          ? await checkIn(db, base)
          : await dismiss(db, { ...base, pickupPersonId: ev.pickupPersonId, pin: ev.pin, releasedToName: ev.releasedToName });
      results.push({ clientEventId: ev.clientEventId, ...r });
    }
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'kiosk.sync', detail: { count: sorted.length } });
    return { results };
  });

  app.get('/attendance/today', async (req, reply) => {
    const { siteId } = req.query as { siteId?: string };
    if (!siteId) return reply.code(400).send({ error: 'siteId_required' });
    const actor = await requireStaff(req, reply, siteId);
    if (!actor) return;
    return todayRoster(db, { orgId: actor.orgId, siteId, now: new Date((req.query as { now?: string }).now ?? Date.now()) });
  });

  app.post('/safety/sweep', async (req, reply) => {
    const body = (req.body ?? {}) as { siteId?: string; now?: string };
    if (!body.siteId) return reply.code(400).send({ error: 'siteId_required' });
    const actor = await requireStaff(req, reply, body.siteId, true);
    if (!actor) return;
    return runMissingSweep(db, { orgId: actor.orgId, siteId: body.siteId, now: nowOf(body.now) });
  });

  app.get('/escalations', async (req, reply) => {
    const { siteId } = req.query as { siteId?: string };
    if (!siteId) return reply.code(400).send({ error: 'siteId_required' });
    const actor = await requireStaff(req, reply, siteId, true);
    if (!actor) return;
    return many(
      db,
      `SELECT x.id, x.student_id AS "studentId", u.name AS "studentName", x.status, x.opened_at AS "openedAt",
              (SELECT json_agg(json_build_object('seq', s.seq, 'kind', s.kind, 'at', s.created_at) ORDER BY s.seq)
                 FROM escalation_steps s WHERE s.escalation_id = x.id) AS steps
         FROM escalations x JOIN users u ON u.id = x.student_id
        WHERE x.org_id = $1 AND x.site_id = $2 AND x.status = 'open' ORDER BY x.opened_at`,
      [actor.orgId, siteId],
    );
  });

  app.post('/escalations/:id/resolve', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { reason?: string; now?: string };
    const esc = await one<{ id: string; org_id: string; site_id: string; student_id: string }>(
      db,
      'SELECT id, org_id, site_id, student_id FROM escalations WHERE id = $1',
      [id],
    );
    if (!esc || esc.org_id !== req.actor?.orgId) return reply.code(404).send({ error: 'not_found' });
    const actor = await requireStaff(req, reply, esc.site_id, true);
    if (!actor) return;
    const at = nowOf(body.now);
    await db.query(
      `UPDATE escalations SET status = 'resolved', resolved_at = $2, resolved_by = $3, resolved_reason = $4 WHERE id = $1 AND status = 'open'`,
      [id, at.toISOString(), actor.id, body.reason ?? 'manual'],
    );
    await safetyEvent(db, { orgId: actor.orgId, siteId: esc.site_id, type: 'escalation.resolved', studentId: esc.student_id, actorId: actor.id, detail: { reason: body.reason ?? 'manual' }, at });
    return { ok: true };
  });

  app.get('/safety/ratio', async (req, reply) => {
    const { siteId } = req.query as { siteId?: string };
    if (!siteId) return reply.code(400).send({ error: 'siteId_required' });
    const actor = await requireStaff(req, reply, siteId);
    if (!actor) return;
    return ratio(db, { orgId: actor.orgId, siteId, now: new Date((req.query as { now?: string }).now ?? Date.now()) });
  });

  app.post('/emergency/start', async (req, reply) => {
    const body = (req.body ?? {}) as { siteId?: string; now?: string };
    if (!body.siteId) return reply.code(400).send({ error: 'siteId_required' });
    const actor = await requireStaff(req, reply, body.siteId, true);
    if (!actor) return;
    const at = nowOf(body.now);
    const id = `em_${Date.now().toString(36)}`;
    await db.query(
      'INSERT INTO emergency_modes (id, org_id, site_id, started_at, started_by) VALUES ($1, $2, $3, $4, $5)',
      [id, actor.orgId, body.siteId, at.toISOString(), actor.id],
    );
    await safetyEvent(db, { orgId: actor.orgId, siteId: body.siteId, type: 'emergency.started', actorId: actor.id, at });
    const roster = await emergencyRoster(db, { orgId: actor.orgId, siteId: body.siteId, now: at });
    return { id, headcount: roster.length, roster };
  });

  app.get('/emergency/roster', async (req, reply) => {
    const { siteId } = req.query as { siteId?: string };
    if (!siteId) return reply.code(400).send({ error: 'siteId_required' });
    const actor = await requireStaff(req, reply, siteId);
    if (!actor) return;
    const roster = await emergencyRoster(db, { orgId: actor.orgId, siteId, now: new Date((req.query as { now?: string }).now ?? Date.now()) });
    return { headcount: roster.length, roster };
  });

  app.post('/emergency/end', async (req, reply) => {
    const body = (req.body ?? {}) as { id?: string; now?: string };
    const em = await one<{ id: string; org_id: string; site_id: string }>(db, 'SELECT id, org_id, site_id FROM emergency_modes WHERE id = $1 AND ended_at IS NULL', [body.id ?? '']);
    if (!em || em.org_id !== req.actor?.orgId) return reply.code(404).send({ error: 'not_found' });
    const actor = await requireStaff(req, reply, em.site_id, true);
    if (!actor) return;
    const at = nowOf(body.now);
    await db.query('UPDATE emergency_modes SET ended_at = $2, ended_by = $3 WHERE id = $1', [em.id, at.toISOString(), actor.id]);
    await safetyEvent(db, { orgId: actor.orgId, siteId: em.site_id, type: 'emergency.ended', actorId: actor.id, at });
    return { ok: true };
  });
}
