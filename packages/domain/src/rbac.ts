// Server-enforced RBAC: every permission decision is made on the server
// using these shared policy functions, and audited. Part B role list.

export const ROLES = [
  'owner',
  'site_director',
  'academic_director',
  'tutor',
  'staff',
  'front_desk',
  'parent',
  'student',
  'billing_admin',
  'auditor',
] as const;

export type Role = (typeof ROLES)[number];

export interface Actor {
  id: string;
  orgId: string;
  role: Role;
  siteId: string | null;
}

export interface ClassRef {
  id: string;
  orgId: string;
  siteId: string;
  teacherId: string | null;
}

/** Roles with org-wide operational visibility. */
const ORG_WIDE: Role[] = ['owner', 'academic_director', 'auditor'];

export function sameTenant(actor: Actor, resource: { orgId: string }): boolean {
  return actor.orgId === resource.orgId;
}

/**
 * Can the actor see a class at all?
 * - owner / academic director / auditor: any class in their org
 * - site director / staff / front desk: classes at their site
 * - tutor: classes they teach
 * - student: classes they are enrolled in (membership checked by caller)
 * - parent: classes their children are enrolled in (membership checked by caller)
 */
export function canViewClass(
  actor: Actor,
  cls: ClassRef,
  membership: { isEnrolled?: boolean; isChildEnrolled?: boolean } = {},
): boolean {
  if (!sameTenant(actor, cls)) return false;
  if (ORG_WIDE.includes(actor.role)) return true;
  switch (actor.role) {
    case 'site_director':
    case 'staff':
    case 'front_desk':
      return actor.siteId === cls.siteId;
    case 'tutor':
      return cls.teacherId === actor.id;
    case 'student':
      return membership.isEnrolled === true;
    case 'parent':
      return membership.isChildEnrolled === true;
    default:
      return false;
  }
}

/**
 * Can the actor see a student's profile?
 * Academic detail visibility is narrower than operational visibility and
 * handled per-field at the API layer; this is the base gate.
 */
export function canViewStudent(
  actor: Actor,
  student: { id: string; orgId: string; siteId: string | null },
  links: { isGuardian?: boolean; teachesStudent?: boolean } = {},
): boolean {
  if (!sameTenant(actor, student)) return false;
  if (ORG_WIDE.includes(actor.role)) return true;
  switch (actor.role) {
    case 'site_director':
    case 'staff':
      return actor.siteId != null && actor.siteId === student.siteId;
    case 'tutor':
      return links.teachesStudent === true;
    case 'parent':
      return links.isGuardian === true;
    case 'student':
      return actor.id === student.id;
    default:
      return false;
  }
}

export function canReadAuditLog(actor: Actor): boolean {
  return actor.role === 'owner' || actor.role === 'auditor';
}

export function isStaffRole(role: Role): boolean {
  return !['parent', 'student'].includes(role);
}
