import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { canReadAuditLog, canViewClass, canViewStudent, loginSchema, type ClassRef } from '@etop/domain';
import { type DB, many, one } from './db.js';
import { actorFromToken, issueToken, verifyPassword, type ActorRow } from './auth.js';
import { audit } from './audit.js';
import { registerSafetyRoutes } from './routes-safety.js';
import { registerLearningRoutes } from './routes-learning.js';

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

export async function buildServer(db: DB): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.decorateRequest('actor', null);

  app.addHook('preHandler', async (req) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      req.actor = await actorFromToken(db, header.slice(7));
    }
  });

  app.get('/health', async () => ({ ok: true }));

  registerSafetyRoutes(app, db);
  registerLearningRoutes(app, db);

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

  app.get('/me', async (req, reply) => {
    const actor = await requireActor(req, reply);
    if (!actor) return;
    return { id: actor.id, name: actor.name, role: actor.role, orgId: actor.orgId, siteId: actor.siteId, locale: actor.locale };
  });

  app.get('/classes', async (req, reply) => {
    const actor = await requireActor(req, reply);
    if (!actor) return;
    // Scoped listing: queries are tenant-filtered at the SQL level.
    switch (actor.role) {
      case 'owner':
      case 'academic_director':
      case 'auditor':
        return many(db, 'SELECT id, name, level, site_id AS "siteId", teacher_id AS "teacherId" FROM classes WHERE org_id = $1 ORDER BY name', [actor.orgId]);
      case 'site_director':
      case 'staff':
      case 'front_desk':
        return many(db, 'SELECT id, name, level, site_id AS "siteId", teacher_id AS "teacherId" FROM classes WHERE org_id = $1 AND site_id = $2 ORDER BY name', [actor.orgId, actor.siteId]);
      case 'tutor':
        return many(db, 'SELECT id, name, level, site_id AS "siteId", teacher_id AS "teacherId" FROM classes WHERE org_id = $1 AND teacher_id = $2 ORDER BY name', [actor.orgId, actor.id]);
      case 'student':
        return many(
          db,
          `SELECT c.id, c.name, c.level, c.site_id AS "siteId", c.teacher_id AS "teacherId"
             FROM classes c JOIN enrollments e ON e.class_id = c.id
            WHERE c.org_id = $1 AND e.student_id = $2 ORDER BY c.name`,
          [actor.orgId, actor.id],
        );
      case 'parent':
        return many(
          db,
          `SELECT DISTINCT c.id, c.name, c.level, c.site_id AS "siteId", c.teacher_id AS "teacherId"
             FROM classes c
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

    const roster = await many(
      db,
      `SELECT u.id, u.name FROM users u JOIN enrollments e ON e.student_id = u.id
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
