import { randomBytes } from 'node:crypto';
import type { DB } from './db.js';

// Notification outbox. The mock provider "delivers" instantly so flows and
// tests exercise the full path; swapping in Twilio/Zalo later only changes
// deliver(). If delivery fails in production, observability pages a human
// (Phase 7).

export interface NotifyInput {
  orgId: string;
  channel: 'sms' | 'call' | 'push';
  toUserId?: string | null;
  toContact?: string | null;
  body: string;
  at: Date;
}

export async function notify(db: DB, n: NotifyInput): Promise<string> {
  const id = `n_${randomBytes(8).toString('hex')}`;
  await db.query(
    `INSERT INTO notifications_outbox (id, org_id, channel, to_user_id, to_contact, body, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'queued', $7)`,
    [id, n.orgId, n.channel, n.toUserId ?? null, n.toContact ?? null, n.body, n.at.toISOString()],
  );
  await deliver(db, id, n.at);
  return id;
}

async function deliver(db: DB, id: string, at: Date): Promise<void> {
  // Mock provider: mark sent. Real providers replace this function only.
  await db.query(`UPDATE notifications_outbox SET status = 'sent', sent_at = $2 WHERE id = $1`, [id, at.toISOString()]);
}
