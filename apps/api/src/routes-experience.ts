import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { canTeachClass, weightedOverall, type ClassRef, type SkillKey, type SkillScore } from '@etop/domain';
import { type DB, many, one } from './db.js';
import type { ActorRow } from './auth.js';
import { notify } from './notify.js';
import { rid } from './learning.js';

async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<ActorRow | null> {
  if (!req.actor) {
    await reply.code(401).send({ error: 'unauthenticated' });
    return null;
  }
  return req.actor;
}

async function isGuardianOf(db: DB, guardianId: string, studentId: string): Promise<boolean> {
  return !!(await one(db, 'SELECT 1 AS x FROM guardian_students WHERE guardian_id = $1 AND student_id = $2', [guardianId, studentId]));
}

const dateOf = (d: Date) => d.toISOString().slice(0, 10);

export function registerExperienceRoutes(app: FastifyInstance, db: DB): void {
  // ---------- Practice & achievements (effort-based) ----------
  app.post('/practice/events', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (actor.role !== 'student') return reply.code(403).send({ error: 'students_only' });
    const body = z
      .object({
        kind: z.enum(['lesson', 'vocab', 'quiz', 'homework']),
        points: z.number().int().min(1).max(50),
        detail: z.record(z.unknown()).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    await db.query(
      'INSERT INTO practice_events (id, org_id, student_id, kind, points, detail, occurred_on) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [rid('pe'), actor.orgId, actor.id, body.data.kind, body.data.points, body.data.detail ? JSON.stringify(body.data.detail) : null, dateOf(new Date())],
    );
    return { ok: true };
  });

  app.get('/my/achievements', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    let studentId = actor.id;
    const { childId } = req.query as { childId?: string };
    if (actor.role === 'parent') {
      if (!childId || !(await isGuardianOf(db, actor.id, childId))) return reply.code(403).send({ error: 'forbidden' });
      studentId = childId;
    } else if (actor.role !== 'student') {
      return reply.code(403).send({ error: 'forbidden' });
    }

    const points = await one<{ sum: string | null }>(db, 'SELECT SUM(points)::text AS sum FROM practice_events WHERE student_id = $1', [studentId]);
    const days = await many<{ occurred_on: string | Date }>(db, 'SELECT DISTINCT occurred_on FROM practice_events WHERE student_id = $1 ORDER BY occurred_on DESC', [studentId]);
    const submitted = await one<{ n: string }>(db, `SELECT COUNT(*)::text AS n FROM submissions WHERE student_id = $1 AND status IN ('submitted', 'graded')`, [studentId]);

    // Streak: consecutive days ending today or yesterday.
    const daySet = new Set(days.map((d) => dateOf(new Date(d.occurred_on))));
    let streak = 0;
    const cursor = new Date();
    if (!daySet.has(dateOf(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (daySet.has(dateOf(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const totalPoints = Number(points?.sum ?? 0);
    const submissions = Number(submitted?.n ?? 0);
    const badges = [
      { id: 'first-steps', earned: days.length >= 1 },
      { id: 'streak-3', earned: streak >= 3 },
      { id: 'streak-7', earned: streak >= 7 },
      { id: 'points-50', earned: totalPoints >= 50 },
      { id: 'points-200', earned: totalPoints >= 200 },
      { id: 'homework-hero', earned: submissions >= 5 },
    ];
    return { points: totalPoints, streak, practiceDays: days.length, submissions, badges };
  });

  // Last-7-days attendance for one child ("con đi học đều không?").
  app.get('/parents/attendance-week', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { childId } = req.query as { childId?: string };
    if (actor.role !== 'parent' || !childId || !(await isGuardianOf(db, actor.id, childId))) {
      return reply.code(403).send({ error: 'forbidden' });
    }
    const rows = await many<{ date: string | Date; check_in_at: string | null }>(
      db,
      `SELECT date, check_in_at FROM attendance_records
        WHERE student_id = $1 AND date >= $2 ORDER BY date`,
      [childId, dateOf(new Date(Date.now() - 6 * 86_400_000))],
    );
    const byDay = new Map(rows.map((r) => [dateOf(new Date(r.date)), !!r.check_in_at]));
    return Array.from({ length: 7 }, (_, i) => {
      const d = dateOf(new Date(Date.now() - (6 - i) * 86_400_000));
      return { date: d, attended: byDay.get(d) ?? false };
    });
  });

  // ---------- Avatar (kid-picked character) ----------
  const AVATARS = ['🦊', '🐼', '🐯', '🦄', '🐸', '🐰', '🐙', '🦖', '🐳', '🐝', '🐨', '🦁'];
  app.post('/me/avatar', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { avatar } = (req.body ?? {}) as { avatar?: string };
    if (!avatar || !AVATARS.includes(avatar)) return reply.code(400).send({ error: 'invalid_input' });
    await db.query('UPDATE users SET avatar = $2 WHERE id = $1', [actor.id, avatar]);
    return { ok: true, avatar };
  });

  // ---------- Announcements (Bảng tin) ----------
  // Center-wide posts come from managers; class posts from the class
  // teacher (or managers). Readers see exactly their scope.
  app.post('/announcements', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const body = z.object({ title: z.string().min(2).max(200), body: z.string().max(4000).default(''), classId: z.string().optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });

    const isManager = ['owner', 'academic_director', 'site_director'].includes(actor.role);
    if (body.data.classId) {
      const cls = await one<ClassRef>(db, 'SELECT id, org_id AS "orgId", site_id AS "siteId", teacher_id AS "teacherId" FROM classes WHERE id = $1', [body.data.classId]);
      if (!cls || cls.orgId !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
      if (!isManager && !canTeachClass(actor, cls)) return reply.code(403).send({ error: 'forbidden' });
    } else if (!isManager) {
      return reply.code(403).send({ error: 'forbidden' }); // center-wide is managers-only
    }

    const id = rid('ann');
    await db.query('INSERT INTO announcements (id, org_id, class_id, author_id, title, body) VALUES ($1, $2, $3, $4, $5, $6)', [
      id, actor.orgId, body.data.classId ?? null, actor.id, body.data.title.trim(), body.data.body.trim(),
    ]);
    return { id };
  });

  app.get('/announcements', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const SELECT = `SELECT a.id, a.class_id AS "classId", c.name AS "className", u.name AS "authorName",
                           a.title, a.body, a.created_at AS "createdAt"
                      FROM announcements a LEFT JOIN classes c ON c.id = a.class_id
                      JOIN users u ON u.id = a.author_id`;
    switch (actor.role) {
      case 'student':
        return many(
          db,
          `${SELECT} WHERE a.org_id = $1 AND (a.class_id IS NULL OR a.class_id IN
             (SELECT class_id FROM enrollments WHERE student_id = $2)) ORDER BY a.created_at DESC LIMIT 20`,
          [actor.orgId, actor.id],
        );
      case 'parent':
        return many(
          db,
          `${SELECT} WHERE a.org_id = $1 AND (a.class_id IS NULL OR a.class_id IN
             (SELECT e.class_id FROM enrollments e JOIN guardian_students g ON g.student_id = e.student_id
               WHERE g.guardian_id = $2)) ORDER BY a.created_at DESC LIMIT 20`,
          [actor.orgId, actor.id],
        );
      case 'tutor':
        return many(
          db,
          `${SELECT} WHERE a.org_id = $1 AND (a.class_id IS NULL OR a.class_id IN
             (SELECT id FROM classes WHERE teacher_id = $2)) ORDER BY a.created_at DESC LIMIT 20`,
          [actor.orgId, actor.id],
        );
      default:
        return many(db, `${SELECT} WHERE a.org_id = $1 ORDER BY a.created_at DESC LIMIT 20`, [actor.orgId]);
    }
  });

  // Class leaderboard (Bảng vàng): effort-based ranking by practice
  // points. Visible to the class (students see classmates' first names +
  // points only — no grades, ever) and its teacher/managers.
  app.get('/classes/:id/leaderboard', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const cls = await one<ClassRef>(db, 'SELECT id, org_id AS "orgId", site_id AS "siteId", teacher_id AS "teacherId" FROM classes WHERE id = $1', [id]);
    if (!cls || cls.orgId !== actor.orgId) return reply.code(404).send({ error: 'not_found' });

    const enrolled =
      actor.role === 'student'
        ? !!(await one(db, 'SELECT 1 AS x FROM enrollments WHERE class_id = $1 AND student_id = $2', [id, actor.id]))
        : false;
    const childEnrolled =
      actor.role === 'parent'
        ? !!(await one(
            db,
            `SELECT 1 AS x FROM enrollments e JOIN guardian_students g ON g.student_id = e.student_id
              WHERE e.class_id = $1 AND g.guardian_id = $2`,
            [id, actor.id],
          ))
        : false;
    const staff = ['owner', 'academic_director', 'site_director'].includes(actor.role) || canTeachClass(actor, cls);
    if (!enrolled && !childEnrolled && !staff) return reply.code(403).send({ error: 'forbidden' });

    return many(
      db,
      `SELECT u.id, u.name, u.avatar,
              COALESCE((SELECT SUM(pe.points)::int FROM practice_events pe WHERE pe.student_id = u.id), 0) AS points
         FROM users u JOIN enrollments e ON e.student_id = u.id
        WHERE e.class_id = $1 AND u.archived = false
        ORDER BY points DESC, u.name LIMIT 20`,
      [id],
    );
  });

  /** Lesson ids this student has completed — powers sequential unlocking
   * of the self-study curriculum in the portal. */
  app.get('/my/practice/lessons', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (actor.role !== 'student') return reply.code(403).send({ error: 'students_only' });
    const rows = await many<{ lessonId: string | null; best: number | null }>(
      db,
      `SELECT detail->>'lessonId' AS "lessonId", MAX((detail->>'pct')::real) AS best
         FROM practice_events
        WHERE student_id = $1 AND kind = 'lesson' AND detail->>'lessonId' IS NOT NULL
        GROUP BY detail->>'lessonId'`,
      [actor.id],
    );
    return rows.filter((r) => r.lessonId).map((r) => ({ lessonId: r.lessonId, bestPct: r.best ?? 0 }));
  });

  app.get('/my/notifications', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    return many(
      db,
      `SELECT id, channel, body, created_at AS "createdAt" FROM notifications_outbox
        WHERE org_id = $1 AND to_user_id = $2 ORDER BY created_at DESC LIMIT 50`,
      [actor.orgId, actor.id],
    );
  });

  // ---------- Parent: children, live status, daily digest ----------
  app.get('/parents/children', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (actor.role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    return many(
      db,
      `SELECT u.id, u.name,
              (SELECT json_agg(json_build_object('id', c.id, 'name', c.name))
                 FROM enrollments e JOIN classes c ON c.id = e.class_id
                WHERE e.student_id = u.id AND e.status = 'active') AS classes
         FROM guardian_students g JOIN users u ON u.id = g.student_id
        WHERE g.guardian_id = $1 ORDER BY u.name`,
      [actor.id],
    );
  });

  app.get('/parents/digest', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (actor.role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const { childId, date } = req.query as { childId?: string; date?: string };
    if (!childId || !(await isGuardianOf(db, actor.id, childId))) return reply.code(403).send({ error: 'forbidden' });
    const day = date ?? dateOf(new Date());

    const attendance = await one(
      db,
      `SELECT check_in_at AS "checkInAt", check_out_at AS "checkOutAt", released_to_name AS "releasedTo"
         FROM attendance_records WHERE student_id = $1 AND date = $2`,
      [childId, day],
    );
    const sessions = await many(
      db,
      `SELECT s.skills, s.engagement, s.parent_note AS "parentNote", c.name AS "className", u.name AS "tutorName"
         FROM session_logs s JOIN classes c ON c.id = s.class_id JOIN users u ON u.id = s.tutor_id
        WHERE s.student_id = $1 AND s.date = $2`,
      [childId, day],
    );
    const newAssignments = await many(
      db,
      `SELECT a.id, a.title, a.due_at AS "dueAt" FROM assignments a
        WHERE a.class_id IN (SELECT class_id FROM enrollments WHERE student_id = $1 AND status = 'active')
          AND a.status = 'published' AND a.published_at::date = $2`,
      [childId, day],
    );
    const gradedToday = await many<{ title: string; skill_scores: Partial<Record<SkillKey, SkillScore>> }>(
      db,
      `SELECT a.title, s.skill_scores FROM submissions s JOIN assignments a ON a.id = s.assignment_id
        WHERE s.student_id = $1 AND s.status = 'graded' AND s.graded_at::date = $2`,
      [childId, day],
    );
    const practice = await one<{ sum: string | null; n: string }>(
      db,
      'SELECT SUM(points)::text AS sum, COUNT(*)::text AS n FROM practice_events WHERE student_id = $1 AND occurred_on = $2',
      [childId, day],
    );

    return {
      date: day,
      attendance,
      sessions,
      newAssignments,
      graded: gradedToday.map((g) => ({ title: g.title, overall: weightedOverall(g.skill_scores ?? {}) })),
      practice: { points: Number(practice?.sum ?? 0), activities: Number(practice?.n ?? 0) },
    };
  });

  // ---------- Weekly summaries (generated → tutor approves → parents) ----------
  app.post('/classes/:id/summaries/generate', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const cls = await one<ClassRef & { name: string }>(db, 'SELECT id, org_id AS "orgId", site_id AS "siteId", teacher_id AS "teacherId", name FROM classes WHERE id = $1', [id]);
    if (!cls || cls.orgId !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    if (!canTeachClass(actor, cls)) return reply.code(403).send({ error: 'forbidden' });

    const { weekStart } = (req.body ?? {}) as { weekStart?: string };
    if (!weekStart) return reply.code(400).send({ error: 'weekStart_required' });

    const students = await many<{ id: string; name: string }>(
      db,
      `SELECT u.id, u.name FROM enrollments e JOIN users u ON u.id = e.student_id WHERE e.class_id = $1 AND e.status = 'active'`,
      [id],
    );
    let created = 0;
    for (const st of students) {
      const sessions = await many<{ skills: string[]; engagement: number | null; note: string }>(
        db,
        `SELECT skills, engagement, note FROM session_logs
          WHERE student_id = $1 AND class_id = $2 AND date >= $3::date AND date < $3::date + interval '7 days'`,
        [st.id, id, weekStart],
      );
      if (sessions.length === 0) continue;
      const skills = [...new Set(sessions.flatMap((s) => s.skills))];
      const engagements = sessions.map((s) => s.engagement).filter((e): e is number => e != null);
      const avgEng = engagements.length ? engagements.reduce((a, b) => a + b, 0) / engagements.length : null;
      const firstName = st.name.split(' ').pop();
      const engEn = avgEng == null ? '' : avgEng >= 4 ? ' and was wonderfully engaged' : avgEng >= 3 ? ' and stayed focused' : ' and we are working on focus together';
      const engVi = avgEng == null ? '' : avgEng >= 4 ? ' và tham gia rất tích cực' : avgEng >= 3 ? ' và giữ được sự tập trung' : ' và lớp đang cùng con rèn thêm sự tập trung';
      const skillsEn = skills.length ? ` focusing on ${skills.join(', ')}` : '';
      const skillsVi = skills.length ? `, tập trung vào ${skills.join(', ')}` : '';
      const bodyEn = `This week ${firstName} joined ${sessions.length} session${sessions.length > 1 ? 's' : ''} in ${cls.name}${skillsEn}${engEn}. ${sessions.map((s) => s.note).filter(Boolean).join(' ')}`.trim();
      const bodyVi = `Tuần này ${firstName} tham gia ${sessions.length} buổi học lớp ${cls.name}${skillsVi}${engVi}.`.trim();

      await db.query(
        `INSERT INTO weekly_summaries (id, org_id, student_id, class_id, week_start, body_en, body_vi, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (student_id, class_id, week_start) DO UPDATE SET body_en = $6, body_vi = $7, status = 'draft'`,
        [rid('ws'), actor.orgId, st.id, id, weekStart, bodyEn, bodyVi, actor.id],
      );
      created++;
    }
    return { drafts: created };
  });

  app.get('/summaries/queue', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (!['tutor', 'academic_director', 'owner'].includes(actor.role)) return reply.code(403).send({ error: 'forbidden' });
    const mine = actor.role === 'tutor' ? 'AND c.teacher_id = $2' : 'AND $2 = $2';
    return many(
      db,
      `SELECT w.id, w.student_id AS "studentId", u.name AS "studentName", w.week_start AS "weekStart", w.body_en AS "bodyEn", w.body_vi AS "bodyVi"
         FROM weekly_summaries w JOIN users u ON u.id = w.student_id JOIN classes c ON c.id = w.class_id
        WHERE w.org_id = $1 AND w.status = 'draft' ${mine} ORDER BY w.week_start DESC`,
      [actor.orgId, actor.role === 'tutor' ? actor.id : 'x'],
    );
  });

  app.post('/summaries/:id/approve', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const w = await one<{ id: string; org_id: string; class_id: string; student_id: string; status: string }>(
      db,
      'SELECT id, org_id, class_id, student_id, status FROM weekly_summaries WHERE id = $1',
      [id],
    );
    if (!w || w.org_id !== actor.orgId) return reply.code(404).send({ error: 'not_found' });
    const cls = await one<ClassRef>(db, 'SELECT id, org_id AS "orgId", site_id AS "siteId", teacher_id AS "teacherId" FROM classes WHERE id = $1', [w.class_id]);
    if (!cls || !canTeachClass(actor, cls)) return reply.code(403).send({ error: 'forbidden' });
    if (w.status !== 'draft') return reply.code(409).send({ error: 'already_approved' });

    await db.query(`UPDATE weekly_summaries SET status = 'approved', approved_by = $2, approved_at = now() WHERE id = $1`, [id, actor.id]);
    const guardians = await many<{ guardian_id: string }>(db, 'SELECT guardian_id FROM guardian_students WHERE student_id = $1', [w.student_id]);
    for (const g of guardians) {
      await notify(db, { orgId: actor.orgId, channel: 'push', toUserId: g.guardian_id, body: 'Weekly learning summary is ready 💜', at: new Date() });
    }
    return { ok: true };
  });

  app.get('/parents/summaries', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (actor.role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const { childId } = req.query as { childId?: string };
    if (!childId || !(await isGuardianOf(db, actor.id, childId))) return reply.code(403).send({ error: 'forbidden' });
    return many(
      db,
      `SELECT week_start AS "weekStart", body_en AS "bodyEn", body_vi AS "bodyVi", approved_at AS "approvedAt"
         FROM weekly_summaries WHERE student_id = $1 AND status = 'approved' ORDER BY week_start DESC LIMIT 12`,
      [childId],
    );
  });

  // ---------- Two-way messaging with director oversight ----------
  app.post('/threads', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { studentId } = (req.body ?? {}) as { studentId?: string };
    if (!studentId) return reply.code(400).send({ error: 'studentId_required' });

    let guardianId: string;
    let teacherId: string;
    if (actor.role === 'parent') {
      if (!(await isGuardianOf(db, actor.id, studentId))) return reply.code(403).send({ error: 'forbidden' });
      guardianId = actor.id;
      const cls = await one<{ teacher_id: string }>(
        db,
        `SELECT c.teacher_id FROM enrollments e JOIN classes c ON c.id = e.class_id
          WHERE e.student_id = $1 AND e.status = 'active' AND c.teacher_id IS NOT NULL LIMIT 1`,
        [studentId],
      );
      if (!cls) return reply.code(409).send({ error: 'no_teacher' });
      teacherId = cls.teacher_id;
    } else if (actor.role === 'tutor') {
      const teaches = await one(db, 'SELECT 1 AS x FROM enrollments e JOIN classes c ON c.id = e.class_id WHERE e.student_id = $1 AND c.teacher_id = $2', [studentId, actor.id]);
      if (!teaches) return reply.code(403).send({ error: 'forbidden' });
      teacherId = actor.id;
      const g = await one<{ guardian_id: string }>(db, 'SELECT guardian_id FROM guardian_students WHERE student_id = $1 ORDER BY contact_order LIMIT 1', [studentId]);
      if (!g) return reply.code(409).send({ error: 'no_guardian' });
      guardianId = g.guardian_id;
    } else {
      return reply.code(403).send({ error: 'forbidden' });
    }

    const existing = await one<{ id: string }>(db, 'SELECT id FROM threads WHERE student_id = $1 AND guardian_id = $2 AND teacher_id = $3', [studentId, guardianId, teacherId]);
    if (existing) return { threadId: existing.id, existing: true };
    const id = rid('th');
    await db.query('INSERT INTO threads (id, org_id, student_id, guardian_id, teacher_id) VALUES ($1, $2, $3, $4, $5)', [id, actor.orgId, studentId, guardianId, teacherId]);
    return { threadId: id, existing: false };
  });

  app.get('/threads', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    if (actor.role === 'parent' || actor.role === 'tutor') {
      const col = actor.role === 'parent' ? 'guardian_id' : 'teacher_id';
      return many(
        db,
        `SELECT t.id, t.student_id AS "studentId", su.name AS "studentName", gu.name AS "guardianName", tu.name AS "teacherName"
           FROM threads t JOIN users su ON su.id = t.student_id JOIN users gu ON gu.id = t.guardian_id JOIN users tu ON tu.id = t.teacher_id
          WHERE t.org_id = $1 AND t.${col} = $2 ORDER BY t.created_at DESC`,
        [actor.orgId, actor.id],
      );
    }
    if (['owner', 'site_director', 'academic_director'].includes(actor.role)) {
      // Director oversight: all threads in the org are readable.
      return many(
        db,
        `SELECT t.id, t.student_id AS "studentId", su.name AS "studentName", gu.name AS "guardianName", tu.name AS "teacherName"
           FROM threads t JOIN users su ON su.id = t.student_id JOIN users gu ON gu.id = t.guardian_id JOIN users tu ON tu.id = t.teacher_id
          WHERE t.org_id = $1 ORDER BY t.created_at DESC`,
        [actor.orgId],
      );
    }
    return reply.code(403).send({ error: 'forbidden' });
  });

  async function threadAccess(actor: ActorRow, threadId: string): Promise<'member' | 'oversight' | null> {
    const t = await one<{ org_id: string; guardian_id: string; teacher_id: string }>(db, 'SELECT org_id, guardian_id, teacher_id FROM threads WHERE id = $1', [threadId]);
    if (!t || t.org_id !== actor.orgId) return null;
    if (actor.id === t.guardian_id || actor.id === t.teacher_id) return 'member';
    if (['owner', 'site_director', 'academic_director'].includes(actor.role)) return 'oversight';
    return null;
  }

  app.get('/threads/:id/messages', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const access = await threadAccess(actor, id);
    if (!access) return reply.code(404).send({ error: 'not_found' });
    return many(
      db,
      `SELECT m.id, m.sender_id AS "senderId", u.name AS "senderName", m.body, m.created_at AS "createdAt"
         FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.thread_id = $1 ORDER BY m.created_at`,
      [id],
    );
  });

  app.post('/threads/:id/messages', async (req, reply) => {
    const actor = await requireAuth(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };
    const access = await threadAccess(actor, id);
    if (!access) return reply.code(404).send({ error: 'not_found' });
    if (access !== 'member') return reply.code(403).send({ error: 'read_only_oversight' });
    const { body } = (req.body ?? {}) as { body?: string };
    if (!body?.trim() || body.length > 4000) return reply.code(400).send({ error: 'invalid_body' });

    await db.query('INSERT INTO messages (id, org_id, thread_id, sender_id, body) VALUES ($1, $2, $3, $4, $5)', [rid('msg'), actor.orgId, id, actor.id, body.trim()]);
    const t = (await one<{ guardian_id: string; teacher_id: string }>(db, 'SELECT guardian_id, teacher_id FROM threads WHERE id = $1', [id]))!;
    const other = actor.id === t.guardian_id ? t.teacher_id : t.guardian_id;
    await notify(db, { orgId: actor.orgId, channel: 'push', toUserId: other, body: 'New message 💬', at: new Date() });
    return { ok: true };
  });
}
