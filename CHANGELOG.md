# CHANGELOG.md

## Phase 6 — Outcomes & intelligence (at gate)

- Mastery decay: skills untouched 30+ days drift toward review (×0.9 per
  further 30 idle days); growth endpoint serves history + decay-adjusted
  current mastery with mastered/developing/review labels.
- Mastery history recorded on every update → growth charts and velocity
  analytics.
- School-grade tracking per term with platform-mastery correlation
  (Pearson, paired at recording time) — the renewal-conversation chart.
- Academic quality dashboard (academic director/owner): mastery velocity
  per tutor over 8 weeks, stalled-student flagging (no movement in 21
  days) with an open/resolve intervention workflow that clears the flag.
- NPS pulse surveys (one per parent per term) with promoter/detractor
  summary and comment feed for the owner.
- Referral program: parent codes, tracked lead conversion, automatic
  200,000đ account credit that applies itself to the family's next
  invoice (consumed exactly once, shown as a line item).
- Compliance exports: audit log and safety events as CSV for
  owner/auditor roles — and the export action is itself audited.
- Tutor suggestion endpoint (D14 delivered): ranked by site, level
  experience, and load, with an explained recommendation.
- 13 new tests (88 total green).

## Phase 5 — Money & admissions (shipped)

- Billing engine (deterministic, VND-integer math, fully unit-tested):
  monthly plans with mid-month proration (rounded to 1,000đ), sibling +
  scholarship discounts (summed, capped at 100%), idempotent invoice
  runs per (student, period).
- Late-pickup fees flow straight from attendance: 15-minute grace, then
  20,000đ per started 15-minute block, accrued per day and swept into
  the next invoice; double-billing impossible by construction.
- Payments (VietQR/bank/cash) with partial-payment support; invoices
  auto-close when fully paid; parent portal endpoint serves invoices
  with a VietQR payload (mock format until real bank details — D23).
- Dunning: overdue marking + guardian SMS reminders repeating every
  3 days, never spamming inside the window.
- Refunds with a mandatory approval workflow: requested (billing admin)
  → approved (owner only) → processed; skipping approval is rejected;
  every step audited.
- Finance dashboard: revenue by period, AR aging buckets.
- Admissions pipeline (inquiry → tour → assessment → offered → enrolled
  / waitlist / lost) with nurture touchpoints and audit trail.
- Enrollment packets with versioning and typed-name e-signature,
  guardian-scoped.
- 15 new tests (75 total green).

## Phase 4 — Parent & student experience (shipped)

- New portal app (`apps/web`) on the real API, role-routed: student,
  parent, teacher, and kiosk views, bilingual VI/EN.
- Student portal: achievements bar (server-computed points/streak/badges
  from practice events), class list, join-by-code, and the assignment
  player implementing all 8 Part C question types with continuous
  autosave, audio with replay limits, and instant/after-review results.
- Parent portal: child switcher, live daily digest (check-in status,
  tutor parent-notes, new assignments, grades, practice), approved
  weekly summaries, and two-way messaging with the class teacher.
- Teacher portal: grading queue with 3-tap rubric + comment, weekly
  summary approval queue.
- Offline-first kiosk screen (per D11): big-touch-target roster,
  optimistic check-in/dismissal, localStorage event queue with
  client-generated IDs, auto-sync via /kiosk/sync on reconnect,
  open-escalation banner.
- Backend: practice events + achievements, parent daily digest, weekly
  summary generation (plain-language VI+EN from structured session data)
  with tutor one-tap approval and guardian notification, messaging
  threads with director read-only oversight.
- 12 new tests (60 total green).

## Phase 3 — Learning engine + Part C module (shipped)

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
