# tools/

Browser-level checks against the built demo (`VITE_DEMO=1`):

1. Build: `VITE_DEMO=1 npm run build --workspace apps/web`
2. Serve: `cd apps/web/dist && python3 -m http.server 4173`
3. `node tools/smoke-demo.mjs` — screenshots every role, fails on page errors.
4. `node tools/e2e-demo.mjs` — a student completes the seeded quiz in the
   real UI and the teacher's view must show the updated 3/3 result.

Requires `playwright-core` and a Chromium binary (CI/sandbox:
`executablePath: /opt/pw-browsers/chromium` — adjust locally).
