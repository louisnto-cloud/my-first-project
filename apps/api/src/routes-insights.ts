import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { canViewStudent } from '@etop/domain';
import { type DB, many, one } from './db.js';
import type { ActorRow } from './auth.js';
import { audit } from './audit.js';
import { rid } from './learning.js';
import { decayedScore, masteryLabel, pearson, REFERRAL_CREDIT_VND, STALLED_AFTER_DAYS } from './insights.js';

const ACADEMIC = ['owner', 'academic_director'];

async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<ActorRow | null> {
  if (!req.actor) {
    await reply.code(401).send({ error: 'unauthenticated' });
    return null;
  }
  return req.actor;
}

async function requireRoles(req: FastifyRequest, reply: FastifyReply, roles: string[]): Promise<ActorRow | null> {
  const actor = await requireAuth(req, reply);
  if (!actor) return null;
  if (!roles.includes(actor.role)) {
    await reply.code(403).send({ error: 'forbidden' });
    return null;
  }
  return actor;
}

async function studentGate(db: DB, actor: ActorRow, studentId: string): Promise<boolean> {
  const student = await one<{ id: string; orgId: string; siteId: string | null }>(
    db,
    `SELECT id, org_id AS "orgId", site_id AS "siteId" FROM users WHERE id = $1 AND role = 'student'`,
    [studentId],
  );
  if (!student || student.orgId !== actor.orgId) return false;
  const isGuardian = actor.role === 'parent' ? !!(await one(db, 'SELECT 1 AS x FROM guardian_students WHERE guardian_id = $1 AND student_id = $2', [actor.id, studentId])) : undefined;
  const teaches = actor.role === 'tutor' ? !!(await one(db, 'SELECT 1 AS x FROM enrollments e JOIN classes c ON c.id = e.class_id WHERE e.student_id = $1 AND c.teacher_id = $2', [studentId, actor.id])) : undefined;
  return canViewStudent(actor, student, { isGuardian, teachesStudent: teaches });
}

export function registerInsightRoutes(app: FastifyInstance, db: DB): void {
  // ---------- Report card (Học bạ) — a consolidated child summary ----------
  // Guardian/teacher/manager scoped. Everything a printable term card needs.
  app.get('/students/:id/report', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    if (!(await studentGate(db, actor, id))) return reply.code(403).send({ error: 'forbidden' });

    const student = await one<{ name: string; avatar: string | null }>(db, 'SELECT name, avatar FROM users WHERE id = $1', [id]);
    const classes = await many<{ name: string; teacherName: string | null }>(
      db,
      `SELECT c.name, t.name AS "teacherName" FROM enrollments e JOIN classes c ON c.id = e.class_id
         LEFT JOIN users t ON t.id = c.teacher_id WHERE e.student_id = $1 ORDER BY c.name`,
      [id],
    );
    const graded = await many<{ title: string; overall: number | null }>(
      db,
      `SELECT a.title, s.overall FROM submissions s JOIN assignments a ON a.id = s.assignment_id
        WHERE s.student_id = $1 AND s.status = 'graded' ORDER BY s.submitted_at DESC LIMIT 30`,
      [id],
    );
    const scored = graded.filter((g) => g.overall != null);
    const average = scored.length ? Math.round(scored.reduce((t, g) => t + (g.overall ?? 0), 0) / scored.length) : null;
    // Attendance over the last 30 days.
    const att = await one<{ present: string; total: string }>(
      db,
      `SELECT COUNT(*) FILTER (WHERE check_in_at IS NOT NULL)::text AS present, COUNT(*)::text AS total
         FROM attendance_records WHERE student_id = $1 AND date >= CURRENT_DATE - 30`,
      [id],
    );
    const comments = await many<{ note: string; at: string }>(
      db,
      `SELECT parent_note AS note, date::text AS at FROM session_logs
        WHERE student_id = $1 AND parent_note <> '' ORDER BY date DESC LIMIT 5`,
      [id],
    );
    const points = await one<{ sum: string | null }>(db, 'SELECT SUM(points)::text AS sum FROM practice_events WHERE student_id = $1', [id]);
    return {
      studentName: student?.name ?? '',
      avatar: student?.avatar ?? null,
      classes,
      average,
      assignments: graded.map((g) => ({ title: g.title, overall: g.overall == null ? null : Math.round(g.overall) })),
      attendance: { present: Number(att?.present ?? 0), total: Number(att?.total ?? 0) },
      practicePoints: Number(points?.sum ?? 0),
      comments,
    };
  });

  // ---------- Growth & decayed mastery ----------
  app.get('/students/:id/growth', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    if (!(await studentGate(db, actor, id))) return reply.code(403).send({ error: 'forbidden' });

    const now = new Date((req.query as { now?: string }).now ?? Date.now());
    const history = await many<{ skill: string; score: number; recorded_at: string | Date }>(
      db,
      'SELECT skill, score, recorded_at FROM mastery_history WHERE student_id = $1 ORDER BY recorded_at',
      [id],
    );
    const current = await many<{ skill: string; score: number; updated_at: string | Date }>(
      db,
      'SELECT skill, score, updated_at FROM mastery WHERE student_id = $1',
      [id],
    );
    return {
      history: history.map((h) => ({ skill: h.skill, score: h.score, at: new Date(h.recorded_at).toISOString() })),
      current: current.map((c) => {
        const effective = decayedScore(c.score, new Date(c.updated_at), now);
        return { skill: c.skill, raw: c.score, effective: Math.round(effective * 1000) / 1000, label: masteryLabel(effective) };
      }),
    };
  });

  // ---------- School grades & correlation ----------
  app.post('/students/:id/school-grades', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    // Recording grades is staff work — students/guardians read via the
    // correlation endpoint but must never write their own numbers.
    if (!['owner', 'academic_director', 'site_director', 'tutor', 'staff'].includes(actor.role)) {
      return reply.code(403).send({ error: 'forbidden' });
    }
    const { id } = req.params as { id: string };
    if (!(await studentGate(db, actor, id))) return reply.code(403).send({ error: 'forbidden' });
    const body = z.object({ term: z.string().min(3).max(20), subject: z.string().min(2).max(40).default('english'), grade: z.number().min(0).max(10) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    await db.query(
      `INSERT INTO school_grades (id, org_id, student_id, term, subject, grade, recorded_by) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (student_id, term, subject) DO UPDATE SET grade = $6, recorded_by = $7`,
      [rid('sg'), actor.orgId, id, body.data.term, body.data.subject, body.data.grade, actor.id],
    );
    return { ok: true };
  });

  app.get('/students/:id/correlation', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    if (!(await studentGate(db, actor, id))) return reply.code(403).send({ error: 'forbidden' });

    const grades = await many<{ term: string; grade: number; created_at: string | Date }>(
      db,
      `SELECT term, grade, created_at FROM school_grades WHERE student_id = $1 AND subject = 'english' ORDER BY term`,
      [id],
    );
    // Pair each term's school grade with the student's average platform
    // mastery as of when that grade was recorded.
    const pairs = [];
    for (const g of grades) {
      const m = await one<{ avg: number | null }>(
        db,
        'SELECT AVG(score) AS avg FROM mastery_history WHERE student_id = $1 AND recorded_at <= $2',
        [id, new Date(g.created_at).toISOString()],
      );
      if (m?.avg != null) pairs.push({ term: g.term, schoolGrade: g.grade, platformMastery: Math.round(Number(m.avg) * 1000) / 1000 });
    }
    return {
      pairs,
      correlation: pearson(pairs.map((p) => p.platformMastery), pairs.map((p) => p.schoolGrade)),
    };
  });

  // ---------- Academic quality dashboard ----------
  app.get('/academic/dashboard', async (req, reply) => {
    const actor = await requireRoles(req, reply, ACADEMIC);
    if (!actor) return;
    const now = new Date((req.query as { now?: string }).now ?? Date.now());
    const windowStart = new Date(now.getTime() - 56 * 86_400_000); // 8 weeks

    // Mastery velocity per tutor: avg(last - first) across their students.
    const velocity = await many(
      db,
      `WITH spans AS (
         SELECT c.teacher_id, h.student_id,
                (SELECT score FROM mastery_history WHERE student_id = h.student_id AND recorded_at >= $2 ORDER BY recorded_at DESC LIMIT 1)
              - (SELECT score FROM mastery_history WHERE student_id = h.student_id AND recorded_at >= $2 ORDER BY recorded_at ASC LIMIT 1) AS delta
           FROM mastery_history h
           JOIN enrollments e ON e.student_id = h.student_id
           JOIN classes c ON c.id = e.class_id AND c.org_id = $1
          WHERE h.recorded_at >= $2
          GROUP BY c.teacher_id, h.student_id
       )
       SELECT s.teacher_id AS "tutorId", u.name AS "tutorName",
              ROUND(AVG(s.delta)::numeric, 3) AS "avgDelta", COUNT(DISTINCT s.student_id)::int AS students
         FROM spans s JOIN users u ON u.id = s.teacher_id
        GROUP BY s.teacher_id, u.name ORDER BY "avgDelta" DESC`,
      [actor.orgId, windowStart.toISOString()],
    );

    // Stalled: enrolled students with no mastery movement in N days.
    const stalled = await many(
      db,
      `SELECT DISTINCT u.id, u.name,
              (SELECT MAX(recorded_at) FROM mastery_history WHERE student_id = u.id) AS "lastMovement"
         FROM users u JOIN enrollments e ON e.student_id = u.id AND e.status = 'active'
        WHERE u.org_id = $1 AND u.role = 'student' AND u.archived = false
          AND NOT EXISTS (SELECT 1 FROM mastery_history WHERE student_id = u.id AND recorded_at >= $2)
          AND NOT EXISTS (SELECT 1 FROM interventions WHERE student_id = u.id AND status = 'open')
        ORDER BY u.name LIMIT 50`,
      [actor.orgId, new Date(now.getTime() - STALLED_AFTER_DAYS * 86_400_000).toISOString()],
    );

    return { velocity, stalled, windowDays: 56, stalledAfterDays: STALLED_AFTER_DAYS };
  });

  app.post('/students/:id/interventions', async (req, reply) => {
    const actor = await requireRoles(req, reply, [...ACADEMIC, 'tutor', 'site_director']);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const { note } = (req.body ?? {}) as { note?: string };
    if (!note?.trim()) return reply.code(400).send({ error: 'note_required' });
    if (!(await studentGate(db, actor, id))) return reply.code(403).send({ error: 'forbidden' });
    const ivId = rid('iv');
    await db.query('INSERT INTO interventions (id, org_id, student_id, opened_by, note) VALUES ($1, $2, $3, $4, $5)', [ivId, actor.orgId, id, actor.id, note.trim()]);
    return { id: ivId, status: 'open' };
  });

  app.patch('/interventions/:id/resolve', async (req, reply) => {
    const actor = await requireRoles(req, reply, [...ACADEMIC, 'tutor', 'site_director']);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const iv = await one<{ org_id: string; status: string }>(db, 'SELECT org_id, status FROM interventions WHERE id = $1', [id]);
    if (!iv || iv.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    if (iv.status !== 'open') return reply.code(409).send({ error: 'already_resolved' });
    await db.query(`UPDATE interventions SET status = 'resolved', resolved_at = now(), resolved_by = $2 WHERE id = $1`, [id, actor.id]);
    return { ok: true };
  });

  app.get('/interventions', async (req, reply) => {
    const actor = await requireRoles(req, reply, [...ACADEMIC, 'site_director']);
    if (!actor) return;
    return many(
      db,
      `SELECT i.id, i.student_id AS "studentId", u.name AS "studentName", i.note, i.status, i.created_at AS "createdAt"
         FROM interventions i JOIN users u ON u.id = i.student_id WHERE i.org_id = $1 ORDER BY i.created_at DESC`,
      [actor.orgId],
    );
  });

  // ---------- NPS ----------
  app.post('/nps', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (actor.role !== 'parent') return reply.code(403).send({ error: 'parents_only' });
    const body = z.object({ term: z.string().min(3).max(20), score: z.number().int().min(0).max(10), comment: z.string().max(2000).default('') }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const dup = await one(db, 'SELECT 1 AS x FROM nps_responses WHERE user_id = $1 AND term = $2', [actor.id, body.data.term]);
    if (dup) return reply.code(409).send({ error: 'already_responded' });
    await db.query('INSERT INTO nps_responses (id, org_id, user_id, term, score, comment) VALUES ($1, $2, $3, $4, $5, $6)', [
      rid('nps'), actor.orgId, actor.id, body.data.term, body.data.score, body.data.comment,
    ]);
    return { ok: true };
  });

  app.get('/nps/summary', async (req, reply) => {
    const actor = await requireRoles(req, reply, ['owner', 'site_director']);
    if (!actor) return;
    const { term } = req.query as { term?: string };
    const rows = await many<{ score: number; comment: string }>(
      db,
      'SELECT score, comment FROM nps_responses WHERE org_id = $1 AND ($2::text IS NULL OR term = $2)',
      [actor.orgId, term ?? null],
    );
    const n = rows.length;
    const promoters = rows.filter((r) => r.score >= 9).length;
    const detractors = rows.filter((r) => r.score <= 6).length;
    return {
      responses: n,
      nps: n === 0 ? null : Math.round(((promoters - detractors) / n) * 100),
      comments: rows.filter((r) => r.comment).map((r) => r.comment).slice(0, 20),
    };
  });

  // ---------- Referrals ----------
  app.get('/my/referral', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (actor.role !== 'parent') return reply.code(403).send({ error: 'parents_only' });
    const existing = await one<{ code: string }>(db, 'SELECT code FROM referral_codes WHERE parent_id = $1', [actor.id]);
    if (existing) return { code: existing.code, creditVnd: REFERRAL_CREDIT_VND };
    const code = `ETOP-${rid('').slice(1, 7).toUpperCase()}`;
    await db.query('INSERT INTO referral_codes (code, org_id, parent_id) VALUES ($1, $2, $3)', [code, actor.orgId, actor.id]);
    return { code, creditVnd: REFERRAL_CREDIT_VND };
  });

  // ---------- Compliance exports (CSV) ----------
  // Quote every cell and neutralize spreadsheet formula injection: a value
  // starting with = + - @ (or tab/CR) can execute in Excel/Sheets even
  // inside quotes, so a guard apostrophe is prefixed first.
  const csvEscape = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };

  app.get('/export/audit.csv', async (req, reply) => {
    const actor = await requireRoles(req, reply, ['owner', 'auditor']);
    if (!actor) return;
    const rows = await many<Record<string, unknown>>(
      db,
      'SELECT id, actor_id, action, entity, entity_id, created_at FROM audit_log WHERE org_id = $1 ORDER BY id',
      [actor.orgId],
    );
    await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'export.audit_csv', detail: { rows: rows.length } });
    const header = 'id,actor_id,action,entity,entity_id,created_at';
    const body = rows.map((r) => [r.id, r.actor_id, r.action, r.entity, r.entity_id, r.created_at].map(csvEscape).join(',')).join('\n');
    return reply.type('text/csv').send(`${header}\n${body}\n`);
  });

  app.get('/export/safety-events.csv', async (req, reply) => {
    const actor = await requireRoles(req, reply, ['owner', 'auditor']);
    if (!actor) return;
    const rows = await many<Record<string, unknown>>(
      db,
      'SELECT id, site_id, type, student_id, actor_id, occurred_at FROM safety_events WHERE org_id = $1 ORDER BY id',
      [actor.orgId],
    );
    const header = 'id,site_id,type,student_id,actor_id,occurred_at';
    const body = rows.map((r) => [r.id, r.site_id, r.type, r.student_id, r.actor_id, r.occurred_at].map(csvEscape).join(',')).join('\n');
    return reply.type('text/csv').send(`${header}\n${body}\n`);
  });

  // ---------- Tutor suggestion (D14) ----------
  app.get('/tutors/suggest', async (req, reply) => {
    const actor = await requireRoles(req, reply, ACADEMIC);
    if (!actor) return;
    const { siteId, level } = req.query as { siteId?: string; level?: string };
    const rows = await many<Record<string, unknown>>(
      db,
      `SELECT u.id, u.name,
              COUNT(c.id) FILTER (WHERE c.level = $3)::int AS "sameLevelClasses",
              COUNT(c.id)::int AS "totalClasses",
              (u.site_id = $2)::int AS "atSite"
         FROM users u LEFT JOIN classes c ON c.teacher_id = u.id
        WHERE u.org_id = $1 AND u.role = 'tutor' AND u.archived = false
        GROUP BY u.id, u.name, u.site_id
        ORDER BY "atSite" DESC, "sameLevelClasses" DESC, "totalClasses" ASC`,
      [actor.orgId, siteId ?? '', level ?? ''],
    );
    return rows.map((r, i) => ({
      ...r,
      reason: i === 0 ? 'Best match: same site, experience at this level, lightest load' : undefined,
    }));
  });
}
