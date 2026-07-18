import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { type DB, many, one } from './db.js';
import type { ActorRow } from './auth.js';
import { audit } from './audit.js';
import { notify } from './notify.js';
import { rid } from './learning.js';
import { runBilling, runDunning, runLateFees, vietQrPayload } from './billing.js';

const MONEY_ROLES = ['owner', 'billing_admin'];
const LEAD_ROLES = ['owner', 'site_director'];
const LEAD_STAGES = ['inquiry', 'tour', 'assessment', 'offered', 'enrolled', 'waitlist', 'lost'];

async function requireRole(req: FastifyRequest, reply: FastifyReply, roles: string[]): Promise<ActorRow | null> {
  if (!req.actor) {
    await reply.code(401).send({ error: 'unauthenticated' });
    return null;
  }
  if (!roles.includes(req.actor.role)) {
    await reply.code(403).send({ error: 'forbidden' });
    return null;
  }
  return req.actor;
}

export function registerMoneyRoutes(app: FastifyInstance, db: DB): void {
  // ---------- Plans ----------
  app.post('/billing/plans', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    const body = z.object({ name: z.string().min(1), kind: z.enum(['monthly', 'term', 'package', 'dropin']).default('monthly'), priceVnd: z.number().int().positive(), sessionsCount: z.number().int().positive().optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const id = rid('plan');
    await db.query('INSERT INTO billing_plans (id, org_id, name, kind, price_vnd, sessions_count) VALUES ($1, $2, $3, $4, $5, $6)', [
      id, actor.orgId, body.data.name, body.data.kind, body.data.priceVnd, body.data.sessionsCount ?? null,
    ]);
    return { id };
  });

  app.get('/billing/plans', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    return many(db, 'SELECT id, name, kind, price_vnd AS "priceVnd" FROM billing_plans WHERE org_id = $1', [actor.orgId]);
  });

  app.post('/students/:id/plan', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const body = z.object({ planId: z.string(), startedOn: z.string().date(), siblingDiscountPct: z.number().int().min(0).max(100).default(0), scholarshipPct: z.number().int().min(0).max(100).default(0) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const student = await one(db, `SELECT 1 AS x FROM users WHERE id = $1 AND org_id = $2 AND role = 'student'`, [id, actor.orgId]);
    const plan = await one(db, 'SELECT 1 AS x FROM billing_plans WHERE id = $1 AND org_id = $2', [body.data.planId, actor.orgId]);
    if (!student || !plan) return reply.code(404).send({ error: 'not_found' });
    const spId = rid('sp');
    // One active plan per student: assigning a new plan ends the old one
    // (billing only ever invoices one plan per student per period).
    await db.query(`UPDATE student_plans SET status = 'ended', ended_on = $2 WHERE student_id = $1 AND status = 'active'`, [id, body.data.startedOn]);
    await db.query(
      'INSERT INTO student_plans (id, org_id, student_id, plan_id, started_on, sibling_discount_pct, scholarship_pct) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [spId, actor.orgId, id, body.data.planId, body.data.startedOn, body.data.siblingDiscountPct, body.data.scholarshipPct],
    );
    return { id: spId };
  });

  // ---------- Billing runs ----------
  app.post('/billing/run', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    const body = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/), dueOn: z.string().date() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const result = await runBilling(db, { orgId: actor.orgId, period: body.data.period, dueOn: body.data.dueOn });
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'billing.run', detail: { period: body.data.period, ...result } });
    return result;
  });

  app.post('/billing/late-fees/run', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    const body = z.object({ date: z.string().date() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    return { created: await runLateFees(db, { orgId: actor.orgId, date: body.data.date }) };
  });

  app.post('/billing/dunning/run', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    const { now } = (req.body ?? {}) as { now?: string };
    return runDunning(db, { orgId: actor.orgId, now: now ? new Date(now) : new Date() });
  });

  // ---------- Invoices & payments ----------
  app.get('/billing/invoices', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    const { status } = req.query as { status?: string };
    return many(
      db,
      `SELECT i.id, i.student_id AS "studentId", u.name AS "studentName", i.period, i.total_vnd AS "totalVnd",
              i.status, i.due_on AS "dueOn", i.reminders
         FROM invoices i JOIN users u ON u.id = i.student_id
        WHERE i.org_id = $1 AND ($2::text IS NULL OR i.status = $2) ORDER BY i.due_on DESC`,
      [actor.orgId, status ?? null],
    );
  });

  app.get('/my/invoices', async (req, reply) => {
    const actor = req.actor;
    if (!actor) return reply.code(401).send({ error: 'unauthenticated' });
    if (actor.role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const rows = await many<{ id: string; total_vnd: number }>(
      db,
      `SELECT i.id, i.student_id AS "studentId", u.name AS "studentName", i.period, i.line_items AS "lineItems",
              i.subtotal_vnd AS "subtotalVnd", i.discount_vnd AS "discountVnd", i.total_vnd AS "total_vnd",
              i.status, i.due_on AS "dueOn", i.paid_at AS "paidAt"
         FROM invoices i JOIN users u ON u.id = i.student_id
        WHERE i.org_id = $1 AND i.student_id IN (SELECT student_id FROM guardian_students WHERE guardian_id = $2)
        ORDER BY i.period DESC`,
      [actor.orgId, actor.id],
    );
    return rows.map((r) => ({ ...r, totalVnd: Number(r.total_vnd), vietqr: vietQrPayload({ id: r.id, total_vnd: Number(r.total_vnd) }) }));
  });

  app.post('/invoices/:id/record-payment', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const body = z.object({ amountVnd: z.number().int().positive(), method: z.enum(['vietqr', 'bank_transfer', 'cash']), ref: z.string().max(120).optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const inv = await one<{ id: string; org_id: string; total_vnd: number; status: string }>(db, 'SELECT id, org_id, total_vnd, status FROM invoices WHERE id = $1', [id]);
    if (!inv || inv.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    if (inv.status === 'void') return reply.code(409).send({ error: 'voided' });

    await db.query('INSERT INTO payments (id, org_id, invoice_id, amount_vnd, method, ref, recorded_by) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
      rid('pay'), actor.orgId, id, body.data.amountVnd, body.data.method, body.data.ref ?? null, actor.id,
    ]);
    const paid = await one<{ sum: string }>(db, 'SELECT COALESCE(SUM(amount_vnd), 0)::text AS sum FROM payments WHERE invoice_id = $1', [id]);
    const fullyPaid = Number(paid?.sum ?? 0) >= Number(inv.total_vnd);
    if (fullyPaid) await db.query(`UPDATE invoices SET status = 'paid', paid_at = now() WHERE id = $1`, [id]);
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'payment.recorded', entity: 'invoice', entityId: id, detail: { amountVnd: body.data.amountVnd, method: body.data.method } });
    return { ok: true, status: fullyPaid ? 'paid' : 'open', paidVnd: Number(paid?.sum ?? 0) };
  });

  // ---------- Refunds (request → owner approves → process) ----------
  app.post('/invoices/:id/refund', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const body = z.object({ amountVnd: z.number().int().positive(), reason: z.string().min(3).max(500) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const inv = await one<{ org_id: string }>(db, 'SELECT org_id FROM invoices WHERE id = $1', [id]);
    if (!inv || inv.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    // A refund can never exceed what was actually collected, counting
    // every refund that is still alive (requested/approved/processed).
    const paid = await one<{ sum: string }>(db, 'SELECT COALESCE(SUM(amount_vnd), 0)::text AS sum FROM payments WHERE invoice_id = $1', [id]);
    const refunded = await one<{ sum: string }>(db, `SELECT COALESCE(SUM(amount_vnd), 0)::text AS sum FROM refunds WHERE invoice_id = $1 AND status IN ('requested', 'approved', 'processed')`, [id]);
    if (body.data.amountVnd > Number(paid?.sum ?? 0) - Number(refunded?.sum ?? 0)) {
      return reply.code(422).send({ error: 'exceeds_refundable', refundableVnd: Number(paid?.sum ?? 0) - Number(refunded?.sum ?? 0) });
    }
    const rfId = rid('rf');
    await db.query('INSERT INTO refunds (id, org_id, invoice_id, amount_vnd, reason, requested_by) VALUES ($1, $2, $3, $4, $5, $6)', [
      rfId, actor.orgId, id, body.data.amountVnd, body.data.reason, actor.id,
    ]);
    return { id: rfId, status: 'requested' };
  });

  app.post('/refunds/:id/approve', async (req, reply) => {
    const actor = await requireRole(req, reply, ['owner']);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const rf = await one<{ org_id: string; status: string }>(db, 'SELECT org_id, status FROM refunds WHERE id = $1', [id]);
    if (!rf || rf.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    if (rf.status !== 'requested') return reply.code(409).send({ error: 'not_requestable' });
    await db.query(`UPDATE refunds SET status = 'approved', approved_by = $2 WHERE id = $1`, [id, actor.id]);
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'refund.approved', entity: 'refund', entityId: id });
    return { ok: true };
  });

  app.post('/refunds/:id/process', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const rf = await one<{ org_id: string; status: string }>(db, 'SELECT org_id, status FROM refunds WHERE id = $1', [id]);
    if (!rf || rf.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    // The approval workflow cannot be skipped.
    if (rf.status !== 'approved') return reply.code(409).send({ error: 'approval_required' });
    await db.query(`UPDATE refunds SET status = 'processed', processed_at = now() WHERE id = $1`, [id]);
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'refund.processed', entity: 'refund', entityId: id });
    return { ok: true };
  });

  // ---------- Finance dashboard ----------
  app.get('/billing/dashboard', async (req, reply) => {
    const actor = await requireRole(req, reply, MONEY_ROLES);
    if (!actor) return;
    const revenue = await many(
      db,
      `SELECT i.period, SUM(p.amount_vnd)::bigint AS "revenueVnd"
         FROM payments p JOIN invoices i ON i.id = p.invoice_id
        WHERE p.org_id = $1 GROUP BY i.period ORDER BY i.period`,
      [actor.orgId],
    );
    const aging = await many(
      db,
      `SELECT CASE
                WHEN due_on >= CURRENT_DATE THEN 'current'
                WHEN due_on >= CURRENT_DATE - 30 THEN '1-30'
                WHEN due_on >= CURRENT_DATE - 60 THEN '31-60'
                ELSE '60+'
              END AS bucket,
              SUM(total_vnd)::bigint AS "outstandingVnd", COUNT(*)::int AS invoices
         FROM invoices WHERE org_id = $1 AND status IN ('open', 'overdue') GROUP BY bucket`,
      [actor.orgId],
    );
    return { revenue, arAging: aging };
  });

  // ---------- Admissions pipeline ----------
  app.post('/leads', async (req, reply) => {
    const actor = await requireRole(req, reply, LEAD_ROLES);
    if (!actor) return;
    const body = z.object({ parentName: z.string().min(1), contact: z.string().min(3), childName: z.string().min(1), childAge: z.number().int().min(3).max(18).optional(), siteId: z.string().optional(), notes: z.string().max(2000).default(''), referralCode: z.string().max(20).optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const id = rid('lead');
    await db.query('INSERT INTO leads (id, org_id, site_id, parent_name, contact, child_name, child_age, notes, referral_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [
      id, actor.orgId, body.data.siteId ?? actor.siteId, body.data.parentName, body.data.contact, body.data.childName, body.data.childAge ?? null, body.data.notes, body.data.referralCode ?? null,
    ]);
    return { id, stage: 'inquiry' };
  });

  app.get('/leads', async (req, reply) => {
    const actor = await requireRole(req, reply, LEAD_ROLES);
    if (!actor) return;
    return many(db, `SELECT id, parent_name AS "parentName", child_name AS "childName", contact, stage, updated_at AS "updatedAt" FROM leads WHERE org_id = $1 ORDER BY updated_at DESC`, [actor.orgId]);
  });

  app.patch('/leads/:id/stage', async (req, reply) => {
    const actor = await requireRole(req, reply, LEAD_ROLES);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const { stage } = (req.body ?? {}) as { stage?: string };
    if (!stage || !LEAD_STAGES.includes(stage)) return reply.code(400).send({ error: 'invalid_stage' });
    const lead = await one<{ org_id: string; contact: string; parent_name: string; child_name: string; referral_code: string | null; stage: string }>(db, 'SELECT org_id, contact, parent_name, child_name, referral_code, stage FROM leads WHERE id = $1', [id]);
    if (!lead || lead.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    await db.query('UPDATE leads SET stage = $2, updated_at = now() WHERE id = $1', [id, stage]);

    // Referral conversion: enrolling a referred lead credits the referrer.
    if (stage === 'enrolled' && lead.stage !== 'enrolled' && lead.referral_code) {
      const referrer = await one<{ parent_id: string }>(db, 'SELECT parent_id FROM referral_codes WHERE code = $1 AND org_id = $2', [lead.referral_code, actor.orgId]);
      // One credit per lead, ever — stage flapping (enrolled → lost →
      // enrolled) must not mint another. The lead id rides in the reason.
      const already = referrer
        ? await one(db, 'SELECT 1 AS x FROM account_credits WHERE org_id = $1 AND reason LIKE $2', [actor.orgId, `%[lead:${id}]%`])
        : null;
      if (referrer && !already) {
        await db.query('INSERT INTO account_credits (id, org_id, parent_id, amount_vnd, reason) VALUES ($1, $2, $3, $4, $5)', [
          rid('cr'), actor.orgId, referrer.parent_id, 200000, `Referral: ${lead.child_name ?? lead.parent_name} [lead:${id}]`,
        ]);
        await notify(db, { orgId: actor.orgId, channel: 'push', toUserId: referrer.parent_id, body: 'Cảm ơn bạn đã giới thiệu! 200.000đ đã được cộng vào tài khoản. 💜', at: new Date() });
      }
    }
    // Nurture touchpoint on stage change (email channel, mock provider).
    await notify(db, { orgId: actor.orgId, channel: 'push', toContact: lead.contact, body: `E'TOP admissions update for ${lead.parent_name}: ${stage}`, at: new Date() });
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'lead.stage_changed', entity: 'lead', entityId: id, detail: { stage } });
    return { ok: true, stage };
  });

  // ---------- Enrollment packets (e-signature) ----------
  app.post('/students/:id/packets', async (req, reply) => {
    const actor = await requireRole(req, reply, ['owner', 'site_director', 'billing_admin']);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const body = z.object({ title: z.string().min(1), bodyText: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const student = await one(db, `SELECT 1 AS x FROM users WHERE id = $1 AND org_id = $2 AND role = 'student'`, [id, actor.orgId]);
    if (!student) return reply.code(404).send({ error: 'not_found' });
    const last = await one<{ version: number }>(db, 'SELECT MAX(version)::int AS version FROM enrollment_packets WHERE student_id = $1', [id]);
    const pkId = rid('pk');
    await db.query('INSERT INTO enrollment_packets (id, org_id, student_id, version, title, body) VALUES ($1, $2, $3, $4, $5, $6)', [
      pkId, actor.orgId, id, (last?.version ?? 0) + 1, body.data.title, body.data.bodyText,
    ]);
    const guardians = await many<{ guardian_id: string }>(db, 'SELECT guardian_id FROM guardian_students WHERE student_id = $1', [id]);
    for (const g of guardians) {
      await notify(db, { orgId: actor.orgId, channel: 'push', toUserId: g.guardian_id, body: `Document to sign: ${body.data.title}`, at: new Date() });
    }
    return { id: pkId };
  });

  app.get('/my/packets', async (req, reply) => {
    const actor = req.actor;
    if (!actor) return reply.code(401).send({ error: 'unauthenticated' });
    if (actor.role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    return many(
      db,
      `SELECT p.id, p.title, p.body, p.version, p.status, u.name AS "studentName"
         FROM enrollment_packets p JOIN users u ON u.id = p.student_id
        WHERE p.org_id = $1 AND p.student_id IN (SELECT student_id FROM guardian_students WHERE guardian_id = $2)
        ORDER BY p.sent_at DESC`,
      [actor.orgId, actor.id],
    );
  });

  app.post('/packets/:id/sign', async (req, reply) => {
    const actor = req.actor;
    if (!actor) return reply.code(401).send({ error: 'unauthenticated' });
    if (actor.role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const { id } = req.params as { id: string };
    const { typedName } = (req.body ?? {}) as { typedName?: string };
    if (!typedName?.trim()) return reply.code(400).send({ error: 'typedName_required' });
    const pk = await one<{ org_id: string; student_id: string; status: string }>(db, 'SELECT org_id, student_id, status FROM enrollment_packets WHERE id = $1', [id]);
    if (!pk || pk.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    const guardian = await one(db, 'SELECT 1 AS x FROM guardian_students WHERE guardian_id = $1 AND student_id = $2', [actor.id, pk.student_id]);
    if (!guardian) return reply.code(403).send({ error: 'forbidden' });
    if (pk.status === 'signed') return reply.code(409).send({ error: 'already_signed' });
    await db.query(`UPDATE enrollment_packets SET status = 'signed', signed_at = now(), signed_by_user = $2, signed_by_name = $3 WHERE id = $1`, [id, actor.id, typedName.trim()]);
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'packet.signed', entity: 'packet', entityId: id, detail: { typedName: typedName.trim() } });
    return { ok: true };
  });
}
