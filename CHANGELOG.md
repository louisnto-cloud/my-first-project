# CHANGELOG.md

## 10x continuous loop — student feedback, parent tools, teacher ops (9 passes)

- Xem lại bài: students revisit every graded question with their answer,
  right/wrong, and the correct answer (server releases answers only for
  graded work). GET /submissions/:id/review.
- 🔔 In-app notification bell (unread badge + mark-read); demo pushes on
  publish/grade/after-class-note. notifications_outbox.read_at.
- 🏆 Course-completion certificates + 📋 parent report card (Học bạ) —
  both printable.
- 📅 Absence reporting (Báo nghỉ): parent → teacher notification +
  'Học viên sắp nghỉ' list. site-scoped for directors.
- 📋 Teacher roll-call: a dedicated roll_call_present column kept fully
  separate from the life-safety check-in (never satisfies the
  missing-child sweep or resolves escalations), editable, and surfaced
  to the parent attendance strip + report card.
- ⬇ CSV export (roster, gradebook, whole-class parent invites) with
  spreadsheet formula-injection guards client- AND server-side.
- 🔥 Streak-keeper nudge on the student home.
- Adversarial review of the batch found + fixed a child-safety
  conflation and 3 other issues. 169 tests green.

## Improvement loop — review round 3 (money, safety, insights, center area)

Two parallel adversarial reviews; 13 confirmed bugs fixed:

- Safety: /attendance/dismiss and /kiosk/sync now org-gate every student
  (cross-tenant check-out was possible); name-only releases refuse names
  matching a BLOCKED pickup and notify the site director every time.
- Money: refunds bounded by paid-minus-refunded (422 over); partially
  used account credits keep their remainder; referral credit granted at
  most once per lead; assigning a plan replaces the previous active one
  (second plans were silently never billed); billing dates read as text
  so UTC+7 servers don't overcharge proration by a day.
- Insights: recording school grades is staff-only (students/guardians
  could overwrite their own numbers).
- Auth: /auth/login verifies the password against every org's account
  holding that email (a same-email account in another org could lock a
  user out); parent-invite claim rolls back if registration fails.
- Admin: staff/teacher creation validates siteId against the org (no
  seed-site fallback).
- Landing: Enter key honors the button guards; 400 errors show "check
  your input", not "preview only".
- Demo: runtime-created staff accounts genuinely enforce their one-time
  temp password (and rotate it on password change). 160 tests green.


## Five-hour growth loop (passes 4-18)

- Students: badges strip + avatar characters (server-validated safe
  list), class leaderboard by effort points (never grades), ⚡ Vocab
  Sprint review game, 🎯 daily-goal bar (pointsToday in both engines),
  due-date urgency chips with unfinished-first sorting.
- Teachers: 📊 gradebook tab (real @etop/domain 30/30/20/20 weighting),
  per-student assignment status with scores, skill filters in the
  question picker, one-tap assign to parallel sections, 💬 after-class
  notes to parents, 💬 two-way message inbox, weekly-summary approval
  queue live in the demo, friendly empty state for new teachers.
- Parents: Bảng tin announcements, 7-day attendance strip, live NPS
  feedback (once/month) with verbatim comments on the owner dashboard,
  real weekly summaries (approved-only), two-way messaging.
- Owner: center-wide announcements, live today panel (ở lớp / đã về /
  chưa đến), "Phụ huynh nói gì" comment feed.
- Front desk: kiosk quick-filter for large rosters.
- Landing: "Cách hoạt động" 3-step explainer + testimonials.
- Fixed: demo question serialization used internal type names the
  Player can't render (listening/reorder had no controls); demo status
  route missing teacher check.
- Infra: dedicated deploy concurrency group — sibling apps no longer
  cancel E'TOP deploys. Manual refreshed twice. 149 tests green.

## Improvement loop pass 3 — writing & grading close the loop

- FIXED a real demo bug: serialized question types used internal names
  ('fill'/'order'/'listen') the shared Player doesn't render — listening
  and word-order questions showed no answer controls in the live demo.
  Demo now serializes API names (fill_blank/reorder/listen_mc), with a
  regression test.
- Writing questions end-to-end in the demo: teachers compose a "Viết
  đoạn (cô chấm)" prompt with sentence starters; student submissions go
  pendingReview (no instant score) into the teacher's grading queue;
  rubric grading (3 criteria × 0-2) produces the final overall. Seeded a
  waiting submission so the queue is alive on first open.
- Grading queue shows the student's actual writing (API + demo both
  return answerText; UI quotes it while grading).
- 134 tests green.

## Improvement loop pass 2 — teachers see results

- Teacher assignment cards now show live results: submitted count out of
  the roster and the running average (API subqueries + demo parity +
  ClassManager UI). Demo seeds two graded classmates so the story is
  visible on first open.
- Question bank card lists the teacher's questions (skill emoji, prompt,
  unit chip) with expand/collapse — no longer just a count.
- Parent demo feels real: weekly bilingual summary, after-class session
  note from Ms. Ha, and graded scores flow into the daily digest.
- 132 tests green.

## Account lifecycle + manual + kiosk-in-demo pass

- Professional account lifecycle shipped end-to-end (API + tests + demo
  + UI): owner admin panel creates teachers (auto GV codes) and classes
  and reassigns teachers; teachers author bank questions in 4 formats
  and issue single-use PH- parent invites from the roster; parents
  self-register with an invite and land linked to their child; password
  change for email-auth roles.
- Bilingual user manual (`/platform/manual.html`) covering all 5
  channels — student, parent, teacher, owner, front desk — linked from
  the landing page and the in-app header. VI/EN toggle, print-friendly.
- The kiosk is now fully clickable in the browser demo: front-desk demo
  account (letan@etop.vn), live roster with check-in/dismissal states,
  idempotent offline-queue sync, PIN-verified pickup with the
  blocked-person hard stop, and the parent digest reflects check-ins
  live.
- UX: invite codes show in a big tap-to-copy banner; student hero
  greets the child by name; demo quick-login includes front desk.
- 128 → 131 tests green (16 web demo + 115 API).

## Completion pass — closing every deferred portal gap

- D19 closed: the 38-lesson curriculum moved to a shared
  `@etop/curriculum` package (single source for prototype and portal);
  the student portal gains a "Tự luyện / Practice" tab with the full
  lesson player (vocab + audio, grammar, 4 exercise types), sequential
  unlocking driven by server-side practice history
  (`GET /my/practice/lessons`), and points that feed streaks/badges.
- D20 closed: kiosk dismissal now lists the student's verified pickup
  people (`GET /students/:id/pickups`, staff-only, tested) with
  PIN-verified release; blocked people show the hard red banner and a
  refused attempt alerts leadership; the logged-ID-check fallback
  remains offline-safe through the queue.
- Parent portal gains the tuition section: invoices per child with
  status and VietQR transfer payload.
- Owner/Academic-Director dashboard in the portal: revenue, unpaid
  invoices, NPS, stalled students, open escalation banner, and mastery
  velocity per tutor.
- 2 new tests (105 total green).

## Phase 7 — Hardening (at gate)

- Auth brute-force protection: per-IP rate limiting on /auth/* (50/5min,
  configurable), proven by tests (429 after the limit, per-client not
  global) — closes the D25 mitigation.
- Security headers on every response (HSTS, nosniff, frame-deny,
  no-referrer, no-store) + configurable CORS with preflight handling.
- Hosted-database support: db layer now speaks PGlite (dev/test) or
  node-postgres when DATABASE_URL is set; idempotent schema bootstrap on
  both; `/health` checks the database and reports uptime (503 on loss).
- Production logging: structured fastify logs with redaction of
  authorization headers, passwords, PINs, and login codes.
- Load smoke recorded (50 concurrent: health p95 131 ms, authed reads
  p95 201 ms) — see RUNBOOK.md.
- SECURITY.md (posture for a future SOC 2/licensing review), RUNBOOK.md
  (operations, cron schedule, incident quick reference), render.yaml
  (one-click Blueprint: API + Postgres + static portal).
- 5 new tests (103 total green).

## Owner-requested changes (post-Phase-6)

- Code login: students sign in with mã số học viên (HV####) and teachers
  with mã số giáo viên (GV####) — no email or password; codes are
  case-insensitive, rotatable (old code dies instantly), and the login
  endpoint accepts only student/tutor roles. Parents and managers keep
  email+password.
- Roster management: a teacher pastes a name list into their class and
  accounts are created, enrolled, and issued codes automatically;
  teacher-only roster view shows each student's code.
- Class cards everywhere show the homeroom teacher (GV chủ nhiệm) and a
  schedule note (e.g. "Thứ 2 & Thứ 5 · 17:30–19:00").
- New public landing page: E'TOP logo, cartoon playground scene (inline
  SVG), three login tabs (Học viên / Giáo viên / Phụ huynh & QL), center
  phone + both addresses, and expandable About / Jobs / Feedback
  sections. The role portal appears only after login.
- Teacher portal gains class management: per-class roster with codes,
  paste-to-import students, code rotation, and assign-to-class from the
  question bank with one-click publish.
- 8 new tests (96 total green). Class isolation unchanged and still
  enforced server-side for code logins (tested).

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
