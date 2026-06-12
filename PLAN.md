# PLAN.md — ETOP 10x Improvement Plan (Stage 3, approved path: strategic rebuild)

Maps the existing prototype onto Part B's seven phases + Part C.
Safety core precedes everything cosmetic. Each phase ends at a hard gate.

## Stage 1 audit verdict (summary)

High-quality interactive prototype (~4,500 LOC, TS-strict, zero tests beyond
a seed smoke script). No server, no real auth, client-only RBAC, localStorage
as database. Safety flows: nonexistent — not trustworthy with a real child
today. Salvage = curriculum (38 lessons / ~230 exercises), exercise
renderers, audio engine, brand, seed discipline. Foundation = rebuild.

## Keep / Refactor / Kill

- **Keep (port):** curriculum content, exercise interaction components,
  audio engine (SFX + voice selection), brand assets, smoke-test discipline.
- **Refactor (concept survives):** i18n (→ real library, VI/EN),
  gamification (→ effort/growth model), gradebook/homework/events UX as
  wireframes for server-backed successors.
- **Kill (→ /graveyard on removal):** localStorage store + fake auth,
  client-only RBAC shell, Pages-only deployment (Pages remains demo surface).

## Phases

1. **Foundation** — Turborepo monorepo: `apps/api` (Fastify + Prisma +
   Postgres with row-level security), `apps/web` (role-split portals),
   `packages/domain` (RBAC policies, skills taxonomy, mastery model,
   validation schemas). Real auth (argon2, sessions), org→site→class
   tenancy, append-only event log, audit logging, design system from brand
   tokens, seed v2, CI blocking on tests.
   **DoD:** cross-class resource request by ID → server 403, proven in CI.
2. **Safety core** — attendance reconciliation, verified dismissal
   (photo+PIN, signature), missing-child escalation cascade (timestamped,
   logged), offline kiosk queue + sync, ratio dashboard, emergency mode.
   E2E tests land in this phase.
   **DoD:** full offline check-in→dismissal→escalation cycle replays into a
   complete ordered audit log after reconnect.
3. **Learning engine + Part C** — skills taxonomy/knowledge graph (ETOP
   weights 30/30/20/20), diagnostics, ILPs, session scheduling, sub-60s
   tutor logging; classes with rotatable child-friendly join codes and
   approval flow; assignment lifecycle; question types (port MC/fill/
   reorder/listening renderers; build picture description, dictation, word
   bank); grading queue with rubric taps; question bank + variation engine;
   CEFR/coursebook metadata tagging (no publisher content; copyright notice
   on upload); autosave.
   **DoD:** Part C e2e — Class B student receives nothing, direct API
   request by ID rejected.
4. **Parent & student experience** — live child status, daily digest,
   weekly summaries (tutor one-tap approve), moderated messaging, age-gated
   student portal (stars/stamps for 5–8), homework/practice with
   effort-based achievements; existing curriculum becomes the practice
   portal's seed content.
5. **Money & admissions** — enrollment pipeline, e-sign packets,
   Vietnamese payment rails (VietQR/bank reconciliation; provider behind an
   interface), dunning, late-pickup fees from attendance, finance
   dashboards, CSV import for existing records.
6. **Outcomes & intelligence** — mastery analytics with decay, growth
   reports, school-grade correlation, academic quality dashboards, NPS,
   referrals, compliance exports.
7. **Hardening** — load tests, WCAG 2.2 AA audit, OWASP review,
   observability with paging on alert-pipeline failure, RUNBOOK.md, polish.

## Three highest-leverage improvements

1. Real server with server-enforced scoping (Phase 1) — unblocks everything.
2. Part C assignment module on the existing exercise renderers (Phase 3,
   thin slice first) — the daily teaching workflow, mostly-built UI.
3. Attendance + parent notification thin slice (Phase 2) — the trust feature.

## Standing rules (from Part A)

Gates at every phase end. /graveyard before deletion. Migrations over
destruction. Tests with safety/money features in-phase. ARCHITECTURE.md,
DECISIONS.md, CHANGELOG.md kept current. Part B wins conflicts unless a
deviation is logged in DECISIONS.md. Boring technology. Safety and kiosk
speed beat features.
