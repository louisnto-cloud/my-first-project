import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { canReadAuditLog, canViewClass, canViewStudent, loginSchema, type ClassRef } from '@etop/domain';
import { type DB, many, one } from './db.js';
import { actorFromToken, issueToken, verifyPassword, type ActorRow } from './auth.js';
import { audit } from './audit.js';
import { registerSafetyRoutes } from './routes-safety.js';
import { registerLearningRoutes } from './routes-learning.js';
import { registerExperienceRoutes } from './routes-experience.js';
import { registerMoneyRoutes } from './routes-money.js';
import { registerInsightRoutes } from './routes-insights.js';
import { registerAdminRoutes } from './routes-admin.js';

declare module 'fastify' {
  interface FastifyRequest {
    actor: ActorRow | null;
  }
}

interface UserRow {
  id: string;
  org_id: string;
  password_hash: string;
  archived: boolean;
}

async function requireActor(req: FastifyRequest, reply: FastifyReply): Promise<ActorRow | null> {
  if (!req.actor) {
    await reply.code(401).send({ error: 'unauthenticated' });
    return null;
  }
  return req.actor;
}

export interface ServerOptions {
  logger?: boolean;
  /** Auth endpoint rate limit (brute-force protection, D25/D27). */
  authLimit?: { max: number; windowMs: number };
  corsOrigin?: string;
}

export async function buildServer(db: DB, opts: ServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger
      ? { redact: ['req.headers.authorization', '*.password', '*.pin', '*.code'] }
      : false,
  });

  app.decorateRequest('actor', null);

  // Brute-force protection on /auth/*: fixed window per client IP.
  const authLimit = opts.authLimit ?? { max: 50, windowMs: 5 * 60_000 };
  const hits = new Map<string, { count: number; resetAt: number }>();
  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/auth/')) return;
    const now = Date.now();
    const entry = hits.get(req.ip);
    if (!entry || entry.resetAt < now) {
      hits.set(req.ip, { count: 1, resetAt: now + authLimit.windowMs });
      return;
    }
    entry.count++;
    if (entry.count > authLimit.max) {
      await reply.code(429).send({ error: 'too_many_attempts' });
    }
  });

  // Security headers + CORS on every response.
  const corsOrigin = opts.corsOrigin ?? process.env.ETOP_WEB_ORIGIN ?? '*';
  app.addHook('onSend', async (req, reply) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    reply.header('referrer-policy', 'no-referrer');
    reply.header('strict-transport-security', 'max-age=31536000; includeSubDomains');
    reply.header('cache-control', 'no-store');
    reply.header('access-control-allow-origin', corsOrigin);
    reply.header('access-control-allow-headers', 'authorization, content-type');
    reply.header('access-control-allow-methods', 'GET, POST, PATCH, OPTIONS');
  });
  app.options('/*', async (_req, reply) => reply.code(204).send());

  app.addHook('preHandler', async (req) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      req.actor = await actorFromToken(db, header.slice(7));
    }
  });

  app.get('/health', async (_req, reply) => {
    const dbOk = await db.ping();
    if (!dbOk) return reply.code(503).send({ ok: false, db: false });
    return { ok: true, db: true, uptimeSec: Math.round(process.uptime()) };
  });

  registerSafetyRoutes(app, db);
  registerLearningRoutes(app, db);
  registerExperienceRoutes(app, db);
  registerMoneyRoutes(app, db);
  registerInsightRoutes(app, db);
  registerAdminRoutes(app, db);

  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { email, password } = parsed.data;

    const user = await one<UserRow & { role: string; name: string }>(
      db,
      'SELECT id, org_id, role, name, password_hash, archived FROM users WHERE email = $1 AND archived = false',
      [email.toLowerCase()],
    );
    if (!user || !verifyPassword(password, user.password_hash)) {
      await audit(db, { orgId: user?.org_id, action: 'auth.login_failed', detail: { email } });
      return reply.code(401).send({ error: 'invalid_credentials' });
    }
    const token = await issueToken(db, user.id);
    await audit(db, { orgId: user.org_id, actorId: user.id, action: 'auth.login' });
    return { token, user: { id: user.id, name: user.name, role: user.role } };
  });

  // Code login (mã số học viên / mã số giáo viên): no email, no password.
  // Students and teachers only; codes are rotatable. Parents and managers
  // keep email+password.
  app.post('/auth/login-code', async (req, reply) => {
    const { code } = (req.body ?? {}) as { code?: string };
    const clean = code?.trim().toUpperCase();
    if (!clean || clean.length < 4 || clean.length > 20) return reply.code(400).send({ error: 'invalid_input' });

    const user = await one<{ id: string; org_id: string; name: string; role: string }>(
      db,
      `SELECT id, org_id, name, role FROM users WHERE login_code = $1 AND role IN ('student', 'tutor') AND archived = false`,
      [clean],
    );
    if (!user) {
      await audit(db, { action: 'auth.login_failed', detail: { method: 'login_code' } });
      return reply.code(401).send({ error: 'invalid_code' });
    }
    const token = await issueToken(db, user.id);
    await audit(db, { orgId: user.org_id, actorId: user.id, action: 'auth.login', detail: { method: 'login_code' } });
    return { token, user: { id: user.id, name: user.name, role: user.role } };
  });

  app.get('/me', async (req, reply) => {
    const actor = await requireActor(req, reply);
    if (!actor) return;
    const extra = await one<{ avatar: string | null }>(db, 'SELECT avatar FROM users WHERE id = $1', [actor.id]);
    return { id: actor.id, name: actor.name, role: actor.role, orgId: actor.orgId, siteId: actor.siteId, locale: actor.locale, avatar: extra?.avatar ?? null };
  });

  app.get('/classes', async (req, reply) => {
    const actor = await requireActor(req, reply);
    if (!actor) return;
    // Scoped listing: queries are tenant-filtered at the SQL level. Every
    // class card shows its homeroom teacher (GV chủ nhiệm) and schedule.
    const SELECT = `SELECT c.id, c.name, c.level, c.site_id AS "siteId", c.teacher_id AS "teacherId",
                           t.name AS "teacherName", c.schedule_note AS "scheduleNote"
                      FROM classes c LEFT JOIN users t ON t.id = c.teacher_id`;
    switch (actor.role) {
      case 'owner':
      case 'academic_director':
      case 'auditor':
        return many(db, `${SELECT} WHERE c.org_id = $1 ORDER BY c.name`, [actor.orgId]);
      case 'site_director':
      case 'staff':
      case 'front_desk':
        return many(db, `${SELECT} WHERE c.org_id = $1 AND c.site_id = $2 ORDER BY c.name`, [actor.orgId, actor.siteId]);
      case 'tutor':
        return many(db, `${SELECT} WHERE c.org_id = $1 AND c.teacher_id = $2 ORDER BY c.name`, [actor.orgId, actor.id]);
      case 'student':
        return many(
          db,
          `${SELECT} JOIN enrollments e ON e.class_id = c.id
            WHERE c.org_id = $1 AND e.student_id = $2 ORDER BY c.name`,
          [actor.orgId, actor.id],
        );
      case 'parent':
        return many(
          db,
          `SELECT DISTINCT c.id, c.name, c.level, c.site_id AS "siteId", c.teacher_id AS "teacherId",
                  t.name AS "teacherName", c.schedule_note AS "scheduleNote"
             FROM classes c LEFT JOIN users t ON t.id = c.teacher_id
             JOIN enrollments e ON e.class_id = c.id
             JOIN guardian_students g ON g.student_id = e.student_id
            WHERE c.org_id = $1 AND g.guardian_id = $2 ORDER BY c.name`,
          [actor.orgId, actor.id],
        );
      default:
        return [];
    }
  });

  app.get('/classes/:id', async (req, reply) => {
    const actor = await requireActor(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };

    const cls = await one<ClassRef & { name: string; level: string }>(
      db,
      'SELECT id, org_id AS "orgId", site_id AS "siteId", teacher_id AS "teacherId", name, level FROM classes WHERE id = $1',
      [id],
    );
    // Cross-tenant or unknown ids 404 to avoid leaking existence.
    if (!cls || cls.orgId !== actor.orgId) return reply.code(404).send({ error: 'not_found' });

    const isEnrolled =
      actor.role === 'student'
        ? !!(await one(db, 'SELECT 1 AS x FROM enrollments WHERE class_id = $1 AND student_id = $2', [id, actor.id]))
        : undefined;
    const isChildEnrolled =
      actor.role === 'parent'
        ? !!(await one(
            db,
            `SELECT 1 AS x FROM enrollments e JOIN guardian_students g ON g.student_id = e.student_id
              WHERE e.class_id = $1 AND g.guardian_id = $2`,
            [id, actor.id],
          ))
        : undefined;

    if (!canViewClass(actor, cls, { isEnrolled, isChildEnrolled })) {
      await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'access.denied', entity: 'class', entityId: id });
      return reply.code(403).send({ error: 'forbidden' });
    }

    // Teaching/managing roles also see each student's login code so they
    // can hand codes out; students and parents never see others' codes.
    const showCodes = ['owner', 'academic_director', 'site_director'].includes(actor.role) || (actor.role === 'tutor' && cls.teacherId === actor.id);
    const roster = await many(
      db,
      `SELECT u.id, u.name${showCodes ? ', u.login_code AS "loginCode"' : ''}
         FROM users u JOIN enrollments e ON e.student_id = u.id
        WHERE e.class_id = $1 AND u.archived = false ORDER BY u.name`,
      [id],
    );
    return { ...cls, roster };
  });

  app.get('/students/:id', async (req, reply) => {
    const actor = await requireActor(req, reply);
    if (!actor) return;
    const { id } = req.params as { id: string };

    const student = await one<{ id: string; orgId: string; siteId: string | null; name: string; locale: string }>(
      db,
      `SELECT id, org_id AS "orgId", site_id AS "siteId", name, locale FROM users WHERE id = $1 AND role = 'student' AND archived = false`,
      [id],
    );
    if (!student || student.orgId !== actor.orgId) return reply.code(404).send({ error: 'not_found' });

    const isGuardian =
      actor.role === 'parent'
        ? !!(await one(db, 'SELECT 1 AS x FROM guardian_students WHERE guardian_id = $1 AND student_id = $2', [actor.id, id]))
        : undefined;
    const teachesStudent =
      actor.role === 'tutor'
        ? !!(await one(
            db,
            `SELECT 1 AS x FROM enrollments e JOIN classes c ON c.id = e.class_id
              WHERE e.student_id = $1 AND c.teacher_id = $2`,
            [id, actor.id],
          ))
        : undefined;

    if (!canViewStudent(actor, student, { isGuardian, teachesStudent })) {
      await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'access.denied', entity: 'student', entityId: id });
      return reply.code(403).send({ error: 'forbidden' });
    }
    return student;
  });

  app.get('/audit', async (req, reply) => {
    const actor = await requireActor(req, reply);
    if (!actor) return;
    if (!canReadAuditLog(actor)) {
      await audit(db, { orgId: actor.orgId, actorId: actor.id, action: 'access.denied', entity: 'audit_log' });
      return reply.code(403).send({ error: 'forbidden' });
    }
    return many(
      db,
      `SELECT id, actor_id AS "actorId", action, entity, entity_id AS "entityId", detail, created_at AS "createdAt"
         FROM audit_log WHERE org_id = $1 ORDER BY id DESC LIMIT 200`,
      [actor.orgId],
    );
  });

  return app;
}
