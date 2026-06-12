# CHANGELOG.md

## Phase 2 — Safety core (at gate)

- Attendance reconciliation: concrete class meetings as the expected
  roster; live today-view per site (expected / present / released).
- Check-in and verified dismissal: pickup people with photo slot + scrypt
  PIN, released-by/released-to recorded to the second; wrong PIN rejected
  and logged; blocked pickup person → hard refusal + instant leadership
  alerts + safety event (child is never released).
- Missing-child escalation engine: expected-but-absent after 15 min opens
  an escalation → staff alert → guardian call+SMS cascade in contact
  order (one guardian per 10-min interval) → director alert; every step
  timestamped; check-in resolves instantly; manual resolve with reason.
- Offline kiosk sync protocol: client-generated event IDs, batch replay
  applied idempotently in time order; duplicate and re-replayed batches
  are no-ops (proven by tests).
- Ratio dashboard (present per running meeting vs limit) and emergency
  mode (one-tap live evacuation roster with last-known room + guardian
  quick-dial, start/end events logged).
- Append-only `safety_events` log — the audit/analytics source of truth
  for every safety action, separate from operational tables.
- Notifications outbox with mock provider (Twilio/Zalo swap-in later).
- 14 new end-to-end tests of the safety state machine (29 total green).
- Cut from this phase, logged: kiosk UI screen (engine + sync protocol
  complete; screen ships with the portals in Phase 4 — DECISIONS.md D11).

## Phase 1 — Foundation (shipped)

- Restructured into a Turborepo monorepo: `apps/web-prototype` (the
  original demo SPA, moved intact and still deployed), `apps/api`,
  `packages/domain`.
- New backend: Fastify + PGlite (in-process Postgres), multi-tenant
  schema (org → site → class), seeded demo tenant (E'TOP, 2 sites,
  6 classes, 40 students, staff across 5 roles).
- Real auth: scrypt-hashed passwords, hashed opaque bearer tokens with
  TTL. No plaintext credentials anywhere (verified by test).
- Server-side RBAC via shared policy functions in `@etop/domain`;
  scoped listings per role; 403 + audit on unauthorized access; 404 on
  cross-tenant IDs.
- Append-only audit log (auth events, access denials) with owner/auditor
  read access.
- 15 API tests including the phase definition-of-done (cross-class 403);
  CI workflow blocks merges on build+test across all workspaces.
- Docs: ARCHITECTURE.md, PLAN.md, DECISIONS.md, this file.

## Pre-Phase-1 (prototype era)

- Bilingual VI/EN demo SPA: student dashboard/grades/schedule/homework,
  38-lesson curriculum with 4 exercise types and audio, gamification,
  teacher gradebook, parent view, feedback, events, PWA install,
  GitHub Pages deployment.
