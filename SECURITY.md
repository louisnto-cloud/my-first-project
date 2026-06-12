# SECURITY.md — ETOP Platform security posture

Audience: a future SOC 2 / licensing / due-diligence reviewer.

## Authentication
- Staff/parents: email + scrypt-hashed passwords (node:crypto, per-user
  salt, constant-time compare). No plaintext credentials exist anywhere
  (enforced by an automated test).
- Students/teachers: short login codes (HV####/GV####/UP####) — a
  deliberate usability trade-off for a children's center (DECISIONS D25).
  Mitigations: codes grant only student/tutor roles (never parent, money,
  or admin access), instant rotation by the teacher, failed attempts
  audited, and per-IP rate limiting on all /auth/* endpoints
  (50 attempts / 5 min default, configurable).
- Sessions: opaque 256-bit bearer tokens stored SHA-256-hashed, 12 h TTL.
- MFA for staff roles: planned with hosting (needs SMS/TOTP provider).

## Authorization
- Every permission decision is server-side, expressed as pure policy
  functions in `packages/domain` and unit/e2e-tested (103 tests),
  including the Part C isolation guarantee: cross-class access by direct
  ID returns 403 and is audited; cross-tenant returns 404.
- Tenancy: org → site scoping on every query; row-level-security
  policies (`apps/api/src/rls.sql`) ship ready for hosted Postgres.

## Data protection
- Children's data minimization: no third-party analytics, no PII in
  logs (fastify logger redacts authorization headers, passwords, PINs,
  and codes), media URLs not yet in scope.
- Append-only audit log and safety-event log; exports themselves are
  audited; UPDATE/DELETE revoked at the DB layer on hosted Postgres.
- Money: refunds require owner approval before processing; all money
  math is integer VND and unit-tested.

## Transport & headers
- HSTS, nosniff, frame-deny, no-referrer, no-store on every response;
  CORS restricted to the configured web origin (`ETOP_WEB_ORIGIN`).
- TLS terminates at the hosting platform (Render/equivalent).

## Operational controls
- Change management: every change lands via PR with CI that blocks on
  the full test suite (build + 103 tests + content integrity).
- Environment separation: dev (PGlite, seeded), CI (ephemeral),
  production (hosted Postgres via DATABASE_URL).
- Backups & restore: see RUNBOOK.md.

## Known gaps (tracked, intentional)
- RLS not yet active (no hosted PG yet) — D5.
- MFA pending a real SMS/TOTP provider — A10.
- The pg driver path is code-complete but will be exercised against a
  real Postgres only when hosting exists — D26.
- Childcare tax receipts and jurisdiction-specific consent texts await
  the owner's legal confirmation — D23 (legal details are never invented).
