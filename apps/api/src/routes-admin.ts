import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { type DB, many, one } from './db.js';
import { hashPassword, issueToken, verifyPassword, type ActorRow } from './auth.js';
import { audit } from './audit.js';
import { notify } from './notify.js';
import { allocateLoginCode, rid } from './learning.js';

// Account lifecycle: how people actually get into the platform.
//  - Owner/Academic Director creates teachers (issued GV codes) and classes.
//  - Teachers import students (issued HV codes) — routes-learning.ts.
//  - Parents self-register with a one-time invite code tied to their child.
// Closed-loop by design: nobody enters a children's platform uninvited.

const ADMIN = ['owner', 'academic_director'];

async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<ActorRow | null> {
  if (!req.actor) {
    await reply.code(401).send({ error: 'unauthenticated' });
    return null;
  }
  if (!ADMIN.includes(req.actor.role)) {
    await reply.code(403).send({ error: 'forbidden' });
    return null;
  }
  return req.actor;
}

async function allocateInviteCode(db: DB): Promise<string> {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no confusable 0/O/1/I/L
  for (let i = 0; i < 500; i++) {
    let code = 'PH-';
    for (let j = 0; j < 6; j++) code += alphabet[randomInt(alphabet.length)];
    const clash = await one(db, 'SELECT 1 AS x FROM parent_invites WHERE code = $1', [code]);
    if (!clash) return code;
  }
  throw new Error('no invite code available');
}

export function registerAdminRoutes(app: FastifyInstance, db: DB): void {
  // ---------- Teacher accounts ----------
  app.post('/admin/teachers', async (req, reply) => {
    const actor = await requireAdmin(req, reply);
    if (!actor) return;
    const body = z.object({ name: z.string().min(2).max(120), email: z.string().email().optional(), siteId: z.string().optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });

    const code = await allocateLoginCode(db, 'GV');
    const email = (body.data.email ?? `${code.toLowerCase()}@gv.etop.local`).toLowerCase();
    const dup = await one(db, 'SELECT 1 AS x FROM users WHERE org_id = $1 AND email = $2', [actor.orgId, email]);
    if (dup) return reply.code(409).send({ error: 'email_taken' });

    if (body.data.siteId) {
      const site = await one(db, 'SELECT 1 AS x FROM sites WHERE id = $1 AND org_id = $2', [body.data.siteId, actor.orgId]);
      if (!site) return reply.code(400).send({ error: 'unknown_site' });
    }
    const id = rid('t');
    await db.query(
      `INSERT INTO users (id, org_id, site_id, role, name, email, login_code, password_hash)
       VALUES ($1, $2, $3, 'tutor', $4, $5, $6, $7)`,
      [id, actor.orgId, body.data.siteId ?? actor.siteId ?? null, body.data.name.trim(), email, code, hashPassword(rid('pw'))],
    );
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'admin.teacher_created', entity: 'user', entityId: id });
    return { id, name: body.data.name.trim(), loginCode: code };
  });

  app.get('/admin/teachers', async (req, reply) => {
    const actor = await requireAdmin(req, reply);
    if (!actor) return;
    return many(
      db,
      `SELECT u.id, u.name, u.email, u.login_code AS "loginCode",
              (SELECT COUNT(*)::int FROM classes c WHERE c.teacher_id = u.id) AS "classCount"
         FROM users u WHERE u.org_id = $1 AND u.role = 'tutor' AND u.archived = false ORDER BY u.name`,
      [actor.orgId],
    );
  });

  // ---------- Staff accounts (front desk) ----------
  // The owner creates front-desk accounts with a one-time temporary
  // password; the staffer signs in at the "Khu vực trung tâm" area and
  // immediately sets their own email/password (/me/email, /auth/change-password).
  app.post('/admin/staff', async (req, reply) => {
    const actor = await requireAdmin(req, reply);
    if (!actor) return;
    const body = z.object({ name: z.string().min(2).max(120), email: z.string().email().max(254), siteId: z.string().optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });

    const email = body.data.email.toLowerCase();
    const dup = await one(db, 'SELECT 1 AS x FROM users WHERE org_id = $1 AND email = $2', [actor.orgId, email]);
    if (dup) return reply.code(409).send({ error: 'email_taken' });

    // The site must belong to this org; no cross-tenant linkage, no
    // seed-org fallback.
    let siteId = body.data.siteId ?? actor.siteId ?? null;
    if (siteId) {
      const site = await one(db, 'SELECT 1 AS x FROM sites WHERE id = $1 AND org_id = $2', [siteId, actor.orgId]);
      if (!site) return reply.code(400).send({ error: 'unknown_site' });
    } else {
      const first = await one<{ id: string }>(db, 'SELECT id FROM sites WHERE org_id = $1 ORDER BY id LIMIT 1', [actor.orgId]);
      siteId = first?.id ?? null;
    }
    // Readable one-time password, shown to the owner exactly once.
    let temp = 'Etop@';
    for (let i = 0; i < 4; i++) temp += String(randomInt(10));
    const id = rid('fd');
    await db.query(
      `INSERT INTO users (id, org_id, site_id, role, name, email, password_hash)
       VALUES ($1, $2, $3, 'front_desk', $4, $5, $6)`,
      [id, actor.orgId, siteId, body.data.name.trim(), email, hashPassword(temp)],
    );
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'admin.staff_created', entity: 'user', entityId: id });
    return { id, name: body.data.name.trim(), email, tempPassword: temp };
  });

  app.get('/admin/staff', async (req, reply) => {
    const actor = await requireAdmin(req, reply);
    if (!actor) return;
    return many(
      db,
      `SELECT id, name, email, site_id AS "siteId" FROM users
        WHERE org_id = $1 AND role = 'front_desk' AND archived = false ORDER BY name`,
      [actor.orgId],
    );
  });

  // ---------- Classes ----------
  app.post('/admin/classes', async (req, reply) => {
    const actor = await requireAdmin(req, reply);
    if (!actor) return;
    const body = z.object({
      name: z.string().min(1).max(80),
      scheduleNote: z.string().max(120).default(''),
      teacherId: z.string().optional(),
      siteId: z.string().optional(),
      level: z.string().max(40).default(''),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });

    if (body.data.teacherId) {
      const teacher = await one(db, `SELECT 1 AS x FROM users WHERE id = $1 AND org_id = $2 AND role = 'tutor'`, [body.data.teacherId, actor.orgId]);
      if (!teacher) return reply.code(400).send({ error: 'unknown_teacher' });
    }
    const siteId = body.data.siteId ?? actor.siteId ?? 'site_nh';
    const site = await one(db, 'SELECT 1 AS x FROM sites WHERE id = $1 AND org_id = $2', [siteId, actor.orgId]);
    if (!site) return reply.code(400).send({ error: 'unknown_site' });

    const id = rid('cls');
    await db.query(
      `INSERT INTO classes (id, org_id, site_id, teacher_id, name, level, schedule_note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, actor.orgId, siteId, body.data.teacherId ?? null, body.data.name.trim(), body.data.level, body.data.scheduleNote],
    );
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'admin.class_created', entity: 'class', entityId: id });
    return { id, name: body.data.name.trim() };
  });

  app.patch('/admin/classes/:id', async (req, reply) => {
    const actor = await requireAdmin(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const cls = await one<{ org_id: string }>(db, 'SELECT org_id FROM classes WHERE id = $1', [id]);
    if (!cls || cls.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    const body = z.object({ name: z.string().min(1).max(80).optional(), scheduleNote: z.string().max(120).optional(), teacherId: z.string().nullable().optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });

    if (body.data.teacherId) {
      const teacher = await one(db, `SELECT 1 AS x FROM users WHERE id = $1 AND org_id = $2 AND role = 'tutor'`, [body.data.teacherId, actor.orgId]);
      if (!teacher) return reply.code(400).send({ error: 'unknown_teacher' });
    }
    if (body.data.name !== undefined) await db.query('UPDATE classes SET name = $2 WHERE id = $1', [id, body.data.name.trim()]);
    if (body.data.scheduleNote !== undefined) await db.query('UPDATE classes SET schedule_note = $2 WHERE id = $1', [id, body.data.scheduleNote]);
    if (body.data.teacherId !== undefined) await db.query('UPDATE classes SET teacher_id = $2 WHERE id = $1', [id, body.data.teacherId]);
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'admin.class_updated', entity: 'class', entityId: id });
    return { ok: true };
  });

  // ---------- Parent invites & self-registration ----------
  app.post('/students/:id/invite', async (req, reply) => {
    const actor = req.actor;
    if (!actor) return reply.code(401).send({ error: 'unauthenticated' });
    const { id } = req.params as { id: string };
    const student = await one<{ org_id: string; name: string }>(db, `SELECT org_id, name FROM users WHERE id = $1 AND role = 'student' AND archived = false`, [id]);
    if (!student || student.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });

    const allowed =
      ADMIN.includes(actor.role) ||
      actor.role === 'site_director' ||
      (actor.role === 'tutor' &&
        !!(await one(db, 'SELECT 1 AS x FROM enrollments e JOIN classes c ON c.id = e.class_id WHERE e.student_id = $1 AND c.teacher_id = $2', [id, actor.id])));
    if (!allowed) return reply.code(403).send({ error: 'forbidden' });

    const code = await allocateInviteCode(db);
    await db.query('INSERT INTO parent_invites (code, org_id, student_id, created_by) VALUES ($1, $2, $3, $4)', [code, actor.orgId, id, actor.id]);
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'parent.invited', entity: 'student', entityId: id });
    return { inviteCode: code, studentName: student.name };
  });

  app.post('/auth/register-parent', async (req, reply) => {
    const body = z.object({
      inviteCode: z.string().min(6).max(20),
      name: z.string().min(2).max(120),
      email: z.string().email().max(254),
      password: z.string().min(6).max(200),
      phone: z.string().max(20).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input', detail: body.error.issues[0]?.message });

    const invite = await one<{ code: string; org_id: string; student_id: string; used_by: string | null }>(
      db,
      'SELECT code, org_id, student_id, used_by FROM parent_invites WHERE code = $1',
      [body.data.inviteCode.trim().toUpperCase()],
    );
    if (!invite) {
      await audit(db, { action: 'auth.register_failed', detail: { reason: 'bad_invite' } });
      return reply.code(404).send({ error: 'invalid_invite' });
    }
    if (invite.used_by) return reply.code(409).send({ error: 'invite_used' });

    const email = body.data.email.toLowerCase();
    const dup = await one(db, 'SELECT 1 AS x FROM users WHERE org_id = $1 AND email = $2', [invite.org_id, email]);
    if (dup) return reply.code(409).send({ error: 'email_taken' });

    const id = rid('p');
    // Atomic claim BEFORE creating anything: two concurrent redemptions of
    // the same code must not both become guardians — the invite is the
    // only gate into a child's data.
    const claimed = await db.query('UPDATE parent_invites SET used_by = $2, used_at = now() WHERE code = $1 AND used_by IS NULL', [invite.code, id]);
    if (claimed.affectedRows === 0) return reply.code(409).send({ error: 'invite_used' });

    try {
      await db.query(
        `INSERT INTO users (id, org_id, role, name, email, phone, password_hash) VALUES ($1, $2, 'parent', $3, $4, $5, $6)`,
        [id, invite.org_id, body.data.name.trim(), email, body.data.phone ?? null, hashPassword(body.data.password)],
      );
      const order = await one<{ n: string }>(db, 'SELECT COUNT(*)::text AS n FROM guardian_students WHERE student_id = $1', [invite.student_id]);
      await db.query('INSERT INTO guardian_students (guardian_id, student_id, contact_order) VALUES ($1, $2, $3)', [id, invite.student_id, Number(order?.n ?? 0) + 1]);
    } catch (e) {
      // Give the invite back — a failed registration must not burn the
      // family's only way in (e.g. an email-uniqueness race).
      await db.query('UPDATE parent_invites SET used_by = NULL, used_at = NULL WHERE code = $1 AND used_by = $2', [invite.code, id]);
      throw e;
    }
    await audit(db, { orgId: invite.org_id, actorId: id, action: 'auth.parent_registered', entity: 'student', entityId: invite.student_id });
    await notify(db, { orgId: invite.org_id, channel: 'push', toUserId: id, body: 'Chào mừng đến với E’TOP! 💜', at: new Date() });

    const token = await issueToken(db, id);
    return { token, user: { id, name: body.data.name.trim(), role: 'parent' } };
  });

  // ---------- Email change (email-auth roles) ----------
  // Owners and front desk set up their own private email; requires the
  // current password so a left-open session can't be hijacked quietly.
  app.post('/me/email', async (req, reply) => {
    const actor = req.actor;
    if (!actor) return reply.code(401).send({ error: 'unauthenticated' });
    if (actor.role === 'student' || actor.role === 'tutor') return reply.code(403).send({ error: 'code_login_roles' });
    const body = z.object({ password: z.string().min(1), email: z.string().email().max(254) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });

    const row = await one<{ password_hash: string }>(db, 'SELECT password_hash FROM users WHERE id = $1', [actor.id]);
    if (!row || !verifyPassword(body.data.password, row.password_hash)) {
      await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'auth.email_change_failed' });
      return reply.code(403).send({ error: 'wrong_password' });
    }
    const email = body.data.email.toLowerCase();
    const dup = await one(db, 'SELECT 1 AS x FROM users WHERE org_id = $1 AND email = $2 AND id <> $3', [actor.orgId, email, actor.id]);
    if (dup) return reply.code(409).send({ error: 'email_taken' });
    await db.query('UPDATE users SET email = $2 WHERE id = $1', [actor.id, email]);
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'auth.email_changed' });
    return { ok: true, email };
  });

  // ---------- Password change (email-auth roles) ----------
  app.post('/auth/change-password', async (req, reply) => {
    const actor = req.actor;
    if (!actor) return reply.code(401).send({ error: 'unauthenticated' });
    const body = z.object({ current: z.string().min(1), next: z.string().min(6).max(200) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });

    const row = await one<{ password_hash: string }>(db, 'SELECT password_hash FROM users WHERE id = $1', [actor.id]);
    if (!row || !verifyPassword(body.data.current, row.password_hash)) {
      await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'auth.password_change_failed' });
      return reply.code(403).send({ error: 'wrong_password' });
    }
    await db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [actor.id, hashPassword(body.data.next)]);
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'auth.password_changed' });
    return { ok: true };
  });
}
