# CHANGELOG.md

## Phase 3 — Learning engine + Part C module (at gate)

- Skills taxonomy knowledge graph: subject → strand → skill with
  prerequisite edges; seeded 16 skills across 4 CEFR levels.
- Class join codes (child-friendly BEAR42 style): teacher rotates anytime
  (old code dies instantly), student joins once, teacher approves before
  enrollment; codes are case-insensitive and tenant-scoped.
- Question bank: all 8 Part C question types (MC single/multi,
  fill-blank, fill-gaps with word bank, sentence reordering, listening MC
  with replay limit, dictation, picture description with sentence
  starters); skill-tagged (exactly one of G/R/L/W); CEFR + coursebook
  series/unit metadata; share-to-school flow with approval; copyright
  responsibility notice returned on every upload.
- Assignment lifecycle: draft → publish (push to every member + guardian
  digest line) → lock; due dates, attempt limits, time limits,
  instant-vs-after-review results; one-tap clone.
- Variation engine: deterministic per-student shuffle of question and
  option order (two students never see identical papers unless the
  teacher chooses fixed mode); correct answers never serialized to
  students (tested on the wire).
- Student flow: start (membership enforced server-side), continuous
  autosave (dropped connection loses nothing), submit with autograding
  of closed types, late flagged but allowed, ETOP-weighted overall
  (G30/L30/R20/W20, renormalized over skills present).
- Teacher grading queue with rubric taps (accuracy/vocabulary/structure)
  + comment; per-class gradebook with weighted overall and per-skill
  breakdown; sub-60-second whole-class session logging in one request.
- Mastery model (EMA per broad skill) updated from every submission and
  grade; versioned ILPs (parents read, never write).
- Part C definition-of-done e2e: a Class B student receives nothing and
  is rejected by the API on direct ID access — and the denial is audited.
- 19 new tests (48 total green).

## Phase 2 — Safety core (shipped)

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
