import type { DB } from './db.js';

/** Append-only audit writer. There is intentionally no update/delete API. */
export async function audit(
  db: DB,
  entry: {
    orgId?: string | null;
    actorId?: string | null;
    action: string;
    entity?: string;
    entityId?: string;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO audit_log (org_id, actor_id, action, entity, entity_id, detail)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.orgId ?? null,
      entry.actorId ?? null,
      entry.action,
      entry.entity ?? null,
      entry.entityId ?? null,
      entry.detail ? JSON.stringify(entry.detail) : null,
    ],
  );
}
