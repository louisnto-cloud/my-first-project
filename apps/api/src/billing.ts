import { SAFETY_DEFAULTS } from '@etop/domain';
import { type DB, many, one } from './db.js';
import { notify } from './notify.js';
import { rid } from './learning.js';

// Money math. Deterministic (time always passed in), VND integers only,
// every function covered by tests before it ships — protocol rule.

export const LATE_FEE_PER_BLOCK_VND = 20_000; // per started 15-minute block
export const LATE_FEE_BLOCK_MIN = 15;
export const DUNNING_REPEAT_DAYS = 3;

const daysInMonth = (period: string): number => {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

/** Round to whole 1,000 VND, the smallest practical denomination. */
export const roundVnd = (n: number): number => Math.round(n / 1000) * 1000;

export interface PlanCharge {
  label: string;
  amountVnd: number;
}

/**
 * Monthly charge for a student plan within a billing period:
 * prorated by remaining days if the plan starts mid-month, then
 * sibling + scholarship percentage discounts (summed, capped at 100).
 */
export function planCharge(p: {
  priceVnd: number;
  period: string; // YYYY-MM
  startedOn: string; // YYYY-MM-DD
  siblingPct: number;
  scholarshipPct: number;
}): { lines: PlanCharge[]; subtotal: number; discount: number; total: number } {
  const dim = daysInMonth(p.period);
  const startsThisMonth = p.startedOn.slice(0, 7) === p.period;
  const startDay = startsThisMonth ? Number(p.startedOn.slice(8, 10)) : 1;
  const activeDays = dim - startDay + 1;
  const base = startsThisMonth && startDay > 1 ? roundVnd((p.priceVnd * activeDays) / dim) : p.priceVnd;

  const lines: PlanCharge[] = [
    { label: startsThisMonth && startDay > 1 ? `Tuition (prorated ${activeDays}/${dim} days)` : 'Tuition', amountVnd: base },
  ];
  const pct = Math.min(100, p.siblingPct + p.scholarshipPct);
  const discount = roundVnd((base * pct) / 100);
  return { lines, subtotal: base, discount, total: base - discount };
}

/** Late-pickup fee: grace period, then a fee per started block. */
export function lateFee(minutesPastEnd: number): { minutesLate: number; amountVnd: number } {
  const late = minutesPastEnd - SAFETY_DEFAULTS.latePickupGraceMinutes;
  if (late <= 0) return { minutesLate: 0, amountVnd: 0 };
  const blocks = Math.ceil(late / LATE_FEE_BLOCK_MIN);
  return { minutesLate: late, amountVnd: blocks * LATE_FEE_PER_BLOCK_VND };
}

/** Accrue late fees for a date from attendance vs meeting end times. */
export async function runLateFees(db: DB, p: { orgId: string; date: string }): Promise<number> {
  const rows = await many<{ student_id: string; check_out_at: string | Date; ends_at: string | Date }>(
    db,
    `SELECT a.student_id, a.check_out_at, MAX(m.ends_at) AS ends_at
       FROM attendance_records a
       JOIN enrollments e ON e.student_id = a.student_id
       JOIN class_meetings m ON m.class_id = e.class_id AND m.starts_at::date = a.date
      WHERE a.org_id = $1 AND a.date = $2 AND a.check_out_at IS NOT NULL
      GROUP BY a.student_id, a.check_out_at`,
    [p.orgId, p.date],
  );
  let created = 0;
  for (const r of rows) {
    const minutesPast = Math.floor((new Date(r.check_out_at).getTime() - new Date(r.ends_at).getTime()) / 60000);
    const fee = lateFee(minutesPast);
    if (fee.amountVnd <= 0) continue;
    const res = await db.query(
      `INSERT INTO late_fees (id, org_id, student_id, date, minutes_late, amount_vnd)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (student_id, date) DO NOTHING`,
      [rid('fee'), p.orgId, r.student_id, p.date, fee.minutesLate, fee.amountVnd],
    );
    created += res.affectedRows ?? 0;
  }
  return created;
}

/** Generate the month's invoices: plan charges + unbilled late fees. Idempotent per (student, period). */
export async function runBilling(db: DB, p: { orgId: string; period: string; dueOn: string }): Promise<{ created: number }> {
  const plans = await many<{
    id: string; student_id: string; price_vnd: number; started_on: string | Date;
    sibling_discount_pct: number; scholarship_pct: number; plan_name: string;
  }>(
    db,
    `SELECT sp.id, sp.student_id, bp.price_vnd, sp.started_on, sp.sibling_discount_pct, sp.scholarship_pct, bp.name AS plan_name
       FROM student_plans sp JOIN billing_plans bp ON bp.id = sp.plan_id
      WHERE sp.org_id = $1 AND sp.status = 'active'
        AND sp.started_on <= ($2 || '-' || lpad($3::text, 2, '0'))::date
        AND (sp.ended_on IS NULL OR sp.ended_on >= ($2 || '-01')::date)`,
    [p.orgId, p.period, String(daysInMonth(p.period))],
  );

  let created = 0;
  for (const plan of plans) {
    const exists = await one(db, 'SELECT 1 AS x FROM invoices WHERE student_id = $1 AND period = $2', [plan.student_id, p.period]);
    if (exists) continue;

    const startedOn = new Date(plan.started_on).toISOString().slice(0, 10);
    const charge = planCharge({
      priceVnd: Number(plan.price_vnd), period: p.period, startedOn,
      siblingPct: plan.sibling_discount_pct, scholarshipPct: plan.scholarship_pct,
    });

    const fees = await many<{ id: string; amount_vnd: number; date: string | Date; minutes_late: number }>(
      db,
      'SELECT id, amount_vnd, date, minutes_late FROM late_fees WHERE student_id = $1 AND invoice_id IS NULL',
      [plan.student_id],
    );
    const lines = [...charge.lines.map((l) => ({ ...l, label: `${plan.plan_name} — ${l.label}` }))];
    let feeTotal = 0;
    for (const f of fees) {
      lines.push({ label: `Late pickup ${new Date(f.date).toISOString().slice(0, 10)} (${f.minutes_late} min)`, amountVnd: Number(f.amount_vnd) });
      feeTotal += Number(f.amount_vnd);
    }

    // Apply unspent referral/account credits held by the student's guardians.
    let preCredit = charge.total + feeTotal;
    const credits = await many<{ id: string; amount_vnd: number; reason: string }>(
      db,
      `SELECT c.id, c.amount_vnd, c.reason FROM account_credits c
        WHERE c.invoice_id IS NULL AND c.parent_id IN (SELECT guardian_id FROM guardian_students WHERE student_id = $1)
        ORDER BY c.created_at`,
      [plan.student_id],
    );
    let creditApplied = 0;
    const appliedCreditIds: string[] = [];
    for (const c of credits) {
      if (preCredit - creditApplied <= 0) break;
      const usable = Math.min(Number(c.amount_vnd), preCredit - creditApplied);
      creditApplied += usable;
      appliedCreditIds.push(c.id);
      lines.push({ label: `Credit — ${c.reason}`, amountVnd: -usable });
    }

    const id = rid('inv');
    await db.query(
      `INSERT INTO invoices (id, org_id, student_id, period, line_items, subtotal_vnd, discount_vnd, total_vnd, due_on)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, p.orgId, plan.student_id, p.period, JSON.stringify(lines), charge.subtotal + feeTotal, charge.discount + creditApplied, charge.total + feeTotal - creditApplied, p.dueOn],
    );
    for (const f of fees) await db.query('UPDATE late_fees SET invoice_id = $2 WHERE id = $1', [f.id, id]);
    for (const cid of appliedCreditIds) await db.query('UPDATE account_credits SET invoice_id = $2 WHERE id = $1', [cid, id]);

    const guardians = await many<{ guardian_id: string }>(db, 'SELECT guardian_id FROM guardian_students WHERE student_id = $1', [plan.student_id]);
    for (const g of guardians) {
      await notify(db, { orgId: p.orgId, channel: 'push', toUserId: g.guardian_id, body: `Học phí tháng ${p.period} đã sẵn sàng / Tuition invoice for ${p.period} is ready`, at: new Date() });
    }
    created++;
  }
  return { created };
}

/** Dunning: mark overdue, send reminders, repeat every N days until paid. */
export async function runDunning(db: DB, p: { orgId: string; now: Date }): Promise<{ remindersSent: number }> {
  const due = await many<{ id: string; student_id: string; total_vnd: number; reminders: number; last_reminder_at: string | Date | null }>(
    db,
    `SELECT id, student_id, total_vnd, reminders, last_reminder_at FROM invoices
      WHERE org_id = $1 AND status IN ('open', 'overdue') AND due_on < $2::date`,
    [p.orgId, p.now.toISOString().slice(0, 10)],
  );
  let sent = 0;
  for (const inv of due) {
    await db.query(`UPDATE invoices SET status = 'overdue' WHERE id = $1 AND status = 'open'`, [inv.id]);
    const last = inv.last_reminder_at ? new Date(inv.last_reminder_at).getTime() : 0;
    if (p.now.getTime() - last < DUNNING_REPEAT_DAYS * 86400_000) continue;
    const guardians = await many<{ guardian_id: string }>(db, 'SELECT guardian_id FROM guardian_students WHERE student_id = $1', [inv.student_id]);
    for (const g of guardians) {
      await notify(db, {
        orgId: p.orgId, channel: 'sms', toUserId: g.guardian_id,
        body: `Nhắc nhẹ: học phí ${Number(inv.total_vnd).toLocaleString('vi-VN')}đ đã quá hạn. Vui lòng liên hệ E'TOP: 089 949 0222.`,
        at: p.now,
      });
    }
    await db.query('UPDATE invoices SET reminders = reminders + 1, last_reminder_at = $2 WHERE id = $1', [inv.id, p.now.toISOString()]);
    sent++;
  }
  return { remindersSent: sent };
}

/** VietQR payload (mock format until real bank details — DECISIONS.md D23). */
export function vietQrPayload(invoice: { id: string; total_vnd: number }): string {
  return `VIETQR|ETOP|${invoice.id}|${invoice.total_vnd}|HOC PHI ETOP`;
}
