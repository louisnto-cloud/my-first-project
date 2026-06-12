# ARCHITECTURE.md — ETOP Platform

## Monorepo layout (Turborepo + npm workspaces)

```
apps/
  web-prototype/   The original demo SPA (Vite + React + localStorage).
                   Stays deployed to GitHub Pages as the demo surface
                   until the new platform reaches parity. Frozen except
                   for critical fixes.
  api/             The real backend. Fastify + PGlite (in-process
                   Postgres) behind a thin query layer; swaps to hosted
                   Postgres without code changes above db.ts.
packages/
  domain/          Shared, dependency-light domain logic used by every
                   client and the server: RBAC roles + policy functions,
                   zod validation schemas, skills taxonomy constants and
                   ETOP skill weights (30/30/20/20).
```

## Tenancy model

`org → site → class` are first-class entities (Part B). ETOP is tenant
`org_etop` with two sites. Every table carrying user or class data has an
`org_id`. Every SQL query in the API filters by the actor's `org_id`;
cross-tenant IDs return 404 (existence is not leaked), same-tenant
unauthorized access returns 403 and is written to the audit log.
`apps/api/src/rls.sql` contains the row-level-security policies applied
when the hosted Postgres is provisioned (see DECISIONS.md D5).

## Authorization

All permission decisions are server-side, expressed as pure policy
functions in `packages/domain/src/rbac.ts` (one source of truth, unit
testable, importable by clients for UI hints — never for enforcement).
Roles follow the Part B list (owner, site_director, academic_director,
tutor, staff, front_desk, parent, student, billing_admin, auditor).

## Auth

Email + password (scrypt via node:crypto, per-user salt, constant-time
compare). Opaque bearer tokens (256-bit random), stored SHA-256-hashed
with a 12-hour TTL. MFA for staff roles is a Phase 7 hardening item.

## Audit log

`audit_log` is append-only: the API exposes no update/delete path, and
hosted Postgres revokes UPDATE/DELETE (rls.sql). Currently records auth
events and access denials; safety and money events get a dedicated
append-only event log in Phase 2.

## Data layer

PGlite (WASM Postgres) for dev and tests — real Postgres semantics, no
system dependencies, in-memory for tests, on-disk for dev
(`ETOP_DATA_DIR`). Production: hosted Postgres; only `db.ts` changes.

## Testing & CI

`npx turbo run build test` typechecks and tests every workspace.
GitHub Actions `ci.yml` runs it on every push/PR; `deploy.yml` runs the
same gate before publishing the prototype to GitHub Pages. The Phase 1
definition-of-done test (cross-class request → 403 + audit entry) lives
in `apps/api/test/api.test.ts`.

## Running locally

```bash
npm install
npx turbo run build test     # everything green
npm run dev:api              # API on :3001 (auto-seeds demo tenant)
npm run dev:proto            # prototype SPA on :5173
```
