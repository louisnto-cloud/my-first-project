# CHANGELOG.md

## Phase 1 — Foundation (in progress → gate)

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
