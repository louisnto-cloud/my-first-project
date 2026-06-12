# RUNBOOK.md — operating the ETOP platform

## Local development

```bash
npm install
npx turbo run build test     # full gate: typecheck + 103 tests + smoke
npm run dev:api              # API :3001 — seeds the REAL E'TOP tenant
npm run dev --workspace apps/web   # portal :5173 (proxies /api)
```

Logins (dev seed): teachers GV0001–GV0006, students UP1482… (see seed-real.ts),
owner zhao@etop.vn / etop123.

## Deploying to Render (the owner creates the account; then ~10 minutes)

1. render.com → New → **Blueprint** → connect the GitHub repo. Render
   reads `render.yaml` and proposes two services + a Postgres database.
2. Accept. Wait for the first deploy (~5 min).
3. The API seeds itself on first boot against the hosted Postgres.
4. Set the portal's `VITE_API_URL` to the API service URL (render.yaml
   wires this) and `ETOP_WEB_ORIGIN` on the API to the portal URL.
5. Apply `apps/api/src/rls.sql` to the database (psql shell in Render)
   and create the `app_user` role per that file's comments.
6. Smoke test: open the portal URL → log in with GV0001 → see classes.

## Health & observability
- `GET /health` → `{ok, db, uptimeSec}`; 503 when the DB is unreachable.
  Point Render's health check (and any uptime monitor) at it.
- Structured request logs with sensitive-field redaction are on in
  production (`logger: true`).
- Escalation engine: schedule `POST /safety/sweep` per site every minute
  (Render cron job or external cron hitting the endpoint with a
  director token). If sweeps stop running, missing-child alerts stop —
  treat a silent sweep log as a page-someone incident.
- Billing: `POST /billing/run` monthly, `POST /billing/late-fees/run`
  nightly, `POST /billing/dunning/run` daily (cron, billing-admin token).

## Backups & restore
- Hosted Postgres: enable Render's daily snapshots; restore via Render
  dashboard (point-in-time within retention).
- Compliance exports anytime: `GET /export/audit.csv`,
  `GET /export/safety-events.csv` (owner/auditor token).

## Load characteristics (measured in dev, PGlite, single node)
- `GET /health`: p50 72 ms, p95 131 ms @ 50 concurrent.
- `GET /classes` (authed): p50 170 ms, p95 201 ms @ 50 concurrent.
- Comfortable for a 200-student center; revisit before multi-tenant sale.

## Incident quick reference
- Suspected leaked student code → teacher rotates it in the portal
  (roster → ↻), old code dies instantly.
- Blocked-pickup attempt → automatic alert to owner + site director;
  the event is in safety_events; never release the child.
- Wrong grade/payment entered → corrections are new entries; the audit
  log keeps the full history (append-only by design).
