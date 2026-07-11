# MÜV App — Autonomous Improvement Loop

**Started:** 2026-07-11T06:56:41Z · **Deadline:** 2026-07-11T11:56:41Z (5 hours)
**Branch:** claude/clever-ride-xgh441 · **PR:** #14

## Per-iteration procedure (follow every wake-up)
1. `date -u` → if now ≥ deadline OR all items done, `ScheduleWakeup(stop:true)` and post a short wrap-up. Else continue.
2. Pick the next unchecked `[ ]` item (top of the backlog).
3. Implement it in the `build/` generators (never hand-edit the built files).
4. Rebuild: `python3 build/build_excel.py` and/or `build/build_html.py`.
5. Verify: engine parity (node) + UI (jsdom) for HTML changes; `pycel` for Excel changes. The app must stay green.
6. Clean npm artifacts, `git add -A`, commit (clear message), push (with retry).
7. Check the item `[x]`, add a one-line entry to the LOG, then `ScheduleWakeup` ~18 min for the next iteration.

Keep the app ALWAYS WORKING and verified. Additive, low-risk features first; engine-changing
items require full three-way re-verification (Python ↔ Excel ↔ JS to the cent).

## Backlog (priority order)
- [x] D1 · Canada tile-grid map of revenue by province (interactive, hover tooltip)
- [ ] D2 · Share/restore control state via URL hash + "Copy link" button
- [ ] D3 · "Download CSV" (weekly + by-dimension) via data URI
- [ ] D4 · Distribution-build view: active distribution % and active doors by week
- [ ] D5 · Margin view: revenue vs COGS vs margin by channel/SKU
- [ ] D6 · Scenario overlay: Bear/Base/Bull cumulative lines on one chart
- [ ] E1 · Excel Cover/Briefing tab (exec summary + waterfall to $3M)
- [ ] E2 · Excel Monthly P&L table (revenue, COGS, margin, margin%) + chart
- [ ] D7 · Cans / consumer-units as a 3rd explore metric
- [ ] D8 · Print stylesheet (@media print) for a clean one-pager
- [ ] E3 · Excel 2nd sensitivity grid (velocity × online growth)
- [ ] D9 · Accessibility pass (aria roles/labels, focus management)
- [ ] D10 · Always-on "cheapest lever to goal" callout in the hero
- [ ] E4 · Excel distribution-build table (doors ramp by week)
- [ ] Q1 · pytest suite for muv_config + Makefile; wire the node engine test
- [ ] Q2 · GitHub Actions CI workflow to run the tests on push
- [ ] M1 · Trade spend & NET revenue (deduction % by channel) — engine + both UIs, re-verify
- [ ] M2 · Year-2 projection toggle (growth %)
- [ ] D11 · Header polish: sticky, "as of" stamp, subtle logo shimmer
- [ ] Q3 · CHANGELOG.md + README feature expansion
- [ ] M3 · Monte-Carlo confidence band on the cumulative goal (JS)

## Log
- 06:56Z · #1 D1 — Canada tile map (10 provinces, colour=revenue, hover tooltip) + durable build/ui_test.js (16 checks). Green.
