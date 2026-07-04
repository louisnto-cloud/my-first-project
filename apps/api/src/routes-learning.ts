import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  DEFAULT_SKILL_WEIGHTS, MANUAL_TYPES, QUESTION_TYPES, SKILLS, canAuthorQuestions, canTeachClass, canViewStudent,
  weightedOverall, type ClassRef, type SkillKey, type SkillScore,
} from '@etop/domain';
import { type DB, many, one } from './db.js';
import { hashPassword, type ActorRow } from './auth.js';
import { audit } from './audit.js';
import { notify } from './notify.js';
import {
  allocateLoginCode, assignmentQuestions, gradeSubmission, isEnrolled, recordMastery, rid, rotateJoinCode, seededShuffle, serializeForStudent,
} from './learning.js';

async function getClass(db: DB, id: string): Promise<(ClassRef & { name: string }) | null> {
  return one(db, 'SELECT id, org_id AS "orgId", site_id AS "siteId", teacher_id AS "teacherId", name FROM classes WHERE id = $1', [id]);
}

async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<ActorRow | null> {
  if (!req.actor) {
    await reply.code(401).send({ error: 'unauthenticated' });
    return null;
  }
  return req.actor;
}

/** Hard class scoping for teachers: 404 cross-tenant, 403 same-tenant. */
async function requireTeach(req: FastifyRequest, reply: FastifyReply, db: DB, classId: string) {
  const actor = await requireAuth(req, reply);
  if (!actor) return null;
  const cls = await getClass(db, classId);
  if (!cls || cls.orgId !== actor.orgId) {
    await reply.code(404).send({ error: 'not_found' });
    return null;
  }
  if (!canTeachClass(actor, cls)) {
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'access.denied', entity: 'class', entityId: classId });
    await reply.code(403).send({ error: 'forbidden' });
    return null;
  }
  return { actor, cls };
}

const questionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  skill: z.enum(SKILLS),
  level: z.string().optional(),
  series: z.string().max(120).optional(),
  unit: z.string().max(60).optional(),
  prompt: z.string().max(2000).default(''),
  payload: z.record(z.unknown()),
  copyrightAck: z.boolean().default(false),
});

const assignmentSchema = z.object({
  title: z.string().min(1).max(200),
  instructions: z.string().max(5000).default(''),
  dueAt: z.string().datetime().optional(),
  timeLimitMin: z.number().int().positive().max(480).optional(),
  attemptsAllowed: z.number().int().min(1).max(10).default(1),
  showResults: z.enum(['instant', 'after_review']).default('instant'),
  fixedOrder: z.boolean().default(false),
  questionIds: z.array(z.string()).min(1).max(100),
});

export function registerLearningRoutes(app: FastifyInstance, db: DB): void {
  // ---------- Taxonomy ----------
  app.get('/taxonomy', async (req, reply) => {
    if (!(await requireAuth(req, reply))) return;
    const skills = await many(db, 'SELECT id, subject, strand, level, key, name FROM skills ORDER BY level, strand, key');
    const prereqs = await many(db, 'SELECT skill_id AS "skillId", prereq_id AS "prereqId" FROM skill_prereqs');
    return { skills, prereqs };
  });

  // ---------- Join codes ----------
  app.post('/classes/:id/rotate-code', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = await requireTeach(req, reply, db, id);
    if (!ctx) return;
    const code = await rotateJoinCode(db, id);
    await audit(db, { orgId: ctx.actor.orgId, actorId: ctx.actor.id, action: 'class.code_rotated', entity: 'class', entityId: id });
    return { code };
  });

  app.post('/classes/join', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (actor.role !== 'student') return reply.code(403).send({ error: 'students_only' });
    const { code } = (req.body ?? {}) as { code?: string };
    if (!code) return reply.code(400).send({ error: 'code_required' });

    const cls = await one<{ id: string; org_id: string; name: string }>(
      db,
      'SELECT id, org_id, name FROM classes WHERE join_code = $1',
      [code.trim().toUpperCase()],
    );
    // Wrong/rotated code or another tenant's code: identical "invalid" answer.
    if (!cls || cls.org_id !== actor.orgId) return reply.code(404).send({ error: 'invalid_code' });
    if (await isEnrolled(db, cls.id, actor.id)) return reply.code(409).send({ error: 'already_enrolled' });

    const existing = await one(db, `SELECT 1 AS x FROM join_requests WHERE class_id = $1 AND student_id = $2 AND status = 'pending'`, [cls.id, actor.id]);
    if (existing) return { status: 'pending', className: cls.name };

    await db.query('INSERT INTO join_requests (id, org_id, class_id, student_id) VALUES ($1, $2, $3, $4)', [rid('jr'), actor.orgId, cls.id, actor.id]);
    return { status: 'pending', className: cls.name };
  });

  app.get('/classes/:id/join-requests', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = await requireTeach(req, reply, db, id);
    if (!ctx) return;
    return many(
      db,
      `SELECT j.id, j.student_id AS "studentId", u.name, j.created_at AS "createdAt"
         FROM join_requests j JOIN users u ON u.id = j.student_id
        WHERE j.class_id = $1 AND j.status = 'pending' ORDER BY j.created_at`,
      [id],
    );
  });

  app.post('/join-requests/:id/decide', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { approve } = (req.body ?? {}) as { approve?: boolean };
    const jr = await one<{ id: string; class_id: string; student_id: string; status: string }>(
      db,
      'SELECT id, class_id, student_id, status FROM join_requests WHERE id = $1',
      [id],
    );
    if (!jr) return reply.code(404).send({ error: 'not_found' });
    const ctx = await requireTeach(req, reply, db, jr.class_id);
    if (!ctx) return;
    if (jr.status !== 'pending') return reply.code(409).send({ error: 'already_decided' });

    await db.query('UPDATE join_requests SET status = $2, decided_at = now(), decided_by = $3 WHERE id = $1', [
      id, approve ? 'approved' : 'rejected', ctx.actor.id,
    ]);
    if (approve) {
      await db.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [jr.class_id, jr.student_id]);
    }
    await audit(db, { orgId: ctx.actor.orgId, actorId: ctx.actor.id, action: approve ? 'class.join_approved' : 'class.join_rejected', entity: 'class', entityId: jr.class_id, detail: { studentId: jr.student_id } });
    return { ok: true };
  });

  // ---------- Roster management (teacher pastes the student list) ----------
  // Accepts plain names (codes auto-issued) or name+code pairs (the
  // center's own code scheme, e.g. UP1482). Only codes in this list are
  // recognized at login — that IS the approval.
  app.post('/classes/:id/students', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = await requireTeach(req, reply, db, id);
    if (!ctx) return;
    const body = z
      .object({
        names: z.array(z.string().min(1).max(120)).max(60).optional(),
        students: z
          .array(z.object({ name: z.string().min(1).max(120), code: z.string().regex(/^[A-Za-z0-9-]{4,20}$/).optional() }))
          .max(60)
          .optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const entries = [
      ...(body.data.names ?? []).map((name) => ({ name, code: undefined as string | undefined })),
      ...(body.data.students ?? []),
    ];
    if (entries.length === 0 || entries.length > 60) return reply.code(400).send({ error: 'invalid_input' });

    // Custom codes must be free before any account is created.
    for (const e of entries) {
      if (!e.code) continue;
      const clash = await one(db, 'SELECT 1 AS x FROM users WHERE login_code = $1', [e.code.toUpperCase()]);
      if (clash) return reply.code(409).send({ error: 'code_taken', code: e.code.toUpperCase() });
    }

    const created = [];
    for (const e of entries) {
      const code = e.code ? e.code.toUpperCase() : await allocateLoginCode(db, 'HV');
      const sid = rid('s');
      await db.query(
        `INSERT INTO users (id, org_id, site_id, role, name, email, login_code, password_hash)
         VALUES ($1, $2, $3, 'student', $4, $5, $6, $7)`,
        [sid, ctx.actor.orgId, ctx.cls.siteId, e.name.trim(), `${code.toLowerCase()}@hv.etop.local`, code, hashPassword(rid('pw'))],
      );
      await db.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2)', [id, sid]);
      created.push({ id: sid, name: e.name.trim(), loginCode: code });
    }
    await audit(db, { orgId: ctx.actor.orgId, actorId: ctx.actor.id, action: 'class.students_added', entity: 'class', entityId: id, detail: { count: created.length } });
    return { created };
  });

  app.post('/students/:id/rotate-code', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const student = await one<{ org_id: string }>(db, `SELECT org_id FROM users WHERE id = $1 AND role = 'student' AND archived = false`, [id]);
    if (!student || student.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    const allowed =
      ['owner', 'academic_director', 'site_director'].includes(actor.role) ||
      (actor.role === 'tutor' &&
        !!(await one(db, 'SELECT 1 AS x FROM enrollments e JOIN classes c ON c.id = e.class_id WHERE e.student_id = $1 AND c.teacher_id = $2', [id, actor.id])));
    if (!allowed) return reply.code(403).send({ error: 'forbidden' });

    // The old code dies the moment the new one is written.
    const code = await allocateLoginCode(db, 'HV');
    await db.query('UPDATE users SET login_code = $2 WHERE id = $1', [id, code]);
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'student.code_rotated', entity: 'student', entityId: id });
    return { loginCode: code };
  });

  // ---------- Question bank ----------
  app.post('/questions', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (!canAuthorQuestions(actor)) return reply.code(403).send({ error: 'forbidden' });
    const parsed = questionSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input', detail: parsed.error.issues[0]?.message });
    const id = rid('q');
    const q = parsed.data;
    await db.query(
      `INSERT INTO questions (id, org_id, owner_id, type, skill, level, series, unit, prompt, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, actor.orgId, actor.id, q.type, q.skill, q.level ?? null, q.series ?? null, q.unit ?? null, q.prompt, JSON.stringify(q.payload)],
    );
    return { id, copyrightNotice: 'You are responsible for the rights to any material you upload. Do not upload publisher (Oxford/Cambridge/…) audio, images, or texts.' };
  });

  app.get('/questions', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (!canAuthorQuestions(actor)) return reply.code(403).send({ error: 'forbidden' });
    const { skill, level, type, unit } = req.query as Record<string, string | undefined>;
    return many(
      db,
      `SELECT id, type, skill, level, series, unit, prompt, owner_id AS "ownerId", shared, shared_approved AS "sharedApproved"
         FROM questions
        WHERE org_id = $1 AND (owner_id = $2 OR (shared = true AND shared_approved = true))
          AND ($3::text IS NULL OR skill = $3) AND ($4::text IS NULL OR level = $4)
          AND ($5::text IS NULL OR type = $5) AND ($6::text IS NULL OR unit = $6)
        ORDER BY created_at DESC LIMIT 200`,
      [actor.orgId, actor.id, skill ?? null, level ?? null, type ?? null, unit ?? null],
    );
  });

  // ---------- Assignments ----------
  app.post('/classes/:id/assignments', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = await requireTeach(req, reply, db, id);
    if (!ctx) return;
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const a = parsed.data;

    // Every question must exist in this org and be usable by this teacher.
    for (const qid of a.questionIds) {
      const q = await one<{ owner_id: string; shared: boolean; shared_approved: boolean }>(
        db,
        'SELECT owner_id, shared, shared_approved FROM questions WHERE id = $1 AND org_id = $2',
        [qid, ctx.actor.orgId],
      );
      if (!q || (q.owner_id !== ctx.actor.id && !(q.shared && q.shared_approved) && ctx.actor.role === 'tutor')) {
        return reply.code(400).send({ error: 'question_not_available', questionId: qid });
      }
    }

    const aid = rid('a');
    await db.query(
      `INSERT INTO assignments (id, org_id, class_id, created_by, title, instructions, due_at, time_limit_min, attempts_allowed, show_results, fixed_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [aid, ctx.actor.orgId, id, ctx.actor.id, a.title, a.instructions, a.dueAt ?? null, a.timeLimitMin ?? null, a.attemptsAllowed, a.showResults, a.fixedOrder],
    );
    for (let i = 0; i < a.questionIds.length; i++) {
      await db.query('INSERT INTO assignment_questions (assignment_id, question_id, position) VALUES ($1, $2, $3)', [aid, a.questionIds[i], i]);
    }
    return { id: aid, status: 'draft' };
  });

  app.post('/assignments/:id/publish', async (req, reply) => {
    const { id } = req.params as { id: string };
    const a = await one<{ id: string; class_id: string; title: string; status: string }>(db, 'SELECT id, class_id, title, status FROM assignments WHERE id = $1', [id]);
    if (!a) return reply.code(404).send({ error: 'not_found' });
    const ctx = await requireTeach(req, reply, db, a.class_id);
    if (!ctx) return;

    await db.query(`UPDATE assignments SET status = 'published', published_at = now() WHERE id = $1`, [id]);
    // Push to every class member + digest line to their guardians.
    const students = await many<{ id: string }>(db, `SELECT student_id AS id FROM enrollments WHERE class_id = $1 AND status = 'active'`, [a.class_id]);
    const now = new Date();
    for (const s of students) {
      await notify(db, { orgId: ctx.actor.orgId, channel: 'push', toUserId: s.id, body: `New assignment: ${a.title}`, at: now });
      const guardians = await many<{ guardian_id: string }>(db, 'SELECT guardian_id FROM guardian_students WHERE student_id = $1', [s.id]);
      for (const g of guardians) {
        await notify(db, { orgId: ctx.actor.orgId, channel: 'push', toUserId: g.guardian_id, body: `${a.title} was assigned to your child's class.`, at: now });
      }
    }
    await audit(db, { orgId: ctx.actor.orgId, actorId: ctx.actor.id, action: 'assignment.published', entity: 'assignment', entityId: id });
    return { ok: true, notified: students.length };
  });

  app.post('/assignments/:id/clone', async (req, reply) => {
    const { id } = req.params as { id: string };
    const a = await one<{ class_id: string }>(db, 'SELECT class_id FROM assignments WHERE id = $1', [id]);
    if (!a) return reply.code(404).send({ error: 'not_found' });
    const ctx = await requireTeach(req, reply, db, a.class_id);
    if (!ctx) return;
    const newId = rid('a');
    await db.query(
      `INSERT INTO assignments (id, org_id, class_id, created_by, title, instructions, due_at, time_limit_min, attempts_allowed, show_results, fixed_order, status)
       SELECT $2, org_id, class_id, $3, title || ' (copy)', instructions, NULL, time_limit_min, attempts_allowed, show_results, fixed_order, 'draft' FROM assignments WHERE id = $1`,
      [id, newId, ctx.actor.id],
    );
    await db.query('INSERT INTO assignment_questions (assignment_id, question_id, position, points) SELECT $2, question_id, position, points FROM assignment_questions WHERE assignment_id = $1', [id, newId]);
    return { id: newId, status: 'draft' };
  });

  app.get('/classes/:id/assignments', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const cls = await getClass(db, id);
    if (!cls || cls.orgId !== actor.orgId) return reply.code(404).send({ error: 'not_found' });

    if (canTeachClass(actor, cls)) {
      // Teachers see live results per assignment: how many handed in, and
      // the running average — enough to spot a struggling class at a glance.
      return many(
        db,
        `SELECT a.id, a.title, a.status, a.due_at AS "dueAt", a.show_results AS "showResults",
                (SELECT COUNT(*)::int FROM submissions s WHERE s.assignment_id = a.id AND s.status IN ('submitted', 'graded')) AS "submittedCount",
                (SELECT COUNT(*)::int FROM enrollments e WHERE e.class_id = a.class_id) AS "rosterCount",
                (SELECT ROUND(AVG(s.overall))::int FROM submissions s WHERE s.assignment_id = a.id AND s.overall IS NOT NULL) AS "avgOverall"
           FROM assignments a WHERE a.class_id = $1 ORDER BY a.created_at DESC`,
        [id],
      );
    }
    if (actor.role === 'student' && (await isEnrolled(db, id, actor.id))) {
      return many(
        db,
        `SELECT a.id, a.title, a.instructions, a.due_at AS "dueAt", a.attempts_allowed AS "attemptsAllowed",
                (SELECT s.status FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = $2 ORDER BY s.attempt DESC LIMIT 1) AS "myStatus"
           FROM assignments a WHERE a.class_id = $1 AND a.status IN ('published', 'locked') ORDER BY a.due_at NULLS LAST`,
        [id, actor.id],
      );
    }
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'access.denied', entity: 'class', entityId: id });
    return reply.code(403).send({ error: 'forbidden' });
  });

  app.get('/assignments/:id', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const a = await one<{ id: string; org_id: string; class_id: string; title: string; instructions: string; status: string; fixed_order: boolean; due_at: string | null; show_results: string }>(
      db,
      'SELECT id, org_id, class_id, title, instructions, status, fixed_order, due_at, show_results FROM assignments WHERE id = $1',
      [id],
    );
    if (!a || a.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    const cls = (await getClass(db, a.class_id))!;

    if (canTeachClass(actor, cls)) {
      const qs = await assignmentQuestions(db, id);
      return { ...a, questions: qs };
    }
    // Part C hard scoping: a Class A assignment is invisible to everyone
    // outside Class A — enforced here, not in the UI.
    if (actor.role === 'student' && a.status !== 'draft' && (await isEnrolled(db, a.class_id, actor.id))) {
      const qs = await assignmentQuestions(db, id);
      return {
        id: a.id, title: a.title, instructions: a.instructions, dueAt: a.due_at,
        questions: qs.map((q) => serializeForStudent(q, `${id}:${actor.id}`, a.fixed_order)),
      };
    }
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'access.denied', entity: 'assignment', entityId: id });
    return reply.code(403).send({ error: 'forbidden' });
  });

  app.get('/assignments/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    const a = await one<{ class_id: string }>(db, 'SELECT class_id FROM assignments WHERE id = $1', [id]);
    if (!a) return reply.code(404).send({ error: 'not_found' });
    const ctx = await requireTeach(req, reply, db, a.class_id);
    if (!ctx) return;
    return many(
      db,
      `SELECT u.id AS "studentId", u.name,
              COALESCE((SELECT s.status FROM submissions s WHERE s.assignment_id = $1 AND s.student_id = u.id ORDER BY s.attempt DESC LIMIT 1), 'not_started') AS status
         FROM enrollments e JOIN users u ON u.id = e.student_id
        WHERE e.class_id = $2 AND e.status = 'active' ORDER BY u.name`,
      [id, a.class_id],
    );
  });

  // ---------- Submissions ----------
  app.post('/assignments/:id/start', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (actor.role !== 'student') return reply.code(403).send({ error: 'students_only' });
    const { id } = req.params as { id: string };
    const a = await one<{ id: string; org_id: string; class_id: string; status: string; attempts_allowed: number; fixed_order: boolean }>(
      db,
      'SELECT id, org_id, class_id, status, attempts_allowed, fixed_order FROM assignments WHERE id = $1',
      [id],
    );
    if (!a || a.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    if (a.status !== 'published' || !(await isEnrolled(db, a.class_id, actor.id))) {
      await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'access.denied', entity: 'assignment', entityId: id });
      return reply.code(403).send({ error: 'forbidden' });
    }

    const last = await one<{ attempt: number; status: string; id: string }>(
      db,
      'SELECT id, attempt, status FROM submissions WHERE assignment_id = $1 AND student_id = $2 ORDER BY attempt DESC LIMIT 1',
      [id, actor.id],
    );
    if (last?.status === 'in_progress') return { submissionId: last.id, attempt: last.attempt, resumed: true };
    const attempt = (last?.attempt ?? 0) + 1;
    if (attempt > a.attempts_allowed) return reply.code(409).send({ error: 'attempts_exhausted' });

    const sid = rid('sub');
    await db.query(
      'INSERT INTO submissions (id, org_id, assignment_id, student_id, attempt, started_at) VALUES ($1, $2, $3, $4, $5, now())',
      [sid, actor.orgId, id, actor.id, attempt],
    );
    return { submissionId: sid, attempt, resumed: false };
  });

  app.patch('/submissions/:id/answers', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const sub = await one<{ id: string; student_id: string; status: string; answers: Record<string, unknown> }>(
      db,
      'SELECT id, student_id, status, answers FROM submissions WHERE id = $1 AND org_id = $2',
      [id, actor.orgId],
    );
    if (!sub || sub.student_id !== actor.id) return reply.code(404).send({ error: 'not_found' });
    if (sub.status !== 'in_progress') return reply.code(409).send({ error: 'already_submitted' });
    const { answers } = (req.body ?? {}) as { answers?: Record<string, unknown> };
    // Autosave: merge — a dropped connection never loses work.
    await db.query('UPDATE submissions SET answers = $2 WHERE id = $1', [id, JSON.stringify({ ...sub.answers, ...(answers ?? {}) })]);
    return { ok: true };
  });

  app.post('/submissions/:id/submit', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const now = (req.body as { now?: string } | null)?.now ? new Date((req.body as { now: string }).now) : new Date();

    const sub = await one<{ id: string; student_id: string; status: string; answers: Record<string, unknown>; assignment_id: string }>(
      db,
      'SELECT id, student_id, status, answers, assignment_id FROM submissions WHERE id = $1 AND org_id = $2',
      [id, actor.orgId],
    );
    if (!sub || sub.student_id !== actor.id) return reply.code(404).send({ error: 'not_found' });
    if (sub.status !== 'in_progress') return reply.code(409).send({ error: 'already_submitted' });

    const a = await one<{ due_at: string | Date | null; status: string; show_results: string }>(db, 'SELECT due_at, status, show_results FROM assignments WHERE id = $1', [sub.assignment_id]);
    if (a?.status === 'locked') return reply.code(409).send({ error: 'locked' });
    const late = !!(a?.due_at && new Date(a.due_at).getTime() < now.getTime());

    const qs = await assignmentQuestions(db, sub.assignment_id);
    const g = gradeSubmission(qs, sub.answers);
    const status = g.needsReview ? 'submitted' : 'graded';

    await db.query(
      `UPDATE submissions SET status = $2, submitted_at = $3, late = $4, auto_points = $5, auto_possible = $6,
              manual_possible = $7, skill_scores = $8 WHERE id = $1`,
      [id, status, now.toISOString(), late, g.autoPoints, g.autoPossible, g.manualPossible, JSON.stringify(g.skillScores)],
    );
    await recordMastery(db, actor.id, g.skillScores, now);

    if (a?.show_results === 'instant') {
      return { status, late, autoPoints: g.autoPoints, autoPossible: g.autoPossible, pendingReview: g.needsReview, overall: weightedOverall(g.skillScores) };
    }
    return { status, late, pendingReview: g.needsReview, resultsVisible: false };
  });

  // ---------- Grading queue ----------
  app.get('/grading/queue', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (!canAuthorQuestions(actor)) return reply.code(403).send({ error: 'forbidden' });
    const mine = actor.role === 'tutor' ? 'AND c.teacher_id = $2' : 'AND $2 = $2';
    return many(
      db,
      `SELECT s.id, s.student_id AS "studentId", u.name AS "studentName", a.title, s.submitted_at AS "submittedAt",
              (SELECT s.answers->>q.id FROM assignment_questions aq JOIN questions q ON q.id = aq.question_id
                WHERE aq.assignment_id = a.id AND q.type IN ('dictation', 'picture') ORDER BY aq.position LIMIT 1) AS "answerText"
         FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN classes c ON c.id = a.class_id
         JOIN users u ON u.id = s.student_id
        WHERE s.org_id = $1 AND s.status = 'submitted' ${mine}
        ORDER BY s.submitted_at`,
      [actor.orgId, actor.role === 'tutor' ? actor.id : 'x'],
    );
  });

  app.post('/submissions/:id/grade', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const body = z
      .object({
        rubric: z.object({ accuracy: z.number().min(0).max(2), vocabulary: z.number().min(0).max(2), structure: z.number().min(0).max(2) }),
        comment: z.string().max(2000).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });

    const sub = await one<{ id: string; assignment_id: string; student_id: string; status: string; skill_scores: Partial<Record<SkillKey, SkillScore>> | null; auto_points: number; auto_possible: number; manual_possible: number }>(
      db,
      'SELECT id, assignment_id, student_id, status, skill_scores, auto_points, auto_possible, manual_possible FROM submissions WHERE id = $1 AND org_id = $2',
      [id, actor.orgId],
    );
    if (!sub) return reply.code(404).send({ error: 'not_found' });
    const a = await one<{ class_id: string }>(db, 'SELECT class_id FROM assignments WHERE id = $1', [sub.assignment_id]);
    const ctx = await requireTeach(req, reply, db, a!.class_id);
    if (!ctx) return;
    if (sub.status !== 'submitted') return reply.code(409).send({ error: 'not_awaiting_review' });

    // Rubric taps → fraction of the manual points, attributed to each
    // manual question's skill.
    const r = body.data.rubric;
    const fraction = (r.accuracy + r.vocabulary + r.structure) / 6;
    const qs = await assignmentQuestions(db, sub.assignment_id);
    const skillScores = { ...(sub.skill_scores ?? {}) } as Partial<Record<SkillKey, SkillScore>>;
    let manualPoints = 0;
    for (const q of qs.filter((q) => MANUAL_TYPES.includes(q.type))) {
      const earned = Math.round(fraction * q.points * 100) / 100;
      manualPoints += earned;
      const s = (skillScores[q.skill] ??= { earned: 0, possible: 0 });
      s.earned += earned;
      s.possible += q.points;
    }
    await db.query(
      `UPDATE submissions SET status = 'graded', manual_points = $2, rubric = $3, graded_by = $4, graded_at = now(), skill_scores = $5 WHERE id = $1`,
      [id, manualPoints, JSON.stringify({ ...r, comment: body.data.comment ?? '' }), actor.id, JSON.stringify(skillScores)],
    );
    await recordMastery(db, sub.student_id, skillScores, new Date());
    return { ok: true, overall: weightedOverall(skillScores) };
  });

  // ---------- Gradebook ----------
  app.get('/classes/:id/gradebook', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = await requireTeach(req, reply, db, id);
    if (!ctx) return;
    const rows = await many<{ studentId: string; name: string; skill_scores: Partial<Record<SkillKey, SkillScore>> | null }>(
      db,
      `SELECT u.id AS "studentId", u.name, s.skill_scores
         FROM enrollments e
         JOIN users u ON u.id = e.student_id
         LEFT JOIN submissions s ON s.student_id = u.id AND s.status = 'graded'
              AND s.assignment_id IN (SELECT id FROM assignments WHERE class_id = $1)
        WHERE e.class_id = $1 AND e.status = 'active'`,
      [id],
    );
    // Aggregate every graded submission per student, then weight.
    const byStudent = new Map<string, { name: string; agg: Partial<Record<SkillKey, SkillScore>> }>();
    for (const r of rows) {
      const entry = byStudent.get(r.studentId) ?? { name: r.name, agg: {} };
      if (r.skill_scores) {
        for (const [skill, s] of Object.entries(r.skill_scores) as [SkillKey, SkillScore][]) {
          const t = (entry.agg[skill] ??= { earned: 0, possible: 0 });
          t.earned += s.earned;
          t.possible += s.possible;
        }
      }
      byStudent.set(r.studentId, entry);
    }
    return [...byStudent.entries()].map(([studentId, e]) => ({
      studentId,
      name: e.name,
      overall: weightedOverall(e.agg),
      skills: e.agg,
    }));
  });

  // ---------- Session logging (sub-60-seconds: one request) ----------
  app.post('/classes/:id/session-log', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = await requireTeach(req, reply, db, id);
    if (!ctx) return;
    const body = z
      .object({
        date: z.string().date(),
        entries: z.array(
          z.object({
            studentId: z.string(),
            skills: z.array(z.enum(SKILLS)).default([]),
            engagement: z.number().int().min(1).max(5).optional(),
            note: z.string().max(1000).default(''),
            parentNote: z.string().max(500).default(''),
          }),
        ).min(1).max(50),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    for (const e of body.data.entries) {
      if (!(await isEnrolled(db, id, e.studentId))) return reply.code(400).send({ error: 'student_not_in_class', studentId: e.studentId });
      await db.query(
        `INSERT INTO session_logs (id, org_id, class_id, tutor_id, student_id, date, skills, engagement, note, parent_note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [rid('slog'), ctx.actor.orgId, id, ctx.actor.id, e.studentId, body.data.date, JSON.stringify(e.skills), e.engagement ?? null, e.note, e.parentNote],
      );
    }
    return { ok: true, logged: body.data.entries.length };
  });

  // ---------- Mastery + ILP ----------
  app.get('/students/:id/mastery', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const student = await one<{ id: string; orgId: string; siteId: string | null }>(
      db,
      `SELECT id, org_id AS "orgId", site_id AS "siteId" FROM users WHERE id = $1 AND role = 'student'`,
      [id],
    );
    if (!student || student.orgId !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    const isGuardian = actor.role === 'parent' ? !!(await one(db, 'SELECT 1 AS x FROM guardian_students WHERE guardian_id = $1 AND student_id = $2', [actor.id, id])) : undefined;
    const teaches = actor.role === 'tutor' ? !!(await one(db, 'SELECT 1 AS x FROM enrollments e JOIN classes c ON c.id = e.class_id WHERE e.student_id = $1 AND c.teacher_id = $2', [id, actor.id])) : undefined;
    if (!canViewStudent(actor, student, { isGuardian, teachesStudent: teaches })) return reply.code(403).send({ error: 'forbidden' });
    return many(db, 'SELECT skill, score, updated_at AS "updatedAt" FROM mastery WHERE student_id = $1', [id]);
  });

  app.post('/students/:id/ilp', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (!canAuthorQuestions(actor)) return reply.code(403).send({ error: 'forbidden' });
    const { id } = req.params as { id: string };
    const student = await one<{ org_id: string }>(db, `SELECT org_id FROM users WHERE id = $1 AND role = 'student'`, [id]);
    if (!student || student.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    const { goals } = (req.body ?? {}) as { goals?: unknown[] };
    if (!Array.isArray(goals) || goals.length === 0) return reply.code(400).send({ error: 'goals_required' });
    const last = await one<{ version: number }>(db, 'SELECT version FROM ilps WHERE student_id = $1 ORDER BY version DESC LIMIT 1', [id]);
    const version = (last?.version ?? 0) + 1;
    await db.query(`UPDATE ilps SET status = 'superseded' WHERE student_id = $1 AND status = 'active'`, [id]);
    await db.query('INSERT INTO ilps (id, org_id, student_id, version, goals, created_by) VALUES ($1, $2, $3, $4, $5, $6)', [
      rid('ilp'), actor.orgId, id, version, JSON.stringify(goals), actor.id,
    ]);
    return { version };
  });

  app.get('/students/:id/ilp', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const student = await one<{ id: string; orgId: string; siteId: string | null }>(
      db,
      `SELECT id, org_id AS "orgId", site_id AS "siteId" FROM users WHERE id = $1 AND role = 'student'`,
      [id],
    );
    if (!student || student.orgId !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    const isGuardian = actor.role === 'parent' ? !!(await one(db, 'SELECT 1 AS x FROM guardian_students WHERE guardian_id = $1 AND student_id = $2', [actor.id, id])) : undefined;
    const teaches = actor.role === 'tutor' ? !!(await one(db, 'SELECT 1 AS x FROM enrollments e JOIN classes c ON c.id = e.class_id WHERE e.student_id = $1 AND c.teacher_id = $2', [id, actor.id])) : undefined;
    if (!canViewStudent(actor, student, { isGuardian, teachesStudent: teaches })) return reply.code(403).send({ error: 'forbidden' });
    return one(db, `SELECT version, goals, created_at AS "createdAt" FROM ilps WHERE student_id = $1 AND status = 'active'`, [id]);
  });
}
