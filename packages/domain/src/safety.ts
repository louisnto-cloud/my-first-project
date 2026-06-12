import type { Actor } from './rbac';

// Safety configuration defaults (per-org overrides land with org settings).
export const SAFETY_DEFAULTS = {
  /** Minutes after a meeting starts before an expected-but-absent child opens an escalation. */
  missingAfterMinutes: 15,
  /** Minutes between escalation steps (staff → each guardian → director). */
  stepIntervalMinutes: 10,
  /** Students per supervising adult before the ratio dashboard alerts. */
  ratioLimit: 15,
  /** Minutes of grace after class end before late-pickup fees (Phase 5). */
  latePickupGraceMinutes: 15,
} as const;

const ATTENDANCE_ROLES = ['owner', 'site_director', 'staff', 'front_desk', 'tutor'] as const;

/** Who may record check-in/check-out — staff at their own site; org-wide roles anywhere. */
export function canRecordAttendance(actor: Actor, siteId: string): boolean {
  if (actor.role === 'owner') return true;
  if (!(ATTENDANCE_ROLES as readonly string[]).includes(actor.role)) return false;
  return actor.siteId === siteId;
}

/** Who may view safety dashboards, resolve escalations, and run emergency mode. */
export function canManageSafety(actor: Actor, siteId: string): boolean {
  if (actor.role === 'owner') return true;
  return (actor.role === 'site_director' || actor.role === 'staff') && actor.siteId === siteId;
}
